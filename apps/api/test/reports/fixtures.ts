import { CHECKS, type FindingDto, type ScanReportDto } from '@weblume/shared';

export function own(
  id: keyof typeof CHECKS,
  details: Record<string, unknown> = {},
  over: Partial<FindingDto> = {},
): FindingDto {
  const c = CHECKS[id];
  return {
    id: `${id}-1`,
    checkId: id,
    category: c.category,
    severity: c.severity,
    kind: c.kind,
    source: id.startsWith('tech.links') ? 'link_check' : 'page_fetch',
    title: c.title,
    whatItMeans: c.whatItMeans,
    whyItMatters: c.whyItMatters,
    howToFix: c.howToFix,
    learnMoreUrl: c.learnMoreUrl,
    details,
    codeFixAvailable: false,
    ...over,
  };
}

/** A realistic report for a fictional site on a reserved test domain. */
export function sampleReport(over: Partial<ScanReportDto> = {}): ScanReportDto {
  return {
    id: '00000000-0000-4000-8000-00000000a001',
    targetUrl: 'bakery.example',
    normalizedUrl: 'https://bakery.example/',
    finalUrl: 'https://www.bakery.example/',
    status: 'completed',
    failureCode: null,
    failureMessage: null,
    severityCounts: { high: 2, medium: 2, low: 1 },
    createdAt: '2026-10-01T09:29:20.000Z',
    completedAt: '2026-10-01T09:30:00.000Z',
    expiresAt: '2027-10-01T09:30:00.000Z',
    sources: {
      page_fetch: { status: 'ok' },
      psi_mobile: { status: 'ok' },
      psi_desktop: { status: 'failed', reason: 'timeout' },
      link_check: { status: 'ok' },
      robots_sitemap: { status: 'ok' },
    },
    lighthouse: {
      mobile: {
        scores: { performance: 54, accessibility: 81, seo: 93, bestPractices: null },
        metrics: {},
        fetchedAt: '2026-10-01T09:30:00.000Z',
      },
    },
    passedChecks: ['seo.title.missing', 'tech.https.missing'],
    findings: [
      own('tech.links.broken', {
        broken: [
          { url: 'https://www.bakery.example/old-menu', status: 404 },
          { url: 'https://www.bakery.example/catering', error: 'connection_failed' },
        ],
      }),
      own('seo.meta_description.missing'),
      own('tech.hsts.missing', { header: null }),
      own('seo.title.length', { title: 'Café Crème — Pâtisserie «Ünïcødé» Москва', length: 41 }),
      own('seo.open_graph.missing', { missing: ['og:title', 'og:image'] }),
    ],
    ...over,
  };
}
