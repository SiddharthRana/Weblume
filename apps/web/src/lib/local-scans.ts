/**
 * Scans started in this browser (guests can't list scans server-side). Holds the guest
 * scan token needed to view each report. Per-device convenience only; always wrapped in try/catch.
 */
export interface LocalScan {
  id: string;
  url: string;
  createdAt: string;
  scanToken?: string;
}

const KEY = 'weblume.scans.v1';
const MAX = 20;

export function readLocalScans(): LocalScan[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? (parsed as LocalScan[]).filter((s) => typeof s?.id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveLocalScan(scan: LocalScan): void {
  try {
    const rest = readLocalScans().filter((s) => s.id !== scan.id);
    window.localStorage.setItem(KEY, JSON.stringify([scan, ...rest].slice(0, MAX)));
  } catch {
    /* storage unavailable (private mode etc.) — the scan still works for this page view */
  }
}

export function getLocalScan(id: string): LocalScan | undefined {
  return readLocalScans().find((s) => s.id === id);
}

export function removeLocalScan(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(readLocalScans().filter((s) => s.id !== id)));
  } catch {
    /* ignore */
  }
}
