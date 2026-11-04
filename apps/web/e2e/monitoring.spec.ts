import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { json, logIn, mockBackends, type ApiOverride } from './support';

const SCAN = '44444444-4444-4444-8444-444444444444';
const MONITOR = '88888888-8888-4888-8888-888888888888';

const report = {
  id: SCAN,
  targetUrl: 'example.com',
  normalizedUrl: 'https://example.com/',
  finalUrl: 'https://example.com/',
  status: 'completed',
  failureCode: null,
  failureMessage: null,
  severityCounts: {},
  createdAt: '2026-10-29T10:00:00Z',
  completedAt: '2026-10-29T10:01:00Z',
  expiresAt: '2027-10-01T00:00:00Z',
  sources: { page_fetch: { status: 'ok' } },
  lighthouse: null,
  passedChecks: [],
  findings: [],
};

function monitor(over: Record<string, unknown> = {}) {
  return {
    id: MONITOR,
    targetUrl: 'example.com',
    normalizedUrl: 'https://example.com/',
    frequency: 'weekly',
    alert: 'any_change',
    enabled: true,
    nextRunAt: '2026-11-05T10:00:00Z',
    lastRunAt: null,
    lastDigestAt: null,
    lastSkipReason: null,
    lastScan: { ...report, sources: undefined, findings: undefined },
    createdAt: '2026-10-29T10:00:00Z',
    ...over,
  };
}

/** A small in-memory monitors API. */
function monitorsApi(opts: { items?: ReturnType<typeof monitor>[]; limit?: number } = {}) {
  const items = opts.items ?? [];
  const limit = opts.limit ?? 1;
  const handler: ApiOverride = (route, url, method) => {
    const p = url.pathname;
    const send = (s: number, b: unknown) => json(route, s, b).then(() => true);
    if (p === `/v1/scans/${SCAN}`) return send(200, report);
    if (p === '/v1/monitors' && method === 'GET')
      return send(200, { items, limit, fastestFrequency: limit > 1 ? 'daily' : 'weekly' });
    if (p === '/v1/monitors' && method === 'POST') {
      if (items.length >= limit)
        return send(403, {
          statusCode: 403,
          code: 'monitor_limit_reached',
          message: 'The Free plan can monitor 1 site.',
        });
      const body = route.request().postDataJSON() as { url: string };
      const host = body.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const m = monitor({ targetUrl: body.url, normalizedUrl: `https://${host}/`, lastScan: null });
      items.push(m);
      return send(201, m);
    }
    if (p === `/v1/monitors/${MONITOR}` && method === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      Object.assign(items[0]!, body);
      return send(200, items[0]);
    }
    if (p === `/v1/monitors/${MONITOR}` && method === 'DELETE') {
      items.splice(0, items.length);
      return route
        .fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } })
        .then(() => true);
    }
    if (p === '/v1/monitors/pause' && method === 'POST') {
      const { token } = route.request().postDataJSON() as { token: string };
      return token === 'good-token'
        ? send(200, { targetUrl: 'https://example.com/', alreadyPaused: false })
        : send(404, {
            statusCode: 404,
            code: 'not_found',
            message: 'This link doesn’t work any more. The site may no longer be monitored.',
          });
    }
    return false;
  };
  return { handler, items };
}

async function signedIn(page: Page, api: ApiOverride) {
  const calls = await mockBackends(page, { api });
  await logIn(page);
  await expect(page).toHaveURL(/\/dashboard/);
  return calls;
}

test.describe('monitoring', () => {
  test('adds a site from the dashboard, changes settings, pauses and removes it', async ({
    page,
  }) => {
    const { handler } = monitorsApi();
    const calls = await signedIn(page, handler);
    const section = page.getByRole('region', { name: 'Monitoring' });
    await expect(section.getByText('Scheduled scans don’t use your monthly scans')).toBeVisible();
    await expect(section.getByText('Starter monitors up to 5 sites every day')).toBeVisible();

    await section.getByLabel('Monitor a site').fill('example.com');
    await section.getByRole('button', { name: 'Start monitoring' }).click();
    const list = section.getByRole('list', { name: 'Monitored sites' });
    await expect(list.getByRole('listitem')).toContainText('https://example.com/');
    await expect(list.getByText('Active')).toBeVisible();
    expect(calls.api.find((c) => c.method === 'POST' && c.path === '/v1/monitors')?.body).toEqual({
      url: 'example.com',
    });
    // The Free plan's one site is used: no more add form.
    await expect(section.getByLabel('Monitor another site')).toHaveCount(0);

    await section.getByRole('combobox', { name: 'Email me when' }).click();
    await page.getByRole('option', { name: 'New issues appear' }).click();
    await expect
      .poll(() => calls.api.filter((c) => c.method === 'PATCH').at(-1)?.body)
      .toEqual({
        alert: 'new_findings',
      });

    await section.getByRole('button', { name: /^Pause/ }).click();
    await expect(list.getByText('Paused', { exact: true })).toBeVisible();
    await expect(list.getByText('No scans or emails while paused.')).toBeVisible();
    await section.getByRole('button', { name: /^Resume/ }).click();
    await expect(list.getByText('Active')).toBeVisible();

    await section.getByRole('button', { name: /^Stop monitoring/ }).click();
    await expect(section.getByRole('list', { name: 'Monitored sites' })).toHaveCount(0);
    await expect(section.getByLabel('Monitor a site')).toBeVisible();
  });

  test('explains why a site was paused after a downgrade', async ({ page }) => {
    const { handler } = monitorsApi({
      items: [monitor({ enabled: false, lastSkipReason: 'plan_limit', frequency: 'daily' })],
    });
    await signedIn(page, handler);
    await expect(page.getByText('Paused: your plan includes fewer monitored sites.')).toBeVisible();
  });

  test('"Monitor this site" on a report', async ({ page }) => {
    const { handler } = monitorsApi();
    await signedIn(page, handler);
    await page.goto(`/scan/${SCAN}`);
    await page.getByRole('button', { name: 'Monitor this site' }).click();
    await expect(page.getByText('You’re monitoring this site')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage' })).toHaveAttribute(
      'href',
      '/dashboard#monitoring',
    );
  });

  test('a report of an already monitored site says so', async ({ page }) => {
    const { handler } = monitorsApi({ items: [monitor()] });
    await signedIn(page, handler);
    await page.goto(`/scan/${SCAN}`);
    await expect(page.getByText('You’re monitoring this site')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Monitor this site' })).toHaveCount(0);
  });

  test('pauses from the email link without signing in, only after a click', async ({ page }) => {
    const { handler } = monitorsApi({ items: [monitor()] });
    const calls = await mockBackends(page, { api: handler });
    await page.goto('/monitoring/pause?token=good-token');
    await expect(page.getByRole('heading', { name: 'Pause monitoring' })).toBeVisible();
    expect(calls.api.filter((c) => c.path === '/v1/monitors/pause')).toHaveLength(0);
    await page.getByRole('button', { name: 'Pause monitoring' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Monitoring is paused for https://example.com/',
    );

    await page.goto('/monitoring/pause?token=bad');
    await page.getByRole('button', { name: 'Pause monitoring' }).click();
    await expect(page.getByText('This link doesn’t work any more')).toBeVisible();
  });

  test('dashboard monitoring section meets WCAG 2.2 AA', async ({ page }) => {
    const { handler } = monitorsApi({ items: [monitor()], limit: 5 });
    await signedIn(page, handler);
    await expect(page.getByRole('list', { name: 'Monitored sites' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('#monitoring')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
