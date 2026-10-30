import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { CHECKS, type FindingDto, type ScanReportDto } from '@weblume/shared';

// The web build talks to NEXT_PUBLIC_API_URL (default http://localhost:4000). These tests mock that API
// at the network layer, so they exercise the real UI against controlled responses.
const API = 'http://localhost:4000';
const ID = '11111111-1111-4111-8111-111111111111';
const RETRY_ID = '22222222-2222-4222-8222-222222222222';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

function finding(id: keyof typeof CHECKS, details: Record<string, unknown> = {}): FindingDto {
  const c = CHECKS[id];
  return {
    id,
    checkId: id,
    category: c.category,
    severity: c.severity,
    kind: c.kind,
    source: 'page_fetch',
    title: c.title,
    whatItMeans: c.whatItMeans,
    whyItMatters: c.whyItMatters,
    howToFix: c.howToFix,
    learnMoreUrl: c.learnMoreUrl,
    details,
  };
}

function report(overrides: Partial<ScanReportDto> = {}): ScanReportDto {
  return {
    id: ID,
    targetUrl: 'example.com',
    normalizedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',
    status: 'completed',
    failureCode: null,
    failureMessage: null,
    severityCounts: { high: 1, medium: 1 },
    createdAt: '2026-10-30T10:00:00Z',
    completedAt: '2026-10-30T10:00:40Z',
    expiresAt: '2026-10-31T10:00:00Z',
    sources: {
      page_fetch: { status: 'ok' },
      psi_mobile: { status: 'ok' },
      psi_desktop: { status: 'ok' },
      link_check: { status: 'ok' },
      robots_sitemap: { status: 'ok' },
    },
    lighthouse: {
      mobile: {
        scores: { performance: 61, accessibility: 88, seo: 92, bestPractices: 100 },
        metrics: {},
        fetchedAt: '2026-10-30T10:00:30Z',
      },
      desktop: {
        scores: { performance: 93, accessibility: 88, seo: 92, bestPractices: 100 },
        metrics: {},
        fetchedAt: '2026-10-30T10:00:30Z',
      },
    },
    passedChecks: ['seo.title.missing', 'tech.https.missing'],
    findings: [
      finding('tech.links.broken', {
        count: 1,
        broken: [{ url: 'https://example.com/old', status: 404 }],
      }),
      finding('seo.meta_description.missing'),
      finding('a11y.html_lang.missing'),
    ],
    ...overrides,
  };
}

// Next.js renders its own role="alert" route announcer, so scope alert lookups to page content.
const alertIn = (page: Page) => page.getByRole('main').getByRole('alert');

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: cors,
    body: JSON.stringify(body),
  });

/** Installs API mocks. `reports` is consumed in order for successive GETs (last one repeats). */
async function mockApi(
  page: Page,
  opts: {
    create?: [number, unknown];
    reports?: [number, unknown][];
    retry?: [number, unknown];
  } = {},
) {
  const calls = { creates: [] as unknown[], gets: 0, getHeaders: [] as Record<string, string>[] };
  const reports = [...(opts.reports ?? [[200, report()]])];
  await page.route(`${API}/v1/scans**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    if (req.method() === 'POST' && url.pathname === '/v1/scans') {
      calls.creates.push(req.postDataJSON());
      const [status, body] = opts.create ?? [
        202,
        { scan: report({ status: 'queued' }), scanToken: 'guest-token-123', deduplicated: false },
      ];
      return json(route, status, body);
    }
    if (req.method() === 'POST' && url.pathname.endsWith('/retry')) {
      const [status, body] = opts.retry ?? [
        202,
        {
          scan: report({ id: RETRY_ID, status: 'queued' }),
          scanToken: 'retry-token',
          deduplicated: false,
        },
      ];
      return json(route, status, body);
    }
    calls.gets++;
    calls.getHeaders.push(req.headers());
    const [status, body] = reports.length > 1 ? reports.shift()! : reports[0]!;
    return json(route, status, body);
  });
  return calls;
}

test.describe('new scan form', () => {
  test('validates the address before calling the API', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto('/scan');
    const input = page.getByLabel('Website address');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(alertIn(page)).toHaveText(/Enter a website address/);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('ftp://example.com');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(alertIn(page)).toHaveText(/Only http:\/\/ and https:\/\//);
    await input.fill('https://example.com:8080');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(alertIn(page)).toHaveText(/standard web ports/);
    expect(calls.creates).toHaveLength(0);
  });

  test('shows API errors such as an exhausted quota', async ({ page }) => {
    await mockApi(page, {
      create: [
        429,
        {
          statusCode: 429,
          code: 'quota_exceeded',
          message: 'Guests can run 1 free scan per day. Create a free account for more scans.',
        },
      ],
    });
    await page.goto('/scan');
    await page.getByLabel('Website address').fill('example.com');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(alertIn(page)).toHaveText(/1 free scan per day/);
  });

  test('handles the API being unreachable', async ({ page }) => {
    await page.route(`${API}/v1/scans**`, (route) => route.abort('connectionrefused'));
    await page.goto('/scan');
    await page.getByLabel('Website address').fill('example.com');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(alertIn(page)).toHaveText(/couldn’t reach Weblume/);
  });

  test('has no detectable accessibility violations', async ({ page }) => {
    await page.goto('/scan');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('scan flow', () => {
  test('starts a scan, shows progress, then the report', async ({ page }) => {
    const calls = await mockApi(page, {
      reports: [
        [200, report({ status: 'queued', findings: [], lighthouse: null, sources: {} })],
        [200, report({ status: 'running', findings: [], lighthouse: null, sources: {} })],
        [200, report()],
      ],
    });
    await page.goto('/scan');
    await page.getByLabel('Website address').fill('  Example.com  ');
    await page.getByRole('button', { name: 'Scan website' }).click();
    await expect(page).toHaveURL(`/scan/${ID}`);
    expect(calls.creates[0]).toEqual({ url: 'https://example.com/' });
    await expect(page.getByRole('status')).toContainText(/Waiting to start|Scan in progress/);
    await expect(page.getByRole('heading', { level: 1, name: 'https://example.com/' })).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(page.getByRole('img', { name: /Performance: 61 out of 100/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start here: top priorities' })).toBeVisible();
    // The guest token is sent so the API can authorise the guest.
    expect(calls.getHeaders.at(-1)!['x-scan-token']).toBe('guest-token-123');

    // Category filter.
    await page.getByRole('button', { name: 'SEO (1)' }).click();
    await expect(page.getByRole('button', { name: 'SEO (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const findingsSection = page.locator('section[aria-labelledby="findings"]');
    await expect(findingsSection.locator('details')).toHaveCount(1);
    await findingsSection.locator('summary').first().click();
    await expect(findingsSection.getByText('How to fix it')).toBeVisible();

    // Broken-link evidence is shown.
    await page.getByRole('button', { name: 'All (3)' }).click();
    await findingsSection.getByText('Some links on this page are broken').click();
    await expect(findingsSection.getByText('https://example.com/old → HTTP 404')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    // History lists the scan on this device.
    await page.goto('/history');
    await expect(page.getByRole('link', { name: 'https://example.com/' })).toBeVisible();
  });

  test('is honest about a partial report without Lighthouse data', async ({ page }) => {
    await mockApi(page, {
      reports: [
        [
          200,
          report({
            status: 'partial',
            lighthouse: null,
            sources: {
              page_fetch: { status: 'ok' },
              psi_mobile: { status: 'failed', reason: 'quota_exceeded' },
              psi_desktop: { status: 'failed', reason: 'timeout' },
              link_check: { status: 'ok' },
              robots_sitemap: { status: 'ok' },
            },
          }),
        ],
      ],
    });
    await page.goto(`/scan/${ID}`);
    await expect(page.getByText(/Some checks couldn’t be completed/)).toBeVisible();
    await expect(page.getByText(/Lighthouse scores aren’t available for this scan/)).toBeVisible();
    await expect(page.getByRole('img', { name: /out of 100/ })).toHaveCount(0);
    await expect(page.getByText(/Daily quota reached/)).toBeVisible();
    await expect(page.getByText(/Didn’t finish in time/)).toBeVisible();
  });

  test('shows a failed scan honestly and retries it', async ({ page }) => {
    await mockApi(page, {
      reports: [
        [
          200,
          report({
            status: 'failed',
            failureCode: 'dns_failure',
            failureMessage: 'We couldn’t find that website. Check the address for typos.',
            findings: [],
            lighthouse: null,
          }),
        ],
      ],
    });
    await page.goto(`/scan/${ID}`);
    await expect(alertIn(page)).toContainText('We couldn’t find that website');
    await expect(page.getByText('no scores or findings have been estimated')).toBeVisible();
    await page.getByRole('button', { name: 'Retry scan' }).click();
    await expect(page).toHaveURL(`/scan/${RETRY_ID}`);
  });

  test('explains when a report is not available', async ({ page }) => {
    await mockApi(page, {
      reports: [[404, { statusCode: 404, code: 'not_found', message: 'Scan not found.' }]],
    });
    await page.goto(`/scan/${ID}`);
    await expect(page.getByRole('heading', { name: 'Report not available' })).toBeVisible();
  });

  test('offers a retry when the API is unreachable', async ({ page }) => {
    let fail = true;
    await page.route(`${API}/v1/scans**`, (route) =>
      fail ? route.abort('connectionrefused') : json(route, 200, report()),
    );
    await page.goto(`/scan/${ID}`);
    await expect(page.getByRole('heading', { name: 'Couldn’t load this report' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'https://example.com/' }),
    ).toBeVisible();
  });

  test('report pages are not indexable', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/scan/${ID}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test('history shows an empty state', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'No scans on this device yet' })).toBeVisible();
});
