import { useState, useEffect, useRef } from 'react';
import { getPackageMetadata } from '../services/npm-registry';

export interface VersionEntry {
  version: string;
  date?: string;
}

export function usePackageVersions(packageName: string) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!packageName) {
      setVersions([]);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const metadata = await getPackageMetadata(packageName, controller.signal);
        const { valid, rcompare } = await import('semver');

        const entries: VersionEntry[] = Object.keys(metadata.versions)
          .filter(v => valid(v))
          .sort((a, b) => rcompare(a, b))
          .map(v => ({
            version: v,
            date: metadata.time?.[v]?.split('T')[0],
          }));

        setVersions(entries);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(String(err));
          setVersions([]);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [packageName]);

  return { versions, loading, error };
}
