'use client';

import { useState } from 'react';
import {
  AUDIT_CATEGORIES,
  SEVERITIES,
  type AuditCategory,
  type LighthouseResult,
  type ScanReportDto,
} from '@weblume/shared';
import { FindingCard } from './finding-card';
import { ScoreRing } from './score-ring';
import { SeverityBadge } from './severity-badge';
import { SourcesList } from './sources-list';

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  performance: 'Performance',
  seo: 'SEO',
  accessibility: 'Accessibility',
  technical: 'Technical health',
};

const dateFmt = new Intl.DateTimeFormat('en', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function LighthouseCard({
  strategy,
  result,
}: {
  strategy: 'mobile' | 'desktop';
  result: LighthouseResult;
}) {
  const s = result.scores;
  const entries = [
    ['Performance', s.performance],
    ['Accessibility', s.accessibility],
    ['SEO', s.seo],
    ['Best practices', s.bestPractices],
  ] as const;
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="font-semibold capitalize text-fg">{strategy}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {entries.map(([label, score]) =>
          score === null ? (
            <p key={label} className="text-center text-sm text-fg-muted">
              {label}: not measured
            </p>
          ) : (
            <ScoreRing key={label} score={score} label={label} />
          ),
        )}
      </div>
    </div>
  );
}

/** Full report body: scores, summary, priorities, findings by category, coverage and limitations. */
export function ReportView({ report }: { report: ScanReportDto }) {
  const [filter, setFilter] = useState<AuditCategory | 'all'>('all');
  const findings = report.findings;
  const visible = filter === 'all' ? findings : findings.filter((f) => f.category === filter);
  const top = findings.filter((f) => f.severity !== 'info').slice(0, 5);
  const lh = report.lighthouse;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Website report</p>
        <h1 className="mt-1 break-all text-3xl font-bold text-fg">{report.normalizedUrl}</h1>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm text-fg-muted sm:grid-cols-2">
          {report.finalUrl && report.finalUrl !== report.normalizedUrl && (
            <div>
              <dt className="inline font-medium text-fg">Final URL: </dt>
              <dd className="inline break-all">{report.finalUrl}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium text-fg">Scanned: </dt>
            <dd className="inline">
              <time dateTime={report.completedAt ?? report.createdAt}>
                {dateFmt.format(new Date(report.completedAt ?? report.createdAt))} UTC
              </time>
            </dd>
          </div>
        </dl>
        {report.status === 'partial' && (
          <p
            role="note"
            className="mt-4 rounded-md border border-accent bg-sev-medium-bg p-3 text-sm text-sev-medium"
          >
            Some checks couldn’t be completed — see{' '}
            <a href="#coverage" className="underline">
              audit coverage
            </a>
            . Everything shown below is real data from the checks that did run.
          </p>
        )}
      </header>

      <section aria-labelledby="scores">
        <h2 id="scores" className="text-xl font-bold text-fg">
          Lighthouse scores{' '}
          <span className="text-sm font-normal text-fg-muted">
            (measured by Google PageSpeed Insights)
          </span>
        </h2>
        {lh && (lh.mobile || lh.desktop) ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {lh.mobile && <LighthouseCard strategy="mobile" result={lh.mobile} />}
            {lh.desktop && <LighthouseCard strategy="desktop" result={lh.desktop} />}
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-border bg-surface p-4 text-sm text-fg-muted">
            Lighthouse scores aren’t available for this scan, so none are shown. The checks below
            still ran. See audit coverage for the reason.
          </p>
        )}
      </section>

      <section aria-labelledby="summary">
        <h2 id="summary" className="text-xl font-bold text-fg">
          Findings summary
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {SEVERITIES.map((s) => (
            <li
              key={s}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <SeverityBadge severity={s} />
              <span className="font-semibold text-fg">
                {findings.filter((f) => f.severity === s).length}
              </span>
            </li>
          ))}
        </ul>
        {report.passedChecks.length > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            {report.passedChecks.length} of Weblume’s own checks passed.
          </p>
        )}
      </section>

      {top.length > 0 && (
        <section aria-labelledby="priorities">
          <h2 id="priorities" className="text-xl font-bold text-fg">
            Start here: top priorities
          </h2>
          <ol className="mt-4 space-y-2">
            {top.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm"
              >
                <SeverityBadge severity={f.severity} />
                <span className="text-fg">{f.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="findings">
        <h2 id="findings" className="text-xl font-bold text-fg">
          All findings
        </h2>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter findings by category"
        >
          {(['all', ...AUDIT_CATEGORIES] as const).map((c) => {
            const count =
              c === 'all' ? findings.length : findings.filter((f) => f.category === c).length;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary"
              >
                {c === 'all' ? 'All' : CATEGORY_LABEL[c]} ({count})
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <p className="rounded-md border border-border bg-surface p-4 text-sm text-fg-muted">
              No findings in this category.
            </p>
          ) : (
            visible.map((f) => <FindingCard key={f.id} finding={f} />)
          )}
        </div>
      </section>

      <section aria-labelledby="coverage" className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 id="coverage" className="text-lg font-bold text-fg">
            Audit coverage
          </h2>
          <SourcesList sources={report.sources} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-bold text-fg">Limitations</h2>
          <p className="mt-3 text-sm text-fg-muted">
            This is an automated audit of a single page. “Measured” results are Lighthouse lab
            measurements, which vary between runs. “Detected” findings come from automated checks,
            which find only some accessibility barriers, can’t guarantee search rankings, and don’t
            test security. Recommendations are general guidance.
          </p>
        </div>
      </section>
    </div>
  );
}
