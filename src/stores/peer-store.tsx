import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { peerCache, type ReportCatalogEntry } from '../services/peer-cache';
import { useSettings } from './settings-store';
import { useHistory } from './history-store';

interface PeerContextValue {
  peerCount: number;
  isConnected: boolean;
  connect: (teamName: string) => Promise<void>;
  disconnect: () => void;
  broadcastReport: (entry: ReportCatalogEntry) => void;
  requestReport: (pkg: string, from: string, to: string) => Promise<{ rawResponse: string; costUsd?: number } | null>;
  hasPeerReport: (pkg: string, from: string, to: string) => boolean;
}

const PeerContext = createContext<PeerContextValue | null>(null);

export function PeerProvider({ children }: { children: ReactNode }) {
  const [peerCount, setPeerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { settings } = useSettings();
  const { history, getReport } = useHistory();
  const connectedRef = useRef(false);

  // Provide report data getter to peer-cache
  useEffect(() => {
    peerCache.setReportDataProvider((id: string) => {
      const entry = getReport(id);
      return entry?.rawResponse;
    });
  }, [getReport]);

  // Update catalog when history changes
  useEffect(() => {
    const catalog: ReportCatalogEntry[] = history.map(h => ({
      pkg: h.pkg,
      from: h.fromVersion,
      to: h.toVersion,
      id: h.id,
    }));
    peerCache.updateCatalog(catalog);
  }, [history]);

  // Listen for peer count changes
  useEffect(() => {
    return peerCache.onPeerCountChange((count) => {
      setPeerCount(count);
      setIsConnected(peerCache.isConnected);
    });
  }, []);

  // Auto-connect if team name is set
  useEffect(() => {
    if (settings.teamName && !connectedRef.current) {
      connectedRef.current = true;
      const catalog: ReportCatalogEntry[] = history.map(h => ({
        pkg: h.pkg,
        from: h.fromVersion,
        to: h.toVersion,
        id: h.id,
      }));
      peerCache.connect(settings.teamName, catalog)
        .then(() => setIsConnected(true))
        .catch(() => { connectedRef.current = false; });
    }
  }, [settings.teamName]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (teamName: string) => {
    const catalog: ReportCatalogEntry[] = history.map(h => ({
      pkg: h.pkg,
      from: h.fromVersion,
      to: h.toVersion,
      id: h.id,
    }));
    await peerCache.connect(teamName, catalog);
    connectedRef.current = true;
    setIsConnected(true);
  }, [history]);

  const disconnect = useCallback(() => {
    peerCache.disconnect();
    connectedRef.current = false;
    setIsConnected(false);
    setPeerCount(0);
  }, []);

  const broadcastReport = useCallback((entry: ReportCatalogEntry) => {
    peerCache.broadcastReport(entry);
  }, []);

  const requestReport = useCallback(async (pkg: string, from: string, to: string) => {
    return peerCache.requestReport(pkg, from, to);
  }, []);

  const hasPeerReport = useCallback((pkg: string, from: string, to: string) => {
    return peerCache.hasPeerReport(pkg, from, to);
  }, []);

  return (
    <PeerContext.Provider value={{ peerCount, isConnected, connect, disconnect, broadcastReport, requestReport, hasPeerReport }}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeer() {
  const ctx = useContext(PeerContext);
  if (!ctx) throw new Error('usePeer must be used within PeerProvider');
  return ctx;
}
