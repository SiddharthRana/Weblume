import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CHECKS, compareReports, type FindingDto, type ScanReportDto } from '@weblume/shared';
import { account, json, logIn, mockBackends, type ApiOverride } from './support';

const OLD = '44444444-4444-4444-8444-444444444444';
const NEW = '66666666-6666-4666-8666-666666666666';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';
const SHARE_ID = '77777777-7777-4777-8777-777777777777';

function finding(id: keyof typeof CHECKS): FindingDto {
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
    details: {},
  };
}

function report(id: string, createdAt: string, findings: FindingDto[], performance: number) {
  return {
    id,
    targetUrl: 'example.com',
    normalizedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',
    status: 'completed',
    failureCode: null,
    failureMessage: null,
    severityCounts: {},
    createdAt,
    completedAt: createdAt,
    expiresAt: '2027-10-01T00:00:00Z',
    sources: { page_fetch: { status: 'ok' }, psi_mobile: { status: 'ok' } },
    lighthouse: {
      mobile: {
        scores: { performance, accessibility: 90, seo: 92, bestPractices: 100 },
        metrics: {},
        fetchedAt: createdAt,
      },
    },
    passedChecks: [],
    findings,
  } satisfies ScanReportDto;
}

const older = report(
  OLD,
  '2026-10-29T10:00:00Z',
  [finding('seo.title.missing'), finding('seo.meta_description.missing')],
  48,
);
const newer = report(
  NEW,
  '2026-10-30T10:00:00Z',
  [finding('seo.meta_description.missing'), finding('tech.hsts.missing')],
  71,
);

const starter = account({
  plan: { id: 'starter', name: 'Starter', paid: true, source: 'subscription' },
  entitlements: {
    scansPerPeriod: 60,
    quotaPeriod: 'billing_period',
    retentionDays: 365,
    lighthouseData: true,
    comparison: true,
    pdfExport: true,
    shareLinks: true,
  },
});

function reportsApi(opts: { me?: unknown; shares?: object[]; shared?: [number, unknown] } = {}) {
  const shares = opts.shares ?? [];
  const handler: ApiOverride = (route, url, method) => {
    const p = url.pathname;
    const send = (s: number, b: unknown) => json(route, s, b).then(() => true);
    if (p === '/v1/me' && method === 'GET') return send(200, opts.me ?? starter);
    if (p === `/v1/scans/${NEW}`) return send(200, newer);
    if (p === `/v1/scans/${OLD}`) return send(200, older);
    if (p === `/v1/scans` && method === 'GET')
      return send(200, { items: [newer, older], nextCursor: null });
    if (p === '/v1/compare') {
      const r = compareReports(newer, older);
      return send(200, r.ok ? r.comparison : {});
    }
    if (p === `/v1/scans/${NEW}/report.pdf`)
      return route
        .fulfill({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-expose-headers': 'content-disposition',
            'content-type': 'application/pdf',
            'content-disposition': 'attachment; filename="weblume-example.com-2026-10-30.pdf"',
          },
          body: Buffer.from('%PDF-1.3\n%%EOF\n'),
        })
        .then(() => true);
    if (p === `/v1/scans/${NEW}/shares` && method === 'GET') return send(200, { items: shares });
    if (p === `/v1/scans/${NEW}/shares` && method === 'POST') {
      const share = {
        id: SHARE_ID,
        scanId: NEW,
        createdAt: '2026-10-30T11:00:00Z',
        expiresAt: '2026-11-29T11:00:00Z',
        revokedAt: null,
        active: true,
      };
      shares.splice(0, shares.length, share);
      return send(201, { share, token: TOKEN, url: `http://localhost:3100/r/${TOKEN}` });
    }
    if (p === `/v1/shares/${SHARE_ID}` && method === 'DELETE') {
      shares.splice(0, shares.length);
      return send(200, {});
    }
    if (p === `/v1/shared/${TOKEN}`) {
      const [s, b] = opts.shared ?? [
        200,
        { report: newer, shareExpiresAt: '2026-11-29T11:00:00Z' },
      ];
      return send(s, b);
    }
    return false;
  };
  return handler;
}

async function signedIn(page: Page, api: ApiOverride) {
  const calls = await mockBackends(page, { api });
  await logIn(page);
  await expect(page).toHaveURL(/\/dashboard/);
  return calls;
}

test.describe('report actions', () => {
  test('free plan sees what Starter adds instead of the actions', async ({ page }) => {
    await signedIn(page, reportsApi({ me: account() }));
    await page.goto(`/scan/${NEW}`);
    await expect(page.getByText('Need to send this to a client?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
  });

  test('downloads the PDF with the signed-in token', async ({ page }) => {
    const calls = await signedIn(page, reportsApi());
    await page.goto(`/scan/${NEW}`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    expect((await download).suggestedFilename()).toBe('weblume-example.com-2026-10-30.pdf');
    const call = calls.api.find((c) => c.path === `/v1/scans/${NEW}/report.pdf`);
    expect(call?.auth).toMatch(/^Bearer /);
  });

  test('creates, shows once and turns off a share link', async ({ page }) => {
    const calls = await signedIn(page, reportsApi());
    await page.goto(`/scan/${NEW}`);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText('No active links.')).toBeVisible();
    await page.getByLabel('Link works for').selectOption('90');
    await page.getByRole('button', { name: 'Create link' }).click();
    await expect(page.getByLabel('Share link')).toHaveValue(`http://localhost:3100/r/${TOKEN}`);
    await expect(page.getByText('we only show it once')).toBeVisible();
    expect(calls.api.find((c) => c.method === 'POST' && c.path.endsWith('/shares'))?.body).toEqual({
      expiresInDays: 90,
    });
    await expect(page.getByText(/expires Nov 29, 2026/)).toBeVisible();
    await page.getByRole('button', { name: /Turn off/ }).click();
    await expect(page.getByText('No active links.')).toBeVisible();
    expect(
      calls.api.some((c) => c.method === 'DELETE' && c.path === `/v1/shares/${SHARE_ID}`),
    ).toBe(true);
  });
});

test.describe('comparison', () => {
  test('picks an earlier scan of the same address and shows what changed', async ({ page }) => {
    await signedIn(page, reportsApi());
    await page.goto(`/scan/${NEW}`);
    await page.getByRole('link', { name: 'Compare with another scan' }).click();
    await expect(page.getByRole('heading', { name: 'https://example.com/' })).toBeVisible();
    await page.getByRole('button', { name: /Oct 29, 2026/ }).click();
    await expect(page).toHaveURL(new RegExp(`/compare\\?base=${OLD}&target=${NEW}`));
    await expect(page.getByRole('heading', { name: 'Resolved (1)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New issues (1)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Still open (1)' })).toBeVisible();
    await expect(page.getByText(CHECKS['seo.title.missing'].title, { exact: true })).toBeVisible();
    await expect(page.getByText(CHECKS['tech.hsts.missing'].title, { exact: true })).toBeVisible();
    const perf = page.getByRole('row', { name: /Performance/ });
    await expect(perf).toContainText('48');
    await expect(perf).toContainText('71');
    await expect(perf).toContainText('+23');
  });

  test('explains the upgrade when the plan lacks comparison', async ({ page }) => {
    const api: ApiOverride = (route, url) =>
      url.pathname === '/v1/compare'
        ? json(route, 403, {
            statusCode: 403,
            code: 'upgrade_required',
            message: 'Comparing scans is part of the Starter plan.',
          }).then(() => true)
        : reportsApi({ me: account() })(route, url, 'GET');
    await signedIn(page, api);
    await page.goto(`/compare?base=${OLD}&target=${NEW}`);
    await expect(page.getByText('Comparing scans is part of the Starter plan.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See plans' })).toBeVisible();
  });

  test('has no automatically detectable WCAG 2.2 AA violations', async ({ page }) => {
    await signedIn(page, reportsApi());
    await page.goto(`/compare?base=${OLD}&target=${NEW}`);
    await expect(page.getByRole('heading', { name: 'Resolved (1)' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('shared report page', () => {
  test('shows a read-only report without signing in, and is not indexable', async ({ page }) => {
    const calls = await mockBackends(page, { api: reportsApi() });
    const res = await page.goto(`/r/${TOKEN}`);
    expect(res?.headers()['referrer-policy']).toBe('no-referrer');
    expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    await expect(page.getByText('Shared report (read-only).')).toBeVisible();
    await expect(page.getByText('the link works until November 29, 2026')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'https://example.com/' }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
    expect(calls.api.find((c) => c.path === `/v1/shared/${TOKEN}`)?.auth).toBeUndefined();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('explains expired or revoked links', async ({ page }) => {
    await mockBackends(page, {
      api: reportsApi({ shared: [404, { statusCode: 404, code: 'not_found', message: 'x' }] }),
    });
    await page.goto(`/r/${TOKEN}`);
    await expect(page.getByRole('heading', { name: 'This link doesn’t work' })).toBeVisible();
  });
});
