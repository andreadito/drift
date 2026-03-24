import Peer, { type DataConnection } from 'peerjs';

export interface ReportCatalogEntry {
  pkg: string;
  from: string;
  to: string;
  id: string;
}

type PeerMessage =
  | { type: 'hello'; peerId: string; catalog: ReportCatalogEntry[] }
  | { type: 'catalog-update'; entry: ReportCatalogEntry }
  | { type: 'request'; pkg: string; from: string; to: string; requestId: string }
  | { type: 'response'; requestId: string; rawResponse: string; costUsd?: number }
  | { type: 'peer-list'; peers: string[] };

type PeerCountCallback = (count: number) => void;

function hashTeamName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export class PeerCacheService {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private peerCatalogs = new Map<string, ReportCatalogEntry[]>();
  private localCatalog: ReportCatalogEntry[] = [];
  private getReportData: ((id: string) => string | undefined) | null = null;
  private peerCountCallbacks = new Set<PeerCountCallback>();
  private pendingRequests = new Map<string, { resolve: (data: { rawResponse: string; costUsd?: number }) => void; timer: ReturnType<typeof setTimeout> }>();
  private teamHash = '';
  private myPeerId = '';
  private isHub = false;
  private knownPeers = new Set<string>();
  private _isConnected = false;

  get isConnected() { return this._isConnected; }
  get peerCount() { return this.connections.size; }

  setReportDataProvider(fn: (id: string) => string | undefined) {
    this.getReportData = fn;
  }

  onPeerCountChange(cb: PeerCountCallback) {
    this.peerCountCallbacks.add(cb);
    return () => { this.peerCountCallbacks.delete(cb); };
  }

  private notifyPeerCount() {
    const count = this.connections.size;
    this.peerCountCallbacks.forEach(cb => cb(count));
  }

  async connect(teamName: string, catalog: ReportCatalogEntry[]) {
    if (this.peer) this.disconnect();
    this.localCatalog = catalog;
    this.teamHash = hashTeamName(teamName);
    const suffix = Math.random().toString(36).slice(2, 8);
    this.myPeerId = `drift-${this.teamHash}-${suffix}`;
    const hubId = `drift-${this.teamHash}-hub`;

    return new Promise<void>((resolve, reject) => {
      this.peer = new Peer(this.myPeerId, {
        debug: 0,
      });

      this.peer.on('open', () => {
        this._isConnected = true;

        // Listen for incoming connections
        this.peer!.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        // Try to connect to hub
        this.connectToPeer(hubId).then((connected) => {
          if (!connected) {
            // No hub exists — become the hub
            this.becomeHub();
          }
          resolve();
        });
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // Hub ID taken, connect as regular peer
          this.connectToPeer(hubId).then(() => resolve());
        } else if (err.type === 'peer-unavailable') {
          // Peer we tried to connect to doesn't exist — ignore
        } else {
          console.warn('[drift-p2p] error:', err.type);
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this._isConnected = false;
        this.notifyPeerCount();
      });
    });
  }

  private becomeHub() {
    if (!this.peer || this.peer.destroyed) return;

    const hubId = `drift-${this.teamHash}-hub`;

    // Destroy current peer and recreate with hub ID
    const oldConnections = new Map(this.connections);
    this.peer.destroy();

    this.peer = new Peer(hubId, { debug: 0 });

    this.peer.on('open', () => {
      this.myPeerId = hubId;
      this.isHub = true;
      this._isConnected = true;

      this.peer!.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      // Reconnect to old peers
      for (const [peerId] of oldConnections) {
        this.connectToPeer(peerId);
      }
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Someone else already became hub — connect to them instead
        this.peer = new Peer(this.myPeerId, { debug: 0 });
        this.peer.on('open', () => {
          this._isConnected = true;
          this.peer!.on('connection', (conn) => this.setupConnection(conn));
          this.connectToPeer(hubId);
        });
      } else if (err.type !== 'peer-unavailable') {
        console.warn('[drift-p2p] hub error:', err.type);
      }
    });
  }

  private async connectToPeer(peerId: string): Promise<boolean> {
    if (!this.peer || peerId === this.myPeerId || this.connections.has(peerId)) return false;

    return new Promise<boolean>((resolve) => {
      const conn = this.peer!.connect(peerId, { reliable: true });
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.setupConnection(conn);
        resolve(true);
      });

      conn.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  private setupConnection(conn: DataConnection) {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    this.knownPeers.add(peerId);
    this.notifyPeerCount();

    // Send hello with our catalog
    this.send(conn, {
      type: 'hello',
      peerId: this.myPeerId,
      catalog: this.localCatalog,
    });

    // If we're hub, send peer list
    if (this.isHub) {
      this.send(conn, {
        type: 'peer-list',
        peers: [...this.knownPeers].filter(p => p !== peerId),
      });
    }

    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;
      this.handleMessage(peerId, msg);
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.peerCatalogs.delete(peerId);
      this.notifyPeerCount();
    });

    conn.on('error', () => {
      this.connections.delete(peerId);
      this.peerCatalogs.delete(peerId);
      this.notifyPeerCount();
    });
  }

  private handleMessage(fromPeerId: string, msg: PeerMessage) {
    switch (msg.type) {
      case 'hello':
        this.peerCatalogs.set(fromPeerId, msg.catalog);
        break;

      case 'catalog-update':
        const existing = this.peerCatalogs.get(fromPeerId) || [];
        existing.push(msg.entry);
        this.peerCatalogs.set(fromPeerId, existing);
        break;

      case 'peer-list':
        // Connect to peers we don't know
        for (const peerId of msg.peers) {
          if (!this.connections.has(peerId) && peerId !== this.myPeerId) {
            this.connectToPeer(peerId);
          }
        }
        break;

      case 'request': {
        // Someone wants a report from us
        const entry = this.localCatalog.find(
          e => e.pkg === msg.pkg && e.from === msg.from && e.to === msg.to
        );
        if (entry && this.getReportData) {
          const rawResponse = this.getReportData(entry.id);
          if (rawResponse) {
            const conn = this.connections.get(fromPeerId);
            if (conn) {
              this.send(conn, {
                type: 'response',
                requestId: msg.requestId,
                rawResponse,
              });
            }
          }
        }
        break;
      }

      case 'response': {
        const pending = this.pendingRequests.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.requestId);
          pending.resolve({ rawResponse: msg.rawResponse, costUsd: msg.costUsd });
        }
        break;
      }
    }
  }

  private send(conn: DataConnection, msg: PeerMessage) {
    try {
      conn.send(msg);
    } catch {
      // Connection might be closed
    }
  }

  broadcastReport(entry: ReportCatalogEntry) {
    this.localCatalog.push(entry);
    for (const [, conn] of this.connections) {
      this.send(conn, { type: 'catalog-update', entry });
    }
  }

  updateCatalog(catalog: ReportCatalogEntry[]) {
    this.localCatalog = catalog;
  }

  async requestReport(pkg: string, from: string, to: string): Promise<{ rawResponse: string; costUsd?: number } | null> {
    // Check if any peer has this report
    for (const [peerId, catalog] of this.peerCatalogs) {
      const has = catalog.find(e => e.pkg === pkg && e.from === from && e.to === to);
      if (has) {
        const conn = this.connections.get(peerId);
        if (!conn) continue;

        const requestId = Math.random().toString(36).slice(2);
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            this.pendingRequests.delete(requestId);
            resolve(null);
          }, 5000);

          this.pendingRequests.set(requestId, { resolve, timer });
          this.send(conn, { type: 'request', pkg, from, to, requestId });
        });
      }
    }
    return null;
  }

  hasPeerReport(pkg: string, from: string, to: string): boolean {
    for (const [, catalog] of this.peerCatalogs) {
      if (catalog.find(e => e.pkg === pkg && e.from === from && e.to === to)) {
        return true;
      }
    }
    return false;
  }

  disconnect() {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();
    this.connections.clear();
    this.peerCatalogs.clear();
    this.knownPeers.clear();
    this.isHub = false;
    this._isConnected = false;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.notifyPeerCount();
  }
}

// Singleton
export const peerCache = new PeerCacheService();
