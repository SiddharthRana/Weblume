import { expect, test, type Page } from '@playwright/test';
import { ACCESS_TOKEN, logIn, mockBackends, axe } from './support';

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
    const r = await (
      await axe(page)
    )
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
    const r = await (
      await axe(page)
    )
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
    await expect(page.getByRole('img', { name: 'Saved' })).toBeVisible();
    const r = await (
      await axe(page)
    )
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
