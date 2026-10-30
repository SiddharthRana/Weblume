import { describe, expect, it } from 'vitest';
import { compareReports, findingKey, type FindingDto, type ScanReportDto } from '../src/index.js';

function finding(checkId: string, over: Partial<FindingDto> = {}): FindingDto {
  return {
    id: `${checkId}-${Math.random()}`,
    checkId,
    category: 'seo',
    severity: 'medium',
    kind: 'detected',
    source: 'page_fetch',
    title: checkId,
    whatItMeans: '',
    whyItMatters: '',
    howToFix: [],
    details: {},
    ...over,
  };
}

const allSources = {
  page_fetch: { status: 'ok' },
  psi_mobile: { status: 'ok' },
  psi_desktop: { status: 'ok' },
  link_check: { status: 'ok' },
  robots_sitemap: { status: 'ok' },
} as const;

function report(over: Partial<ScanReportDto> = {}): ScanReportDto {
  return {
    id: 'r',
    targetUrl: 'example.com',
    normalizedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',
    status: 'completed',
    failureCode: null,
    failureMessage: null,
    severityCounts: {},
    createdAt: '2026-10-01T00:00:00.000Z',
    completedAt: '2026-10-01T00:01:00.000Z',
    sources: { ...allSources },
    lighthouse: null,
    passedChecks: [],
    findings: [],
    expiresAt: '2027-10-01T00:00:00.000Z',
    ...over,
  };
}

describe('compareReports', () => {
  it('classifies new, resolved and unchanged findings, whatever the argument order', () => {
    const older = report({
      id: 'old',
      findings: [finding('seo.title.missing'), finding('seo.meta.missing', { severity: 'high' })],
      severityCounts: { medium: 1, high: 1 },
    });
    const newer = report({
      id: 'new',
      createdAt: '2026-10-20T00:00:00.000Z',
      findings: [finding('seo.meta.missing', { severity: 'low' }), finding('tech.https.missing')],
      severityCounts: { low: 1, medium: 1 },
    });
    for (const [a, b] of [
      [older, newer],
      [newer, older],
    ] as const) {
      const r = compareReports(a, b);
      if (!r.ok) throw new Error(r.error);
      const c = r.comparison;
      expect(c.base.id).toBe('old');
      expect(c.target.id).toBe('new');
      expect(c.newFindings.map((f) => f.checkId)).toEqual(['tech.https.missing']);
      expect(c.resolvedFindings.map((f) => f.checkId)).toEqual(['seo.title.missing']);
      expect(c.unchangedFindings).toHaveLength(1);
      expect(c.unchangedFindings[0]!.previousSeverity).toBe('high');
      expect(c.unchangedFindings[0]!.finding.severity).toBe('low');
      expect(c.severityDelta).toEqual({ high: -1, low: 1 });
      expect(c.notComparable).toEqual([]);
    }
  });

  it('does not call a finding resolved when its source did not run in the newer scan', () => {
    const lh = finding('lighthouse.render-blocking-resources', {
      source: 'psi_mobile',
      details: { strategy: 'mobile' },
    });
    const older = report({ findings: [lh] });
    const newer = report({
      createdAt: '2026-10-20T00:00:00.000Z',
      status: 'partial',
      sources: { ...allSources, psi_mobile: { status: 'failed', reason: 'timeout' } },
    });
    const r = compareReports(older, newer);
    if (!r.ok) throw new Error(r.error);
    expect(r.comparison.resolvedFindings).toEqual([]);
    expect(r.comparison.notComparable.map((f) => f.checkId)).toEqual([lh.checkId]);
  });

  it('does not call a finding new when the older scan never checked for it', () => {
    const older = report({
      sources: { ...allSources, link_check: { status: 'skipped', reason: 'disabled' } },
    });
    const newer = report({
      createdAt: '2026-10-20T00:00:00.000Z',
      findings: [finding('links.broken', { source: 'link_check' })],
    });
    const r = compareReports(older, newer);
    if (!r.ok) throw new Error(r.error);
    expect(r.comparison.newFindings).toEqual([]);
    expect(r.comparison.notComparable).toHaveLength(1);
  });

  it('keeps Lighthouse findings for mobile and desktop apart', () => {
    const m = finding('lighthouse.x', { source: 'psi_mobile', details: { strategy: 'mobile' } });
    const d = finding('lighthouse.x', { source: 'psi_desktop', details: { strategy: 'desktop' } });
    expect(findingKey(m)).not.toBe(findingKey(d));
    const r = compareReports(
      report({ findings: [m] }),
      report({ createdAt: '2026-10-20T00:00:00.000Z', findings: [d] }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.comparison.newFindings).toEqual([d]);
    expect(r.comparison.resolvedFindings).toEqual([m]);
  });

  it('computes score deltas and leaves missing scores as null', () => {
    const scores = (performance: number | null, seo: number | null) => ({
      mobile: {
        scores: { performance, accessibility: 90, seo, bestPractices: 100 },
        metrics: {},
        fetchedAt: '2026-10-01T00:00:00.000Z',
      },
    });
    const r = compareReports(
      report({ lighthouse: scores(50, null) }),
      report({ createdAt: '2026-10-20T00:00:00.000Z', lighthouse: scores(72, 80) }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.comparison.scores.mobile?.performance).toEqual({ before: 50, after: 72, delta: 22 });
    expect(r.comparison.scores.mobile?.seo).toEqual({ before: null, after: 80, delta: null });
    expect(r.comparison.scores.mobile?.accessibility.delta).toBe(0);
    expect(r.comparison.scores.desktop).toBeUndefined();
  });

  it('refuses different URLs and unfinished or failed scans', () => {
    expect(compareReports(report(), report({ normalizedUrl: 'https://other.com/' }))).toEqual({
      ok: false,
      error: 'different_urls',
    });
    expect(compareReports(report(), report({ status: 'failed' }))).toEqual({
      ok: false,
      error: 'not_comparable_status',
    });
    expect(compareReports(report({ status: 'running' }), report())).toMatchObject({ ok: false });
  });
});
