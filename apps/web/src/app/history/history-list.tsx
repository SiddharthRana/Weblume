'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { readLocalScans, removeLocalScan, type LocalScan } from '@/lib/local-scans';

const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const subscribe = () => () => undefined;
const EMPTY: LocalScan[] = [];

export function HistoryList() {
  // Read localStorage only on the client (server snapshot is empty).
  const initial = useSyncExternalStore(subscribe, readLocalScansCached, () => EMPTY);
  const [removed, setRemoved] = useState<string[]>([]);
  const scans = initial.filter((s) => !removed.includes(s.id));

  if (scans.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-semibold text-fg">No scans on this device yet</h2>
        <p className="mt-2 text-fg-muted">Scans you start in this browser will be listed here.</p>
        <Link
          href="/scan"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Scan a website
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border card">
      {scans.map((s) => (
        <li
          key={s.id}
          className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link href={`/scan/${s.id}`} className="break-all font-medium text-primary underline">
              {s.url}
            </Link>
            <p className="text-sm text-fg-muted">
              <time dateTime={s.createdAt}>{fmt.format(new Date(s.createdAt))}</time>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              removeLocalScan(s.id);
              setRemoved((r) => [...r, s.id]);
            }}
            className="min-h-11 self-start rounded-md border border-border px-4 text-sm text-fg hover:bg-surface-muted sm:self-auto"
          >
            Remove<span className="sr-only"> {s.url} from this device</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

let cache: { raw: string | null; value: LocalScan[] } = { raw: null, value: EMPTY };
function readLocalScansCached(): LocalScan[] {
  // useSyncExternalStore needs a stable snapshot between renders.
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem('weblume.scans.v1');
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, value: readLocalScans() };
  return cache.value;
}
