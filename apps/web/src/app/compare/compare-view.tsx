'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  COMPARABLE_SCAN_STATUSES,
  SEVERITIES,
  SEVERITY_LABELS,
  type FindingDto,
  type ScanSummaryDto,
} from '@weblume/shared';
import type { Schemas } from '@weblume/api-client-ts';
import { FindingCard } from '@/components/report/finding-card';
import { SeverityBadge } from '@/components/report/severity-badge';
import { api, errorMessage, type ApiErrorBody } from '@/lib/api';

type Comparison = Schemas['ReportComparisonDto'];
type ScoreDeltas = Schemas['ScoreDeltasDto'];

const dateFmt = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const fmt = (iso: string) => `${dateFmt.format(new Date(iso))} UTC`;

type State =
  | { kind: 'loading' }
  | { kind: 'pick'; target: ScanSummaryDto; candidates: ScanSummaryDto[] }
  | { kind: 'upgrade'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; comparison: Comparison };

export function CompareView() {
  const params = useSearchParams();
  const router = useRouter();
  const base = params.get('base');
  const target = params.get('target');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    const set = (s: State) => active && setState(s);
    set({ kind: 'loading' });
    void (async () => {
      try {
        if (!target) return set({ kind: 'error', message: 'Choose a report to compare first.' });
        if (base) {
          const { data, error } = await api.GET('/v1/compare', {
            params: { query: { base, target } },
          });
          if (data) return set({ kind: 'done', comparison: data });
          const body = error as ApiErrorBody | undefined;
          if (body?.code === 'upgrade_required')
            return set({ kind: 'upgrade', message: errorMessage(error) });
          return set({ kind: 'error', message: errorMessage(error) });
        }
        // Only one scan chosen: list earlier finished scans of the same address.
        const one = await api.GET('/v1/scans/{id}', { params: { path: { id: target } } });
        if (!one.data) return set({ kind: 'error', message: errorMessage(one.error) });
        const t = one.data as ScanSummaryDto;
        const list = await api.GET('/v1/scans', {
          params: { query: { q: t.normalizedUrl, limit: 50 } },
        });
        if (!list.data) return set({ kind: 'error', message: errorMessage(list.error) });
        const candidates = (list.data.items as ScanSummaryDto[]).filter(
          (s) =>
            s.id !== t.id &&
            s.normalizedUrl === t.normalizedUrl &&
            (COMPARABLE_SCAN_STATUSES as readonly string[]).includes(s.status),
        );
        set({ kind: 'pick', target: t, candidates });
      } catch {
        set({ kind: 'error', message: errorMessage(undefined) });
      }
    })();
    return () => {
      active = false;
    };
  }, [base, target]);

  if (state.kind === 'loading')
    return (
      <p role="status" className="py-16 text-center text-fg-muted">
        Loading comparison…
      </p>
    );

  if (state.kind === 'upgrade')
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">Compare scans over time</h1>
        <p className="mt-3 text-fg-muted">{state.message}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          See plans
        </Link>
      </div>
    );

  if (state.kind === 'error')
    return (
      <div role="alert" className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">Couldn’t compare these scans</h1>
        <p className="mt-3 text-fg-muted">{state.message}</p>
        <Link href="/history" className="mt-6 inline-block font-medium text-primary underline">
          Back to history
        </Link>
      </div>
    );

  if (state.kind === 'pick')
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Compare</p>
        <h1 className="mt-1 break-all text-2xl font-bold text-fg">{state.target.normalizedUrl}</h1>
        <p className="mt-2 text-fg-muted">
          Choose another scan of this address to compare with the one from{' '}
          {fmt(state.target.createdAt)}.
        </p>
        {state.candidates.length === 0 ? (
          <p className="mt-6 rounded-md border border-border bg-surface p-4 text-sm text-fg-muted">
            There’s no other finished scan of this address yet. Run a new scan after making changes,
            then compare the two.{' '}
            <Link href="/scan" className="font-medium text-primary underline">
              New scan
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {state.candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/compare?base=${c.id}&target=${state.target.id}`)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 text-left text-sm hover:border-primary"
                >
                  <span className="text-fg">{fmt(c.createdAt)}</span>
                  <span className="text-fg-muted">
                    {SEVERITIES.reduce((n, s) => n + (c.severityCounts[s] ?? 0), 0)} findings
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );

  const c = state.comparison;
  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Comparison</p>
        <h1 className="mt-1 break-all text-3xl font-bold text-fg">{c.target.normalizedUrl}</h1>
        <p className="mt-2 text-fg-muted">
          <Link href={`/scan/${c.base.id}`} className="underline">
            {fmt(c.base.createdAt)}
          </Link>{' '}
          →{' '}
          <Link href={`/scan/${c.target.id}`} className="underline">
            {fmt(c.target.createdAt)}
          </Link>
        </p>
      </header>

      <section aria-labelledby="cmp-summary">
        <h2 id="cmp-summary" className="text-xl font-bold text-fg">
          Summary
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Resolved" value={c.resolvedFindings.length} tone="good" />
          <Stat
            label="New"
            value={c.newFindings.length}
            tone={c.newFindings.length ? 'bad' : 'neutral'}
          />
          <Stat label="Still open" value={c.unchangedFindings.length} tone="neutral" />
        </ul>
        <SeverityDelta delta={c.severityDelta} />
      </section>

      <section aria-labelledby="cmp-scores">
        <h2 id="cmp-scores" className="text-xl font-bold text-fg">
          Lighthouse scores
        </h2>
        {c.scores.mobile || c.scores.desktop ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {c.scores.mobile && <ScoreTable strategy="Mobile" deltas={c.scores.mobile} />}
            {c.scores.desktop && <ScoreTable strategy="Desktop" deltas={c.scores.desktop} />}
          </div>
        ) : (
          <p className="mt-3 text-sm text-fg-muted">
            Neither scan has Lighthouse scores, so no score changes are shown.
          </p>
        )}
        <p className="mt-2 text-xs text-fg-muted">
          Lab scores vary by a few points between runs even when nothing changed.
        </p>
      </section>

      <FindingGroup
        id="cmp-new"
        title="New issues"
        findings={c.newFindings}
        empty="No new issues."
      />
      <FindingGroup
        id="cmp-resolved"
        title="Resolved"
        findings={c.resolvedFindings}
        empty="Nothing from the earlier scan has been resolved yet."
      />
      <FindingGroup
        id="cmp-unchanged"
        title="Still open"
        findings={c.unchangedFindings.map((u) => u.finding)}
        notes={Object.fromEntries(
          c.unchangedFindings
            .filter((u) => u.previousSeverity)
            .map((u) => [u.finding.id, `Was ${SEVERITY_LABELS[u.previousSeverity!]}`]),
        )}
        empty="No issues carried over."
      />
      {c.notComparable.length > 0 && (
        <FindingGroup
          id="cmp-unknown"
          title="Couldn’t compare"
          intro="These come from a check that didn’t run in one of the two scans (for example, Lighthouse timed out), so we can’t say whether they’re new or fixed."
          findings={c.notComparable}
          empty=""
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const color = tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-danger' : 'text-fg';
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </li>
  );
}

function SeverityDelta({ delta }: { delta: Comparison['severityDelta'] }) {
  const entries = SEVERITIES.filter((s) => delta[s]);
  if (entries.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-3" aria-label="Change in findings by severity">
      {entries.map((s) => (
        <li
          key={s}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <SeverityBadge severity={s} />
          <span className="font-semibold text-fg">{delta[s]! > 0 ? `+${delta[s]}` : delta[s]}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreTable({ strategy, deltas }: { strategy: string; deltas: ScoreDeltas }) {
  const rows = [
    ['Performance', deltas.performance],
    ['Accessibility', deltas.accessibility],
    ['SEO', deltas.seo],
    ['Best practices', deltas.bestPractices],
  ] as const;
  const show = (n: number | null) => (n === null ? '—' : String(n));
  return (
    <table className="w-full rounded-lg border border-border bg-surface text-sm">
      <caption className="p-3 text-left font-semibold text-fg">{strategy}</caption>
      <thead>
        <tr className="border-b border-border text-left text-fg-muted">
          <th scope="col" className="p-3 font-medium">
            Score
          </th>
          <th scope="col" className="p-3 font-medium">
            Before
          </th>
          <th scope="col" className="p-3 font-medium">
            After
          </th>
          <th scope="col" className="p-3 font-medium">
            Change
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, d]) => (
          <tr key={label} className="border-b border-border last:border-0">
            <th scope="row" className="p-3 text-left font-medium text-fg">
              {label}
            </th>
            <td className="p-3 text-fg">{show(d.before)}</td>
            <td className="p-3 text-fg">{show(d.after)}</td>
            <td
              className={`p-3 font-semibold ${d.delta === null || d.delta === 0 ? 'text-fg-muted' : d.delta > 0 ? 'text-success' : 'text-danger'}`}
            >
              {d.delta === null ? 'n/a' : d.delta > 0 ? `+${d.delta}` : String(d.delta)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FindingGroup({
  id,
  title,
  intro,
  findings,
  notes = {},
  empty,
}: {
  id: string;
  title: string;
  intro?: string;
  findings: FindingDto[] | Schemas['FindingDtoClass'][];
  notes?: Record<string, string>;
  empty: string;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold text-fg">
        {title} ({findings.length})
      </h2>
      {intro && <p className="mt-2 text-sm text-fg-muted">{intro}</p>}
      {findings.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {findings.map((f) => (
            <div key={f.id}>
              {notes[f.id] && (
                <p className="mb-1 text-xs font-medium text-fg-muted">{notes[f.id]}</p>
              )}
              <FindingCard finding={f as FindingDto} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
