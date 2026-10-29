import type { Metadata } from 'next';
import { SEVERITIES, compareSeverity } from '@weblume/shared';
import { Container } from '@/components/container';
import { FindingCard } from '@/components/report/finding-card';
import { ScoreRing } from '@/components/report/score-ring';
import { SeverityBadge } from '@/components/report/severity-badge';
import { sampleReport } from '@/content/sample-report';

export const metadata: Metadata = {
  title: 'Sample report',
  description: 'An illustrative Weblume report showing scores, prioritised findings and fixes.',
  alternates: { canonical: '/sample-report' },
};

const dateFmt = new Intl.DateTimeFormat('en', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export default function SampleReportPage() {
  const r = sampleReport;
  const findings = [...r.findings].sort((a, b) => compareSeverity(a.severity, b.severity));
  const counts = SEVERITIES.map((s) => ({ s, n: findings.filter((f) => f.severity === s).length }));

  return (
    <Container className="py-12">
      <div
        role="note"
        className="rounded-lg border border-accent bg-sev-medium-bg p-4 text-sm text-sev-medium"
      >
        <strong>Illustrative example.</strong> This report describes a fictional website on a
        reserved test domain. It shows the layout of a Weblume report and is not the result of
        scanning a real site.
      </div>

      <header className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Website report</p>
        <h1 className="mt-1 break-all text-3xl font-bold text-fg">{r.targetUrl}</h1>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm text-fg-muted sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-fg">Final URL: </dt>
            <dd className="inline break-all">{r.finalUrl}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-fg">Scanned: </dt>
            <dd className="inline">
              <time dateTime={r.scannedAt}>{dateFmt.format(new Date(r.scannedAt))} UTC</time>
            </dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="scores" className="mt-10">
        <h2 id="scores" className="text-xl font-bold text-fg">
          Lighthouse scores{' '}
          <span className="text-sm font-normal text-fg-muted">
            (measured by Google PageSpeed Insights)
          </span>
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {(['mobile', 'desktop'] as const).map((strategy) => {
            const s = r.lighthouse[strategy];
            return (
              <div key={strategy} className="rounded-lg border border-border bg-surface p-6">
                <h3 className="font-semibold capitalize text-fg">{strategy}</h3>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ScoreRing score={s.performance} label="Performance" />
                  <ScoreRing score={s.accessibility} label="Accessibility" />
                  <ScoreRing score={s.seo} label="SEO" />
                  <ScoreRing score={s.bestPractices} label="Best practices" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="summary" className="mt-10">
        <h2 id="summary" className="text-xl font-bold text-fg">
          Findings summary
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {counts.map(({ s, n }) => (
            <li
              key={s}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <SeverityBadge severity={s} />
              <span className="font-semibold text-fg">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="findings" className="mt-10">
        <h2 id="findings" className="text-xl font-bold text-fg">
          Findings, most important first
        </h2>
        <div className="mt-4 space-y-3">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      </section>

      <section aria-labelledby="coverage" className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 id="coverage" className="text-lg font-bold text-fg">
            Audit coverage
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {r.sources.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-fg-muted">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                {s.name} <span className="sr-only">— completed</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-bold text-fg">Limitations</h2>
          <p className="mt-3 text-sm text-fg-muted">
            This is an automated audit of a single page. Automated checks find only some
            accessibility barriers, cannot guarantee search rankings, and do not test security.
            Lighthouse lab results vary between runs.
          </p>
        </div>
      </section>
    </Container>
  );
}
