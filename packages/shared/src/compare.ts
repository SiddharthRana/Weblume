import type {
  FindingDto,
  LighthouseScores,
  ScanReportDto,
  ScanSummaryDto,
  SeverityCounts,
} from './report.js';
import { SEVERITIES } from './severity.js';
import type { ReportSource } from './scan.js';

export const COMPARABLE_SCAN_STATUSES = ['completed', 'partial'] as const;

export interface ScoreDelta {
  before: number | null;
  after: number | null;
  /** after − before, or null when either side has no score. */
  delta: number | null;
}

export type ScoreDeltas = Record<keyof LighthouseScores, ScoreDelta>;

export interface UnchangedFinding {
  /** The finding as it appears in the newer scan. */
  finding: FindingDto;
  /** Set when the severity changed between the scans. */
  previousSeverity?: FindingDto['severity'];
}

export interface ReportComparison {
  /** The older scan. */
  base: ScanSummaryDto;
  /** The newer scan. */
  target: ScanSummaryDto;
  scores: { mobile?: ScoreDeltas; desktop?: ScoreDeltas };
  /** Found in the newer scan but not the older one (where the older scan checked for it). */
  newFindings: FindingDto[];
  /** Found in the older scan and checked for, but not found, in the newer one. */
  resolvedFindings: FindingDto[];
  unchangedFindings: UnchangedFinding[];
  /**
   * Findings that can't be compared honestly because their source didn't run in one of the two
   * scans (e.g. Lighthouse timed out). They are neither "new" nor "resolved".
   */
  notComparable: FindingDto[];
  severityDelta: SeverityCounts;
}

export type CompareError = 'different_urls' | 'not_comparable_status';

/** Identity of a finding across scans: the check, plus the Lighthouse strategy where relevant. */
export function findingKey(f: Pick<FindingDto, 'checkId' | 'details'>): string {
  const strategy = typeof f.details?.strategy === 'string' ? f.details.strategy : '';
  return `${f.checkId}|${strategy}`;
}

function sourceRan(report: ScanReportDto, source: ReportSource): boolean {
  return report.sources[source]?.status === 'ok';
}

const SCORE_KEYS: (keyof LighthouseScores)[] = [
  'performance',
  'accessibility',
  'seo',
  'bestPractices',
];

function scoreDeltas(
  before: LighthouseScores | undefined,
  after: LighthouseScores | undefined,
): ScoreDeltas | undefined {
  if (!before && !after) return undefined;
  const out = {} as ScoreDeltas;
  for (const k of SCORE_KEYS) {
    const b = before?.[k] ?? null;
    const a = after?.[k] ?? null;
    out[k] = { before: b, after: a, delta: a !== null && b !== null ? a - b : null };
  }
  return out;
}

/**
 * Compares two finished reports of the same normalised URL. The order of the arguments doesn't
 * matter: the older scan is always the base.
 */
export function compareReports(
  a: ScanReportDto,
  b: ScanReportDto,
): { ok: true; comparison: ReportComparison } | { ok: false; error: CompareError } {
  if (a.normalizedUrl !== b.normalizedUrl) return { ok: false, error: 'different_urls' };
  const comparable = (s: ScanReportDto) =>
    (COMPARABLE_SCAN_STATUSES as readonly string[]).includes(s.status);
  if (!comparable(a) || !comparable(b)) return { ok: false, error: 'not_comparable_status' };

  const [base, target] = Date.parse(a.createdAt) <= Date.parse(b.createdAt) ? [a, b] : [b, a];
  const before = new Map(base.findings.map((f) => [findingKey(f), f]));
  const after = new Map(target.findings.map((f) => [findingKey(f), f]));

  const newFindings: FindingDto[] = [];
  const resolvedFindings: FindingDto[] = [];
  const unchangedFindings: UnchangedFinding[] = [];
  const notComparable: FindingDto[] = [];

  for (const [key, f] of after) {
    const old = before.get(key);
    if (old) {
      unchangedFindings.push(
        old.severity === f.severity
          ? { finding: f }
          : { finding: f, previousSeverity: old.severity },
      );
    } else if (sourceRan(base, f.source)) newFindings.push(f);
    else notComparable.push(f);
  }
  for (const [key, f] of before) {
    if (after.has(key)) continue;
    if (sourceRan(target, f.source)) resolvedFindings.push(f);
    else notComparable.push(f);
  }

  const severityDelta: SeverityCounts = {};
  for (const s of SEVERITIES) {
    const d = (target.severityCounts[s] ?? 0) - (base.severityCounts[s] ?? 0);
    if (d !== 0) severityDelta[s] = d;
  }

  const scores: ReportComparison['scores'] = {};
  for (const strategy of ['mobile', 'desktop'] as const) {
    const d = scoreDeltas(
      base.lighthouse?.[strategy]?.scores,
      target.lighthouse?.[strategy]?.scores,
    );
    if (d) scores[strategy] = d;
  }

  return {
    ok: true,
    comparison: {
      base: summaryOf(base),
      target: summaryOf(target),
      scores,
      newFindings,
      resolvedFindings,
      unchangedFindings,
      notComparable,
      severityDelta,
    },
  };
}

function summaryOf(r: ScanReportDto): ScanSummaryDto {
  return {
    id: r.id,
    targetUrl: r.targetUrl,
    normalizedUrl: r.normalizedUrl,
    finalUrl: r.finalUrl,
    status: r.status,
    failureCode: r.failureCode,
    failureMessage: r.failureMessage,
    severityCounts: r.severityCounts,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
  };
}
