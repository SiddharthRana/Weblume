import type { ReportSource, SourceStatus, SourcesMap } from '@weblume/shared';

const LABELS: Record<ReportSource, string> = {
  page_fetch: 'Page fetch & HTML checks',
  psi_mobile: 'Lighthouse via PageSpeed Insights (mobile)',
  psi_desktop: 'Lighthouse via PageSpeed Insights (desktop)',
  link_check: 'Link check (up to 50 links)',
  robots_sitemap: 'robots.txt & sitemap',
};

const ORDER: ReportSource[] = [
  'page_fetch',
  'psi_mobile',
  'psi_desktop',
  'link_check',
  'robots_sitemap',
];

function describe(s: SourceStatus): string {
  if (s.status === 'ok') return 'Completed';
  const reasons: Record<string, string> = {
    not_configured: 'Not available — not configured on this server',
    disabled: 'Turned off',
    not_applicable: 'Not applicable',
    timeout: 'Didn’t finish in time',
    quota_exceeded: 'Daily quota reached — try again later',
    upstream_error: 'The service returned an error',
    blocked: 'Blocked',
    invalid_response: 'Returned data we couldn’t read',
  };
  return reasons[s.reason] ?? 'Unavailable';
}

export function SourcesList({ sources }: { sources: SourcesMap }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {ORDER.filter((k) => sources[k]).map((k) => {
        const s = sources[k]!;
        const ok = s.status === 'ok';
        return (
          <li key={k} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={
                ok ? 'text-success' : s.status === 'failed' ? 'text-danger' : 'text-fg-muted'
              }
            >
              {ok ? '✓' : s.status === 'failed' ? '✕' : '–'}
            </span>
            <span className="text-fg-muted">
              <span className="text-fg">{LABELS[k]}</span> — {describe(s)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
