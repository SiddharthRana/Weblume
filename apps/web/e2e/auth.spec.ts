import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

// Requires a build made with `pnpm build:e2e` (Supabase URL http://localhost:54321). Supabase Auth and
// the Weblume API are mocked at the network layer.
const SB = 'http://localhost:54321';
const API = 'http://localhost:4000';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const ACCESS_TOKEN = `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', exp: 9999999999 })}.sig`;
const user = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'asha@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-01T00:00:00Z',
};
const session = () => ({
  access_token: ACCESS_TOKEN,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'refresh-token',
  user,
});

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: cors,
    body: JSON.stringify(body),
  });

const account = (over: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: 'asha@example.com',
  displayName: null,
  createdAt: '2026-10-01T00:00:00Z',
  plan: { id: 'free', name: 'Free', paid: false, source: 'default' },
  entitlements: {
    scansPerPeriod: 5,
    quotaPeriod: 'calendar_month',
    retentionDays: 30,
    lighthouseData: true,
    comparison: false,
    pdfExport: false,
    shareLinks: false,
  },
  usage: {
    used: 2,
    limit: 5,
    periodStart: '2026-10-01T00:00:00Z',
    resetsAt: '2026-11-01T00:00:00Z',
  },
  subscriptions: [],
  ...over,
});

interface Calls {
  supabase: { path: string; body: unknown }[];
  api: { method: string; path: string; auth?: string; scanToken?: string; body?: unknown }[];
}

async function mockBackends(
  page: Page,
  opts: { loginFails?: boolean; signupSession?: boolean } = {},
): Promise<Calls> {
  const calls: Calls = { supabase: [], api: [] };
  await page.route(`${SB}/auth/v1/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const path =
      url.pathname.replace('/auth/v1', '') +
      (url.searchParams.get('grant_type') ? `?${url.searchParams.get('grant_type')}` : '');
    calls.supabase.push({ path, body: req.postDataJSON?.() ?? null });
    if (path === '/token?password') {
      return opts.loginFails
        ? json(route, 400, {
            code: 'invalid_credentials',
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
            message: 'Invalid login credentials',
          })
        : json(route, 200, session());
    }
    if (path === '/token?pkce') return json(route, 200, session());
    if (path === '/signup')
      return json(
        route,
        200,
        opts.signupSession
          ? session()
          : { ...user, identities: [{}], confirmation_sent_at: new Date().toISOString() },
      );
    if (path === '/recover') return json(route, 200, {});
    if (path === '/logout') return route.fulfill({ status: 204, headers: cors });
    if (path === '/user') return json(route, 200, user);
    return json(route, 404, {});
  });
  await page.route(`${API}/v1/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const h = req.headers();
    calls.api.push({
      method: req.method(),
      path: url.pathname + url.search,
      auth: h.authorization,
      scanToken: h['x-scan-token'],
      body: req.postDataJSON?.() ?? undefined,
    });
    if (url.pathname === '/v1/me' && req.method() === 'GET') return json(route, 200, account());
    if (url.pathname === '/v1/me' && req.method() === 'PATCH')
      return json(
        route,
        200,
        account({ displayName: (req.postDataJSON() as { displayName: string }).displayName }),
      );
    if (url.pathname === '/v1/me' && req.method() === 'DELETE')
      return json(route, 200, { status: 'deleted' });
    if (url.pathname === '/v1/me/export') {
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify({ format: 'weblume-export' }),
      });
    }
    if (url.pathname === '/v1/scans' && req.method() === 'GET') {
      const q = url.searchParams.get('q');
      const items = [
        {
          id: '44444444-4444-4444-8444-444444444444',
          targetUrl: 'example.com',
          normalizedUrl: 'https://example.com/',
          finalUrl: 'https://example.com/',
          status: 'completed',
          failureCode: null,
          failureMessage: null,
          severityCounts: { high: 2 },
          createdAt: '2026-10-29T10:00:00Z',
          completedAt: '2026-10-29T10:01:00Z',
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          targetUrl: 'shop.example.com',
          normalizedUrl: 'https://shop.example.com/',
          finalUrl: null,
          status: 'failed',
          failureCode: 'dns_failure',
          failureMessage: 'x',
          severityCounts: {},
          createdAt: '2026-10-28T10:00:00Z',
          completedAt: null,
        },
      ].filter((s) => !q || s.normalizedUrl.includes(q));
      return json(route, 200, { items, nextCursor: null });
    }
    if (url.pathname.endsWith('/claim')) return json(route, 200, {});
    return json(route, 404, { statusCode: 404, code: 'not_found', message: 'Not found' });
  });
  return calls;
}

async function logIn(page: Page, next = '') {
  await page.goto(`/login${next}`);
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Password').fill('Correct-horse-1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

const alertIn = (page: Page) => page.getByRole('main').getByRole('alert');

test.describe('sign up', () => {
  test('validates the password and asks the user to confirm their email', async ({ page }) => {
    const calls = await mockBackends(page);
    await page.goto('/signup');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/Your password needs at least 10 characters/)).toBeVisible();
    expect(calls.supabase).toHaveLength(0);
    await page.getByLabel('Password').fill('Correct-horse-1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    const signup = calls.supabase.find((c) => c.path === '/signup')!;
    expect(signup.body).toMatchObject({ email: 'asha@example.com', password: 'Correct-horse-1' });
  });

  test('has no detectable accessibility violations', async ({ page }) => {
    await page.goto('/signup');
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('log in', () => {
  test('shows a generic error for bad credentials', async ({ page }) => {
    await mockBackends(page, { loginFails: true });
    await logIn(page);
    await expect(alertIn(page)).toHaveText('Incorrect email or password.');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs in, shows the dashboard with plan and usage, and sends the token to the API', async ({
    page,
  }) => {
    const calls = await mockBackends(page);
    await logIn(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Free plan' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Scans used this period' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    );
    await expect(page.getByText('3 left')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://example.com/' })).toBeVisible();
    expect(calls.api.find((c) => c.path === '/v1/me')!.auth).toBe(`Bearer ${ACCESS_TOKEN}`);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  test('header switches to signed-in links', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop header');
    await mockBackends(page);
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
    await logIn(page);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Account' })).toBeVisible();
  });

  test('redirects signed-out users from the dashboard to log in and back', async ({ page }) => {
    await mockBackends(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login?next=%2Fdashboard');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password').fill('Correct-horse-1');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('ignores unsafe ?next= redirects', async ({ page }) => {
    await mockBackends(page);
    await logIn(page, '?next=//evil.example/steal');
    await expect(page).toHaveURL('/dashboard');
  });

  test('claims guest scans from this device after signing in', async ({ page }) => {
    const calls = await mockBackends(page);
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem(
        'weblume.scans.v1',
        JSON.stringify([
          {
            id: '66666666-6666-4666-8666-666666666666',
            url: 'https://example.com/',
            createdAt: '2026-10-30T00:00:00Z',
            scanToken: 'guest-tok',
          },
        ]),
      ),
    );
    await logIn(page);
    await expect(page).toHaveURL('/dashboard');
    await expect.poll(() => calls.api.find((c) => c.path.endsWith('/claim'))).toBeTruthy();
    const claim = calls.api.find((c) => c.path.endsWith('/claim'))!;
    expect(claim).toMatchObject({
      method: 'POST',
      path: '/v1/scans/66666666-6666-4666-8666-666666666666/claim',
      scanToken: 'guest-tok',
    });
    expect(claim.auth).toBe(`Bearer ${ACCESS_TOKEN}`);
    // The token is dropped locally once claimed.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('weblume.scans.v1')))
      .not.toContain('guest-tok');
  });
});

test.describe('password reset', () => {
  test('sends a reset email without revealing whether the account exists', async ({ page }) => {
    const calls = await mockBackends(page);
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('maybe@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('If an account exists for that email')).toBeVisible();
    expect(calls.supabase.some((c) => c.path === '/recover')).toBe(true);
  });

  test('sets a new password from the emailed link', async ({ page }) => {
    const calls = await mockBackends(page);
    // Requesting the reset stores the PKCE verifier used to exchange the emailed code.
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('If an account exists')).toBeVisible();
    await page.goto('/auth/reset-password?code=recovery-code');
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('New-password-9');
    await page.getByLabel('Confirm new password').fill('Different-9xyz');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(alertIn(page)).toHaveText('The passwords don’t match.');
    await page.getByLabel('Confirm new password').fill('New-password-9');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page).toHaveURL('/dashboard?passwordUpdated=1');
    await expect(page.getByText('Your password has been updated.')).toBeVisible();
    expect(calls.supabase.some((c) => c.path === '/token?pkce')).toBe(true);
    expect(calls.supabase.find((c) => c.path === '/user' && c.body)?.body).toMatchObject({
      password: 'New-password-9',
    });
  });

  test('explains an expired reset link', async ({ page }) => {
    await mockBackends(page);
    await page.goto('/auth/reset-password');
    await expect(page.getByRole('heading', { name: 'Reset link expired' })).toBeVisible();
  });
});

test('callback page explains a failed link', async ({ page }) => {
  await mockBackends(page);
  await page.goto('/auth/callback?error=access_denied&error_description=Email+link+is+invalid');
  await expect(
    page.getByRole('heading', { name: 'Couldn’t sign you in from that link' }),
  ).toBeVisible();
});

test('Google sign-in button is offered when enabled', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test.describe('account settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackends(page);
    await logIn(page, '?next=%2Faccount');
    await expect(page).toHaveURL('/account');
  });

  test('shows plan and usage and saves the display name', async ({ page }) => {
    await expect(page.getByText('5 scans per period')).toBeVisible();
    await page.getByLabel('Display name').fill('Asha');
    await page.getByRole('button', { name: 'Save name' }).click();
    await expect(page.getByRole('main').getByText('Saved.')).toBeVisible();
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  test('downloads a data export', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my data' }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^weblume-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  test('requires typing DELETE, then deletes and signs out', async ({ page }) => {
    await page.getByRole('button', { name: 'Permanently delete my account' }).click();
    await expect(page.getByText('Type DELETE (in capitals) to confirm.')).toBeVisible();
    await page.getByLabel('Type "DELETE" to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Permanently delete my account' }).click();
    await expect(page).toHaveURL('/?accountDeleted=deleted');
    await expect(page.getByText('Your account and its data have been deleted.')).toBeVisible();
  });
});

test('signed-in history lists account scans with search', async ({ page }) => {
  const calls = await mockBackends(page);
  await logIn(page, '?next=%2Fhistory');
  await expect(page.getByRole('link', { name: 'https://shop.example.com/' })).toBeVisible();
  await page.getByLabel('Search scans by address').fill('shop');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('link', { name: 'https://example.com/' })).toHaveCount(0);
  expect(calls.api.some((c) => c.path.includes('q=shop'))).toBe(true);
});

test('logging out from a protected page goes home, not to the login page', async ({ page }) => {
  await mockBackends(page);
  await logIn(page, '?next=%2Faccount');
  await expect(page).toHaveURL('/account');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/');
});
