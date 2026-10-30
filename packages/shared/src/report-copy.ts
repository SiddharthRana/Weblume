import type { AuditCategory, ReportSource } from './scan.js';
import type { FindingDto, SourceStatus } from './report.js';
import type { Severity } from './severity.js';

/** Report wording shared by the web report, the PDF and (via the API) the mobile app. */
export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  performance: 'Performance',
  seo: 'SEO',
  accessibility: 'Accessibility',
  technical: 'Technical health',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export const SOURCE_LABELS: Record<ReportSource, string> = {
  page_fetch: 'Page fetch & HTML checks',
  psi_mobile: 'Lighthouse via PageSpeed Insights (mobile)',
  psi_desktop: 'Lighthouse via PageSpeed Insights (desktop)',
  link_check: 'Link check (up to 50 links)',
  robots_sitemap: 'robots.txt & sitemap',
};

export const SOURCE_ORDER: ReportSource[] = [
  'page_fetch',
  'psi_mobile',
  'psi_desktop',
  'link_check',
  'robots_sitemap',
];

const SOURCE_REASONS: Record<string, string> = {
  not_configured: 'Not available — not configured on this server',
  disabled: 'Turned off',
  not_applicable: 'Not applicable',
  timeout: 'Didn’t finish in time',
  quota_exceeded: 'Daily quota reached — try again later',
  upstream_error: 'The service returned an error',
  blocked: 'Blocked',
  invalid_response: 'Returned data we couldn’t read',
};

export function describeSourceStatus(s: SourceStatus): string {
  if (s.status === 'ok') return 'Completed';
  return SOURCE_REASONS[s.reason] ?? 'Unavailable';
}

export const REPORT_LIMITATIONS =
  'This is an automated audit of a single page. “Measured” results are Lighthouse lab measurements, which vary between runs. “Detected” findings come from automated checks, which find only some accessibility barriers, can’t guarantee search rankings, and don’t test security. Recommendations are general guidance.';

export const KIND_LABELS: Record<FindingDto['kind'], string> = {
  measured: 'Measured',
  detected: 'Detected automatically',
  recommendation: 'Recommendation',
};

/** Human-readable evidence lines from a finding's details. Never renders raw HTML. */
export function evidenceLines(f: Pick<FindingDto, 'checkId' | 'details'>): string[] {
  const d = f.details as Record<string, unknown>;
  const lines: string[] = [];
  if (typeof d.measured === 'string')
    lines.push(`Measured: ${d.measured}${d.strategy ? ` (${String(d.strategy)})` : ''}`);
  if (Array.isArray(d.broken)) {
    for (const b of d.broken as { url: string; status?: number; error?: string }[]) {
      lines.push(
        `${b.url} → ${b.status ? `HTTP ${b.status}` : (b.error ?? 'error').replace(/_/g, ' ')}`,
      );
    }
  }
  if (Array.isArray(d.examples)) {
    for (const e of d.examples as unknown[])
      lines.push(
        typeof e === 'string'
          ? e
          : `<${(e as { from: string }).from}> → <${(e as { to: string }).to}>`,
      );
  }
  if (Array.isArray(d.missing)) lines.push(`Missing: ${(d.missing as string[]).join(', ')}`);
  if (Array.isArray(d.chain)) lines.push(...(d.chain as string[]).map((u, i) => `${i + 1}. ${u}`));
  if (typeof d.title === 'string' && !f.checkId.startsWith('lighthouse.'))
    lines.push(`Title: “${d.title}” (${String(d.length)} characters)`);
  if (typeof d.description === 'string' && !f.checkId.startsWith('lighthouse.'))
    lines.push(`Description: “${d.description}” (${String(d.length)} characters)`);
  if (typeof d.canonical === 'string') lines.push(`Canonical: ${d.canonical}`);
  if (typeof d.header === 'string') lines.push(`Header: ${d.header}`);
  if (typeof d.meta === 'string') lines.push(`Meta robots: ${d.meta}`);
  if (typeof d.count === 'number' && lines.length === 0) lines.push(`Count: ${d.count}`);
  if (d.reasons && typeof d.reasons === 'object') {
    const r = d.reasons as Record<string, number>;
    const parts = [
      r.limit ? `${r.limit} over the per-scan limit` : '',
      r.robots ? `${r.robots} disallowed by robots.txt` : '',
      r.blocked ? `${r.blocked} to addresses we don’t scan` : '',
      r.rate_limited ? `${r.rate_limited} rate-limited by the server` : '',
    ].filter(Boolean);
    if (parts.length) lines.push(parts.join('; '));
  }
  return lines.slice(0, 25);
}
