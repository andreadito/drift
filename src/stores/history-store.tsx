import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ReportHistoryEntry } from '../types/settings';

const STORAGE_KEY = 'drift_report_history';
const MAX_ENTRIES = 20;

function loadHistory(): ReportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReportHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: ReportHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

interface HistoryContextValue {
  history: ReportHistoryEntry[];
  addReport: (entry: Omit<ReportHistoryEntry, 'id' | 'timestamp'>) => string;
  getReport: (id: string) => ReportHistoryEntry | undefined;
  deleteReport: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ReportHistoryEntry[]>(loadHistory);

  const addReport = useCallback((entry: Omit<ReportHistoryEntry, 'id' | 'timestamp'>) => {
    const id = crypto.randomUUID();
    const full: ReportHistoryEntry = { ...entry, id, timestamp: Date.now() };

    setHistory(prev => {
      // Deduplicate: remove existing entry for same pkg+from+to
      const deduped = prev.filter(
        e => !(e.pkg === entry.pkg && e.fromVersion === entry.fromVersion && e.toVersion === entry.toVersion)
      );
      const next = [full, ...deduped].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });

    return id;
  }, []);

  const getReport = useCallback((id: string) => {
    return history.find(e => e.id === id);
  }, [history]);

  const deleteReport = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addReport, getReport, deleteReport, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
