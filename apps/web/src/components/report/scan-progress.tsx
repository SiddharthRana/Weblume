'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  'Fetching the page and reading its HTML',
  'Checking titles, headings, links and metadata',
  'Checking up to 50 links, robots.txt and the sitemap',
  'Measuring speed with Google PageSpeed Insights',
];

/**
 * Waiting screen for a queued or running scan. The API reports only "queued" or "running", so the
 * animation shows activity without pretending to know which step is done.
 */
export function ScanProgress({
  url,
  status,
  startedAt,
}: {
  url: string;
  status: 'queued' | 'running';
  startedAt: string;
}) {
  const elapsed = useElapsedSeconds(startedAt);
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Keep the raw address.
  }

  return (
    <div role="status" aria-live="polite" className="mt-6 card overflow-hidden">
      <div aria-hidden="true" className="border-b border-border bg-surface-muted/60 p-6">
        <div className="relative mx-auto h-44 max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <span className="size-2 rounded-full bg-sev-critical/60" />
            <span className="size-2 rounded-full bg-sev-medium/60" />
            <span className="size-2 rounded-full bg-success/60" />
            <span className="ml-2 min-w-0 truncate rounded-full bg-surface-muted px-3 py-0.5 font-mono text-[0.6875rem] text-fg-muted">
              {host}
            </span>
          </div>
          <div className="space-y-2.5 p-4">
            {[70, 92, 84, 55, 78].map((w, i) => (
              <div
                key={i}
                className="scan-shimmer h-2.5 rounded-full bg-surface-muted"
                style={{ width: `${w}%`, ['--i' as string]: i }}
              />
            ))}
          </div>
          <div className="scan-beam scan-beam-fill absolute inset-x-0 top-0 h-12 motion-reduce:hidden" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-gradient opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-3 rounded-full bg-brand-gradient" />
            </span>
            <p className="font-semibold text-fg">
              {status === 'queued' ? 'Waiting to start…' : 'Scan in progress…'}
            </p>
          </div>
          <span className="font-mono text-sm tabular-nums text-fg-muted">
            <span className="sr-only">Elapsed time </span>
            {formatElapsed(elapsed)}
          </span>
        </div>

        <div
          aria-hidden="true"
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <div className="scan-indeterminate h-full w-1/3 rounded-full bg-brand-gradient" />
        </div>

        <ul className="mt-5 space-y-2.5 text-sm text-fg-muted">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="scan-step size-2 shrink-0 rounded-full bg-brand-gradient"
                style={{ ['--i' as string]: i }}
              />
              {step}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-fg-muted">
          This usually takes under a minute. You can leave this page open; the report appears here
          when it’s ready.
        </p>
      </div>
    </div>
  );
}

function useElapsedSeconds(since: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const start = Date.parse(since);
  return Number.isNaN(start) ? 0 : Math.max(0, Math.floor((now - start) / 1000));
}

function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
