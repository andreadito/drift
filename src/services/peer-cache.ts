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
  | { type: 'response'; requestId: string; rawResponse: string; costUsd?: number };

type PeerCountCallback = (count: number) => void;

const NUM_SLOTS = 5;
const RETRY_INTERVAL = 10_000;

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
  private _isConnected = false;
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;

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

  private slotId(slot: number): string {
    return `drift-${this.teamHash}-${slot}`;
  }

  async connect(teamName: string, catalog: ReportCatalogEntry[]) {
    if (this.peer) this.disconnect();
    this.localCatalog = catalog;
    this.teamHash = hashTeamName(teamName);

    // Try to claim a slot
    for (let slot = 0; slot < NUM_SLOTS; slot++) {
      const claimed = await this.tryClaimSlot(slot);
      if (claimed) {
        this.myPeerId = this.slotId(slot);
        this._isConnected = true;

        // Connect to all other slots
        this.discoverPeers();

        // Periodically try to discover new peers
        this.discoveryTimer = setInterval(() => this.discoverPeers(), RETRY_INTERVAL);

        return;
      }
    }

    // All slots taken — use a random ID and connect to all slots
    const randomId = `drift-${this.teamHash}-r-${Math.random().toString(36).slice(2, 8)}`;
    await this.registerAs(randomId);
    this.myPeerId = randomId;
        this._isConnected = true;

    this.discoverPeers();
    this.discoveryTimer = setInterval(() => this.discoverPeers(), RETRY_INTERVAL);
  }

  private tryClaimSlot(slot: number): Promise<boolean> {
    return new Promise((resolve) => {
      const id = this.slotId(slot);
      const p = new Peer(id, { debug: 0 });

      const timeout = setTimeout(() => {
        // If we haven't resolved yet, the connection is probably stuck
        p.destroy();
        resolve(false);
      }, 4000);

      p.on('open', () => {
        clearTimeout(timeout);
        this.peer = p;
        this.peer.on('connection', (conn) => this.setupConnection(conn));
        this.peer.on('error', (err) => {
          if (err.type !== 'peer-unavailable') {
            console.warn('[drift-p2p]', err.type);
          }
        });
        resolve(true);
      });

      p.on('error', (err) => {
        clearTimeout(timeout);
        p.destroy();
        if (err.type === 'unavailable-id') {
          resolve(false); // Slot taken
        } else {
          resolve(false);
        }
      });
    });
  }

  private registerAs(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(id, { debug: 0 });

      const timeout = setTimeout(() => {
        resolve(); // Proceed anyway
      }, 4000);

      this.peer.on('open', () => {
        clearTimeout(timeout);
        this.peer!.on('connection', (conn) => this.setupConnection(conn));
        this.peer!.on('error', (err) => {
          if (err.type !== 'peer-unavailable') {
            console.warn('[drift-p2p]', err.type);
          }
        });
        resolve();
      });

      this.peer.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private discoverPeers() {
    if (!this.peer || this.peer.destroyed) return;

    // Try connecting to all slots we're not already connected to
    for (let slot = 0; slot < NUM_SLOTS; slot++) {
      const id = this.slotId(slot);
      if (id === this.myPeerId) continue;
      if (this.connections.has(id)) continue;
      this.connectToPeer(id);
    }
  }

  private connectToPeer(peerId: string) {
    if (!this.peer || this.peer.destroyed || peerId === this.myPeerId || this.connections.has(peerId)) return;

    try {
      const conn = this.peer.connect(peerId, { reliable: true });

      const timeout = setTimeout(() => {
        // Give up silently
      }, 5000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.setupConnection(conn);
      });

      conn.on('error', () => {
        clearTimeout(timeout);
      });
    } catch {
      // Peer might not exist
    }
  }

  private setupConnection(conn: DataConnection) {
    const peerId = conn.peer;

    // Avoid duplicate connections
    if (this.connections.has(peerId)) {
      return;
    }

    this.connections.set(peerId, conn);
    this.notifyPeerCount();

    // Send hello with our catalog
    this.send(conn, {
      type: 'hello',
      peerId: this.myPeerId,
      catalog: this.localCatalog,
    });

    conn.on('data', (raw) => {
      this.handleMessage(peerId, raw as PeerMessage);
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
        // If we learn about a new peer, connect to them too
        if (msg.peerId !== fromPeerId && !this.connections.has(msg.peerId)) {
          this.connectToPeer(msg.peerId);
        }
        break;

      case 'catalog-update': {
        const existing = this.peerCatalogs.get(fromPeerId) || [];
        existing.push(msg.entry);
        this.peerCatalogs.set(fromPeerId, existing);
        break;
      }

      case 'request': {
        const entry = this.localCatalog.find(
          e => e.pkg === msg.pkg && e.from === msg.from && e.to === msg.to
        );
        if (entry && this.getReportData) {
          const rawResponse = this.getReportData(entry.id);
          if (rawResponse) {
            const conn = this.connections.get(fromPeerId);
            if (conn) {
              this.send(conn, { type: 'response', requestId: msg.requestId, rawResponse });
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
      if (conn.open) conn.send(msg);
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
    for (const [peerId, catalog] of this.peerCatalogs) {
      const has = catalog.find(e => e.pkg === pkg && e.from === from && e.to === to);
      if (has) {
        const conn = this.connections.get(peerId);
        if (!conn || !conn.open) continue;

        const requestId = Math.random().toString(36).slice(2);
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            this.pendingRequests.delete(requestId);
            resolve(null);
          }, 8000);

          this.pendingRequests.set(requestId, { resolve, timer });
          this.send(conn, { type: 'request', pkg, from, to, requestId });
        });
      }
    }
    return null;
  }

  hasPeerReport(pkg: string, from: string, to: string): boolean {
    for (const [, catalog] of this.peerCatalogs) {
      if (catalog.find(e => e.pkg === pkg && e.from === from && e.to === to)) return true;
    }
    return false;
  }

  disconnect() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();
    for (const [, conn] of this.connections) {
      try { conn.close(); } catch { /* ignore */ }
    }
    this.connections.clear();
    this.peerCatalogs.clear();
        this._isConnected = false;
    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }
    this.notifyPeerCount();
  }
}

export const peerCache = new PeerCacheService();
