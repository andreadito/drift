import type { NpmVersionInfo } from '../types/npm';
import type { ExportDiff } from '../types/analysis';

async function fetchPackageFile(pkg: string, version: string, filepath: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`https://unpkg.com/${pkg}@${version}/${filepath}`, { signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractExportsFromSource(source: string): string[] {
  const exports: Set<string> = new Set();

  // Match: export function/class/const/let/var/type/interface name
  const namedRe = /export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(source))) exports.add(m[1]);

  // Match: export default
  if (/export\s+default\s/.test(source)) exports.add('default');

  // Match: export { name1, name2 as alias }
  const reExportRe = /export\s*\{([^}]+)\}/g;
  while ((m = reExportRe.exec(source))) {
    m[1].split(',').forEach(item => {
      const name = item.trim().split(/\s+as\s+/)[0].trim();
      if (name) exports.add(name);
    });
  }

  return [...exports].sort();
}

function resolveTypesFile(info: NpmVersionInfo): string | null {
  if (info.types) return info.types;
  if (info.typings) return info.typings;
  // Check exports for types
  if (info.exports && typeof info.exports === 'object') {
    const root = info.exports['.'];
    if (root && typeof root === 'object' && 'types' in (root as Record<string, unknown>)) {
      return (root as Record<string, string>).types;
    }
  }
  return null;
}

function resolveMainFile(info: NpmVersionInfo): string {
  if (info.exports && typeof info.exports === 'object') {
    const root = info.exports['.'];
    if (typeof root === 'string') return root;
    if (root && typeof root === 'object') {
      const r = root as Record<string, unknown>;
      if (typeof r.import === 'string') return r.import;
      if (typeof r.require === 'string') return r.require;
      if (typeof r.default === 'string') return r.default;
    }
  }
  return info.main || 'index.js';
}

export async function fetchExportDiff(
  pkg: string,
  fromInfo: NpmVersionInfo,
  toInfo: NpmVersionInfo,
  signal?: AbortSignal
): Promise<ExportDiff | null> {
  try {
    // Try .d.ts first, then main entry
    const fromTypesPath = resolveTypesFile(fromInfo);
    const toTypesPath = resolveTypesFile(toInfo);

    const fromFile = fromTypesPath || resolveMainFile(fromInfo);
    const toFile = toTypesPath || resolveMainFile(toInfo);

    const [fromSource, toSource] = await Promise.all([
      fetchPackageFile(pkg, fromInfo.version, fromFile, signal),
      fetchPackageFile(pkg, toInfo.version, toFile, signal),
    ]);

    if (!fromSource && !toSource) return null;

    const fromExports = fromSource ? extractExportsFromSource(fromSource) : [];
    const toExports = toSource ? extractExportsFromSource(toSource) : [];

    const fromSet = new Set(fromExports);
    const toSet = new Set(toExports);

    return {
      added: toExports.filter(e => !fromSet.has(e)),
      removed: fromExports.filter(e => !toSet.has(e)),
      changed: [], // Would need deeper AST analysis to detect signature changes
      fromExports,
      toExports,
    };
  } catch {
    return null;
  }
}
