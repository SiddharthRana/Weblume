import type { FindingView } from '@/components/report/finding-card';

/**
 * ILLUSTRATIVE EXAMPLE ONLY. This fixture shows the report layout. It describes a fictional site on
 * a reserved test domain and is not the result of scanning any real website.
 */
export const sampleReport = {
  targetUrl: 'https://bakery.example',
  finalUrl: 'https://www.bakery.example/',
  scannedAt: '2026-10-01T09:30:00Z',
  sources: [
    { name: 'Page fetch & HTML checks', status: 'ok' },
    { name: 'Lighthouse via PageSpeed Insights (mobile)', status: 'ok' },
    { name: 'Lighthouse via PageSpeed Insights (desktop)', status: 'ok' },
    { name: 'Link check (first 50 links)', status: 'ok' },
    { name: 'robots.txt & sitemap', status: 'ok' },
  ],
  lighthouse: {
    mobile: { performance: 54, accessibility: 81, seo: 83, bestPractices: 92 },
    desktop: { performance: 88, accessibility: 81, seo: 83, bestPractices: 92 },
  },
  findings: [
    {
      id: 'tech.links.broken',
      severity: 'high',
      category: 'Technical health',
      title: '3 links on this page are broken',
      whatItMeans:
        'Some links point to pages that return an error (404 Not Found or 500 Server Error).',
      whyItMatters:
        'Visitors who click them hit a dead end, and search engines treat many broken links as a sign of a poorly maintained site.',
      howToFix: [
        'Update each link to the correct address, or remove it.',
        'If a page moved, add a permanent (301) redirect from the old address.',
      ],
      evidence: '/menu/seasonal → 404\n/order-online → 404\nhttps://partner.example/offer → 500',
    },
    {
      id: 'lighthouse.largest-contentful-paint',
      severity: 'high',
      category: 'Performance (measured)',
      title: 'Main content takes 4.8 s to appear on mobile',
      whatItMeans:
        'Largest Contentful Paint measures when the biggest element on screen (usually a hero image or heading) finishes loading.',
      whyItMatters:
        'Google recommends 2.5 s or less. Slow pages lose visitors, especially on mobile data.',
      howToFix: [
        'Compress the hero image and serve it in a modern format such as WebP or AVIF.',
        'Add width and height attributes and avoid lazy-loading the hero image.',
        'Remove render-blocking scripts from the top of the page.',
      ],
      evidence: 'Measured by Lighthouse (mobile, simulated slow 4G): LCP 4.8 s',
    },
    {
      id: 'seo.meta-description.missing',
      severity: 'medium',
      category: 'SEO',
      title: 'Page has no meta description',
      whatItMeans:
        'The meta description is the short summary search engines may show under your page title in results.',
      whyItMatters:
        'Without one, search engines pick text from the page themselves, which is often less persuasive.',
      howToFix: [
        'Add <meta name="description" content="…"> inside <head>.',
        'Write 50–160 characters describing the page in a way that makes people want to click.',
      ],
    },
    {
      id: 'a11y.image-alt',
      severity: 'medium',
      category: 'Accessibility (automated)',
      title: '6 images have no alternative text',
      whatItMeans:
        'Alternative (alt) text describes an image for people who use screen readers or can’t load images.',
      whyItMatters:
        'Without it, blind and low-vision visitors miss the information those images carry.',
      howToFix: [
        'Add a short alt attribute describing each meaningful image, e.g. alt="Fresh sourdough loaves".',
        'Use alt="" for purely decorative images so screen readers skip them.',
      ],
    },
    {
      id: 'tech.hsts.missing',
      severity: 'low',
      category: 'Technical health',
      title: 'HTTPS is not enforced with HSTS',
      whatItMeans:
        'The Strict-Transport-Security header tells browsers to always use the secure version of your site.',
      whyItMatters:
        'Without it, a visitor’s first request can be made over insecure HTTP before being redirected.',
      howToFix: [
        'Ask your host or CDN to enable HSTS, starting with a short max-age and increasing it once confirmed.',
      ],
    },
    {
      id: 'seo.sitemap.present',
      severity: 'info',
      category: 'SEO',
      title: 'Sitemap found and readable',
      whatItMeans: 'A sitemap lists the pages you want search engines to discover.',
      whyItMatters: 'This is good — it helps search engines find new and updated pages.',
      howToFix: ['No action needed. Keep it updated when you add pages.'],
    },
  ] satisfies FindingView[],
};
