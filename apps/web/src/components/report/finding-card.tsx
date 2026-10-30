import type { FindingDto } from '@weblume/shared';
import { SeverityBadge } from './severity-badge';

const CATEGORY_LABEL: Record<FindingDto['category'], string> = {
  performance: 'Performance',
  seo: 'SEO',
  accessibility: 'Accessibility',
  technical: 'Technical health',
};

const KIND_LABEL: Record<FindingDto['kind'], string> = {
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

/** Expandable finding. Native <details> works without JavaScript and with keyboards/screen readers. */
export function FindingCard({ finding }: { finding: FindingDto }) {
  const evidence = evidenceLines(finding);
  return (
    <details className="group rounded-lg border border-border bg-surface open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SeverityBadge severity={finding.severity} />
          <span className="font-semibold text-fg">{finding.title}</span>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </summary>
      <div className="space-y-4 border-t border-border p-4 text-sm leading-relaxed">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {CATEGORY_LABEL[finding.category]} · {KIND_LABEL[finding.kind]}
        </p>
        <section>
          <h4 className="font-semibold text-fg">What this means</h4>
          <p className="mt-1 text-fg-muted">{finding.whatItMeans}</p>
        </section>
        <section>
          <h4 className="font-semibold text-fg">Why it matters</h4>
          <p className="mt-1 text-fg-muted">{finding.whyItMatters}</p>
        </section>
        <section>
          <h4 className="font-semibold text-fg">How to fix it</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-fg-muted">
            {finding.howToFix.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        {evidence.length > 0 && (
          <section>
            <h4 className="font-semibold text-fg">What we found</h4>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-surface-muted p-3 font-mono text-xs text-fg">
              {evidence.join('\n')}
            </pre>
          </section>
        )}
        {finding.learnMoreUrl && (
          <a
            href={finding.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-medium text-primary underline"
          >
            Learn more<span className="sr-only"> about {finding.title} (opens in a new tab)</span>
          </a>
        )}
      </div>
    </details>
  );
}
