import type { AuditCategory, LighthouseMetrics } from '@weblume/shared';
import type { LighthouseAudit, TrimmedLighthouse } from './psi.types';

const CATEGORY_MAP: Record<string, AuditCategory> = {
  performance: 'performance',
  accessibility: 'accessibility',
  seo: 'seo',
  'best-practices': 'technical',
};

/** Score modes that represent a pass/fail judgement we can report on. */
const SCORED_MODES = new Set(['binary', 'numeric', 'metricSavings']);
export const PASS_THRESHOLD = 0.9;

interface RawAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
}
interface RawCategory {
  score?: number | null;
  auditRefs?: { id: string; weight?: number; group?: string }[];
}
interface RawPsi {
  lighthouseResult?: {
    lighthouseVersion?: string;
    fetchTime?: string;
    categories?: Record<string, RawCategory>;
    audits?: Record<string, RawAudit>;
  };
}

const pct = (s: number | null | undefined) => (typeof s === 'number' ? Math.round(s * 100) : null);
const num = (a: RawAudit | undefined) =>
  typeof a?.numericValue === 'number' ? a.numericValue : undefined;

/** Converts a raw PSI v5 response into the trimmed shape we store. Throws if it isn't a Lighthouse result. */
export function mapPsiResponse(raw: unknown): TrimmedLighthouse {
  const lh = (raw as RawPsi)?.lighthouseResult;
  if (!lh?.categories || !lh.audits) throw new Error('Response has no lighthouseResult');
  const cats = lh.categories;
  const audits = lh.audits;

  const metrics: LighthouseMetrics = {
    firstContentfulPaint: num(audits['first-contentful-paint']),
    largestContentfulPaint: num(audits['largest-contentful-paint']),
    totalBlockingTime: num(audits['total-blocking-time']),
    cumulativeLayoutShift: num(audits['cumulative-layout-shift']),
    speedIndex: num(audits['speed-index']),
  };

  const failing: LighthouseAudit[] = [];
  const seen = new Set<string>();
  for (const [lhCategory, cat] of Object.entries(cats)) {
    const category = CATEGORY_MAP[lhCategory];
    if (!category) continue;
    for (const ref of cat.auditRefs ?? []) {
      if (seen.has(ref.id)) continue;
      const a = audits[ref.id];
      if (!a || !SCORED_MODES.has(a.scoreDisplayMode ?? '') || typeof a.score !== 'number')
        continue;
      if (a.score >= PASS_THRESHOLD) continue;
      seen.add(ref.id);
      failing.push({
        id: ref.id,
        title: a.title ?? ref.id,
        description: a.description ?? '',
        score: a.score,
        displayValue: a.displayValue,
        category,
        lhCategory,
        weight: ref.weight ?? 0,
        group: ref.group,
      });
    }
  }

  return {
    scores: {
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      seo: pct(cats.seo?.score),
      bestPractices: pct(cats['best-practices']?.score),
    },
    metrics,
    lighthouseVersion: lh.lighthouseVersion,
    fetchedAt: lh.fetchTime ?? new Date().toISOString(),
    failingAudits: failing,
  };
}
