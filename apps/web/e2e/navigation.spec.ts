import { expect, test } from '@playwright/test';

test('desktop navigation reaches every main page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop nav only');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, path] of [
    ['Scan', '/scan'],
    ['Features', '/features'],
    ['How it works', '/how-it-works'],
    ['Sample report', '/sample-report'],
    ['Pricing', '/pricing'],
    ['Blog', '/blog'],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(path);
  }
});

test('mobile menu opens, navigates and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile nav only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Pricing' })
    .click();
  await expect(page).toHaveURL('/pricing');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});

test('mobile menu closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile nav only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('pages have no horizontal scroll at phone width', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  for (const path of [
    '/',
    '/features',
    '/sample-report',
    '/pricing',
    '/blog/writing-good-alt-text',
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('header call-to-action is hidden on phones (it lives in the menu)', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const cta = page.getByRole('banner').getByRole('link', { name: 'Scan a website' });
  if (isMobile) await expect(cta).toBeHidden();
  else await expect(cta).toBeVisible();
});
