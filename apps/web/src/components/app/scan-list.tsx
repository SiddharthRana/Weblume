import Link from 'next/link';
import type { ScanStatus, ScanSummaryDto } from '@weblume/shared';
import { SeverityBadge } from '../report/severity-badge';

const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS: Record<ScanStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-surface-muted text-fg' },
  running: { label: 'Running', className: 'bg-surface-muted text-fg' },
  completed: { label: 'Completed', className: 'bg-surface-muted text-success' },
  partial: { label: 'Partial', className: 'bg-sev-medium-bg text-sev-medium' },
  failed: { label: 'Failed', className: 'bg-sev-critical-bg text-sev-critical' },
};

export function ScanList({ scans }: { scans: ScanSummaryDto[] }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {scans.map((s) => (
        <li
          key={s.id}
          className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link href={`/scan/${s.id}`} className="break-all font-medium text-primary underline">
              {s.normalizedUrl}
            </Link>
            <p className="text-sm text-fg-muted">
              <time dateTime={s.createdAt}>{fmt.format(new Date(s.createdAt))}</time>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[s.status].className}`}
            >
              {STATUS[s.status].label}
            </span>
            {(['critical', 'high'] as const).map((sev) =>
              s.severityCounts[sev] ? (
                <span key={sev} className="inline-flex items-center gap-1 text-xs text-fg-muted">
                  <SeverityBadge severity={sev} /> ×{s.severityCounts[sev]}
                </span>
              ) : null,
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
