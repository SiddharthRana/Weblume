import AxeBuilder from '@axe-core/playwright';
import { type Page, type Route } from '@playwright/test';

// Requires a build made with `pnpm build:e2e` (Supabase URL http://localhost:54321). Supabase Auth and
// the Weblume API are mocked at the network layer.
export const SB = 'http://localhost:54321';
export const API = 'http://localhost:4000';
export const USER_ID = '33333333-3333-4333-8333-333333333333';
export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

export const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const ACCESS_TOKEN = `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', exp: 9999999999 })}.sig`;
export const user = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'asha@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-01T00:00:00Z',
};
export const session = () => ({
  access_token: ACCESS_TOKEN,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'refresh-token',
  user,
});

export const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: cors,
    body: JSON.stringify(body),
  });

export const account = (over: Record<string, unknown> = {}) => ({
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
    codeFixes: false,
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

export interface Calls {
  supabase: { path: string; body: unknown }[];
  api: { method: string; path: string; auth?: string; scanToken?: string; body?: unknown }[];
}

export type ApiOverride = (route: Route, url: URL, method: string) => Promise<boolean> | boolean;

export async function mockBackends(
  page: Page,
  opts: { loginFails?: boolean; signupSession?: boolean; api?: ApiOverride } = {},
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
    if (opts.api && (await opts.api(route, url, req.method()))) return;
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

export async function logIn(page: Page, next = '') {
  await page.goto(`/login${next}`);
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Password').fill('Correct-horse-1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

/**
 * An axe builder for the page at rest. Axe's colour-contrast rule samples rendered pixels, so text
 * still fading in (`animate-page`, `animate-rise`, `.reveal`) reads as low contrast at random. The
 * site switches all of that motion off for reduced-motion users, so emulate that and wait for any
 * finite animation still running: axe then checks the final colours, with every rule unchanged.
 */
export async function axe(page: Page): Promise<AxeBuilder> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  return new AxeBuilder({ page });
}
