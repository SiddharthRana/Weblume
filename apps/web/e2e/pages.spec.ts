import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', h1: /Website audits your clients can actually read/ },
  { path: '/features', h1: /Everything you need/ },
  { path: '/how-it-works', h1: /From URL to action plan/ },
  { path: '/sample-report', h1: /bakery\.example/ },
  { path: '/scan', h1: /Scan a website/ },
  { path: '/pricing', h1: /Simple pricing/ },
  { path: '/blog', h1: /Guides for healthier websites/ },
  { path: '/blog/what-is-largest-contentful-paint', h1: /Largest Contentful Paint/ },
  { path: '/blog/writing-good-alt-text', h1: /alt text/ },
  { path: '/contact', h1: /here to help/ },
  { path: '/bot', h1: /WeblumeBot/ },
  { path: '/legal/privacy', h1: /Privacy policy/ },
  { path: '/legal/terms', h1: /Terms of service/ },
  { path: '/legal/refunds', h1: /Refund policy/ },
  { path: '/legal/account-deletion', h1: /Delete your Weblume account/ },
];

for (const { path, h1 } of pages) {
  test.describe(`page ${path}`, () => {
    test('renders with one h1, a title and a canonical URL', async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(h1);
      await expect(page).toHaveTitle(/Weblume/);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    });

    test('has no automatically detectable WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  });
}

test('legal pages are clearly marked as drafts', async ({ page }) => {
  for (const path of ['/legal/privacy', '/legal/terms', '/legal/refunds']) {
    await page.goto(path);
    await expect(page.getByText('DRAFT — requires legal review.')).toBeVisible();
  }
});

test('sample report is labelled as illustrative', async ({ page }) => {
  await page.goto('/sample-report');
  await expect(page.getByText('Illustrative example.')).toBeVisible();
});

test('findings expand to show how to fix them', async ({ page }) => {
  await page.goto('/sample-report');
  const first = page.locator('details').first();
  await expect(first.getByText('How to fix it')).toBeHidden();
  await first.locator('summary').click();
  await expect(first.getByText('How to fix it')).toBeVisible();
});

test('unknown routes return a 404 page', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('robots.txt and sitemap.xml are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('/sample-report');
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['x-powered-by']).toBeUndefined();
});

test('keyboard users can skip to content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
});
