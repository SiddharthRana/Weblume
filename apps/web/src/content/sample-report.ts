import { CHECKS, type CodeFix, type FindingDto, type ScanReportDto } from '@weblume/shared';

/** Code fixes as the API builds them for this page, to show what Starter includes. */
function own(
  id: keyof typeof CHECKS,
  details: Record<string, unknown> = {},
  codeFix?: CodeFix,
): FindingDto {
  const c = CHECKS[id];
  return {
    id,
    checkId: id,
    category: c.category,
    severity: c.severity,
    kind: c.kind,
    source: id === 'tech.links.broken' ? 'link_check' : 'page_fetch',
    title: c.title,
    whatItMeans: c.whatItMeans,
    whyItMatters: c.whyItMatters,
    howToFix: c.howToFix,
    learnMoreUrl: c.learnMoreUrl,
    details,
    codeFixAvailable: !!codeFix,
    ...(codeFix ? { codeFix } : {}),
  };
}

/**
 * ILLUSTRATIVE EXAMPLE ONLY. Shows the report layout for a fictional site on a reserved test
 * domain; it is not the result of scanning any real website. Finding copy comes from the real
 * check catalogue so the sample stays in sync with actual reports.
 */
export const sampleReport: ScanReportDto = {
  id: 'sample',
  targetUrl: 'bakery.example',
  normalizedUrl: 'https://bakery.example/',
  finalUrl: 'https://www.bakery.example/',
  status: 'completed',
  failureCode: null,
  failureMessage: null,
  severityCounts: {},
  createdAt: '2026-10-01T09:29:20Z',
  completedAt: '2026-10-01T09:30:00Z',
  expiresAt: '2027-10-01T09:30:00Z',
  sources: {
    page_fetch: { status: 'ok' },
    psi_mobile: { status: 'ok' },
    psi_desktop: { status: 'ok' },
    link_check: { status: 'ok' },
    robots_sitemap: { status: 'ok' },
  },
  lighthouse: {
    mobile: {
      scores: { performance: 54, accessibility: 81, seo: 83, bestPractices: 92 },
      metrics: {},
      fetchedAt: '2026-10-01T09:30:00Z',
    },
    desktop: {
      scores: { performance: 88, accessibility: 81, seo: 83, bestPractices: 92 },
      metrics: {},
      fetchedAt: '2026-10-01T09:30:00Z',
    },
  },
  passedChecks: [
    'seo.title.missing',
    'seo.h1.missing',
    'seo.sitemap.missing',
    'tech.https.missing',
    'tech.viewport.missing',
  ],
  findings: [
    own('tech.links.broken', {
      count: 3,
      broken: [
        { url: 'https://www.bakery.example/menu/seasonal', status: 404 },
        { url: 'https://www.bakery.example/order-online', status: 404 },
        { url: 'https://partner.example/offer', status: 500 },
      ],
    }),
    {
      id: 'lcp',
      checkId: 'lighthouse.largest-contentful-paint',
      category: 'performance',
      severity: 'high',
      kind: 'measured',
      source: 'psi_mobile',
      title: 'Largest Contentful Paint: 4.8 s',
      whatItMeans:
        'Largest Contentful Paint (LCP) measures when the biggest piece of content on screen (usually a hero image or heading) finishes loading. Google recommends 2.5 seconds or less.',
      whyItMatters:
        'Slow pages lose visitors, especially on mobile connections, and page speed is one of the signals search engines use.',
      howToFix: [
        'Compress the main image and serve it in a modern format such as WebP or AVIF, at the size it’s displayed.',
        'Don’t lazy-load the main image; consider fetchpriority="high" on it.',
        'Remove or defer render-blocking scripts and styles at the top of the page.',
      ],
      learnMoreUrl:
        'https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint/',
      details: { measured: '4.8 s', strategy: 'mobile' },
      codeFixAvailable: false,
    },
    own(
      'seo.meta_description.missing',
      {},
      {
        snippets: [
          {
            label: 'In the page’s <head>',
            language: 'html',
            code: '<meta name="description" content="One or two sentences that sum up this page and give people a reason to click.">',
          },
        ],
        note: 'Aim for 50–160 characters, written for people rather than keywords.',
      },
    ),
    own(
      'a11y.image_alt.missing',
      { count: 6, examples: ['/img/loaf.jpg', '/img/croissant.jpg', '/img/shop.jpg'] },
      {
        snippets: [
          {
            label: 'Images that carry meaning',
            language: 'html',
            code: '<img src="/img/loaf.jpg" alt="Describe what this image shows">\n<img src="/img/croissant.jpg" alt="Describe what this image shows">\n<img src="/img/shop.jpg" alt="Describe what this image shows">',
          },
          {
            label: 'Purely decorative images',
            language: 'html',
            code: '<img src="/img/loaf.jpg" alt="">',
          },
        ],
      },
    ),
    own(
      'tech.hsts.missing',
      {},
      {
        snippets: [
          {
            label: 'nginx (inside the HTTPS server block)',
            language: 'nginx',
            code: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
          },
          {
            label: 'Apache',
            language: 'apache',
            code: 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
          },
        ],
        note: 'Only keep includeSubDomains if every subdomain serves HTTPS.',
      },
    ),
    own('tech.favicon.missing'),
  ],
};
