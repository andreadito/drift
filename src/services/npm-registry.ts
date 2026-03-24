import type { NpmSearchResult, NpmPackageMetadata } from '../types/npm';

const metadataCache = new Map<string, NpmPackageMetadata>();

export async function searchPackages(query: string, signal?: AbortSignal): Promise<NpmSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`,
    { signal }
  );
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`);
  const data = await res.json();
  return data.objects.map((obj: { package: { name: string; description: string; version: string } }) => ({
    name: obj.package.name,
    description: obj.package.description || '',
    version: obj.package.version,
  }));
}

export async function getPackageMetadata(name: string, signal?: AbortSignal): Promise<NpmPackageMetadata> {
  const cached = metadataCache.get(name);
  if (cached) return cached;

  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { signal });
  if (!res.ok) throw new Error(`Package "${name}" not found (${res.status})`);
  const data: NpmPackageMetadata = await res.json();
  metadataCache.set(name, data);
  return data;
}
