import { expect, test, type Page } from '@playwright/test';
import { account, json, logIn, mockBackends, type ApiOverride } from './support';

const config = (enabled = true) => ({
  enabled,
  web: { provider: 'paddle', available: enabled, intervals: ['monthly', 'annual'] },
  googlePlay: {
    available: enabled,
    packageName: 'com.weblume.app',
    subscriptionId: 'weblume_starter',
  },
});

const future = new Date(Date.now() + 20 * 86_400_000).toISOString();
const webSub = {
  provider: 'paddle',
  planId: 'starter',
  status: 'active',
  currentPeriodEnd: future,
  cancelAtPeriodEnd: false,
};
const playSub = {
  provider: 'google_play',
  planId: 'starter',
  status: 'active',
  currentPeriodEnd: future,
  cancelAtPeriodEnd: false,
};
const starter = (subs: object[]) =>
  account({
    plan: { id: 'starter', name: 'Starter', paid: true, source: 'subscription' },
    entitlements: {
      scansPerPeriod: 60,
      quotaPeriod: 'billing_period',
      retentionDays: 365,
      lighthouseData: true,
      comparison: true,
      pdfExport: true,
      codeFixes: true,
      shareLinks: true,
      monitoredSites: 5,
      monitorFrequency: 'daily',
    },
    subscriptions: subs,
  });

function billingApi(opts: {
  enabled?: boolean;
  checkout?: [number, unknown];
  me?: () => unknown;
  portal?: [number, unknown];
}): ApiOverride {
  return (route, url, method) => {
    if (url.pathname === '/v1/billing/config')
      return json(route, 200, config(opts.enabled ?? true)).then(() => true);
    if (url.pathname === '/v1/billing/checkout' && method === 'POST') {
      const [s, b] = opts.checkout ?? [
        200,
        { url: 'http://localhost:3100/checkout/paddle?_ptxn=txn_test' },
      ];
      return json(route, s, b).then(() => true);
    }
    if (url.pathname === '/v1/billing/portal') {
      const [s, b] = opts.portal ?? [200, { url: 'http://localhost:3100/legal/refunds?portal=1' }];
      return json(route, s, b).then(() => true);
    }
    if (url.pathname === '/v1/me' && method === 'GET' && opts.me)
      return json(route, 200, opts.me()).then(() => true);
    return false;
  };
}

const pricingStarter = (page: Page) => page.locator('section[aria-labelledby="plan-starter"]');

test.describe('pricing', () => {
  test('says checkout is coming soon while billing is off', async ({ page }) => {
    await mockBackends(page, { api: billingApi({ enabled: false }) });
    await page.goto('/pricing');
    await expect(pricingStarter(page).getByText('Paid plans are coming soon')).toBeVisible();
  });

  test('asks signed-out visitors to create an account first', async ({ page }) => {
    await mockBackends(page, { api: billingApi({}) });
    await page.goto('/pricing');
    await expect(
      pricingStarter(page).getByRole('link', { name: 'Create an account to subscribe' }),
    ).toHaveAttribute('href', '/signup?next=%2Fpricing');
  });

  test('starts checkout for the chosen interval and redirects to the provider', async ({
    page,
  }) => {
    const calls = await mockBackends(page, { api: billingApi({}) });
    await logIn(page, '?next=%2Fpricing');
    await expect(page).toHaveURL('/pricing');
    await pricingStarter(page)
      .getByRole('button', { name: /Subscribe yearly/ })
      .click();
    await expect(page).toHaveURL(/\/checkout\/paddle\?_ptxn=txn_test/);
    expect(calls.api.find((c) => c.path === '/v1/billing/checkout')?.body).toEqual({
      interval: 'annual',
    });
    // No Paddle client token in the e2e build: the page says so honestly instead of hanging.
    await expect(page.getByRole('heading', { name: 'Checkout couldn’t be opened' })).toBeVisible();
    await expect(page.getByText('You haven’t been charged.')).toBeVisible();
  });

  test('explains when the user is already subscribed', async ({ page }) => {
    await mockBackends(page, {
      api: billingApi({
        checkout: [
          409,
          {
            statusCode: 409,
            code: 'already_subscribed',
            message: 'You already have an active subscription.',
            provider: 'google_play',
          },
        ],
      }),
    });
    await logIn(page, '?next=%2Fpricing');
    await pricingStarter(page).getByRole('button', { name: 'Subscribe monthly' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'You already have an active subscription.',
    );
    await expect(page.getByRole('link', { name: 'Manage your subscription' })).toHaveAttribute(
      'href',
      '/account',
    );
  });
});

test.describe('account subscription', () => {
  test('offers an upgrade to free users when billing is on', async ({ page }) => {
    await mockBackends(page, { api: billingApi({}) });
    await logIn(page, '?next=%2Faccount');
    await expect(page.getByRole('link', { name: 'Upgrade to Starter' })).toHaveAttribute(
      'href',
      '/pricing',
    );
  });

  test('manages a web subscription through the provider portal', async ({ page }) => {
    const calls = await mockBackends(page, { api: billingApi({ me: () => starter([webSub]) }) });
    await logIn(page, '?next=%2Faccount');
    await expect(page.getByText('Starter · Web')).toBeVisible();
    await expect(page.getByText(/Active · renews/)).toBeVisible();
    await page.getByRole('button', { name: 'Manage subscription' }).click();
    await expect(page).toHaveURL(/portal=1/);
    expect(calls.api.some((c) => c.path === '/v1/billing/portal' && c.method === 'POST')).toBe(
      true,
    );
  });

  test('links Google Play subscriptions to Play and warns about double subscriptions', async ({
    page,
  }) => {
    await mockBackends(page, { api: billingApi({ me: () => starter([webSub, playSub]) }) });
    await logIn(page, '?next=%2Faccount');
    await expect(page.getByRole('link', { name: /Manage in Google Play/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/account/subscriptions?sku=weblume_starter&package=com.weblume.app',
    );
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'more than one active subscription',
    );
  });

  test('shows a cancelled subscription with its end date', async ({ page }) => {
    await mockBackends(page, {
      api: billingApi({
        me: () => starter([{ ...webSub, status: 'canceled', cancelAtPeriodEnd: true }]),
      }),
    });
    await logIn(page, '?next=%2Faccount');
    await expect(page.getByText(/Cancelled · access until/)).toBeVisible();
  });

  test('confirms the plan after returning from checkout', async ({ page }) => {
    let n = 0;
    await mockBackends(page, {
      api: billingApi({ me: () => (++n < 3 ? account() : starter([webSub])) }),
    });
    await logIn(page, '?next=%2Faccount%3Fcheckout%3Dsuccess');
    await expect(page.getByText('Your Starter plan is active. Thank you!')).toBeVisible({
      timeout: 15_000,
    });
  });
});
