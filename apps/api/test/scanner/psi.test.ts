import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GooglePsiProvider } from '../../src/scanner/psi/google-psi.provider';
import {
  lighthouseCopy,
  lighthouseSeverity,
  parseLighthouseDescription,
} from '../../src/scanner/psi/lighthouse-copy';
import { mapPsiResponse } from '../../src/scanner/psi/psi-mapper';

const fixture = JSON.parse(readFileSync(join(__dirname, '../fixtures/psi-mobile.json'), 'utf8'));

describe('mapPsiResponse', () => {
  const r = mapPsiResponse(fixture);

  it('converts category scores to 0–100', () => {
    expect(r.scores).toEqual({ performance: 54, accessibility: 81, seo: 83, bestPractices: 92 });
  });

  it('extracts lab metrics', () => {
    expect(r.metrics.largestContentfulPaint).toBeCloseTo(4812.3);
    expect(r.metrics.cumulativeLayoutShift).toBeCloseTo(0.012);
    expect(r.lighthouseVersion).toBe('12.8.2');
  });

  it('keeps only scored, failing audits, once each', () => {
    const ids = r.failingAudits.map((a) => a.id);
    expect(ids).toContain('largest-contentful-paint');
    expect(ids).toContain('render-blocking-insight');
    expect(ids).toContain('color-contrast');
    expect(ids).not.toContain('total-blocking-time'); // passing (0.95)
    expect(ids).not.toContain('button-name'); // passing
    expect(ids).not.toContain('network-dependency-tree-insight'); // informative
    expect(ids.filter((i) => i === 'largest-contentful-paint')).toHaveLength(1); // listed in two categories
    expect(r.failingAudits.find((a) => a.id === 'errors-in-console')?.category).toBe('technical');
  });

  it('rejects responses without a Lighthouse result', () => {
    expect(() => mapPsiResponse({ error: { code: 500 } })).toThrow();
  });
});

describe('Lighthouse severity and copy', () => {
  const audits = mapPsiResponse(fixture).failingAudits;
  const get = (id: string) => audits.find((a) => a.id === id)!;

  it('rates metrics by score', () => {
    expect(lighthouseSeverity(get('largest-contentful-paint'))).toBe('high'); // 0.21
    expect(lighthouseSeverity(get('first-contentful-paint'))).toBe('medium'); // 0.62
  });

  it('rates accessibility by Lighthouse weight', () => {
    expect(lighthouseSeverity(get('color-contrast'))).toBe('medium'); // weight 7
    expect(lighthouseSeverity(get('heading-order'))).toBe('low'); // weight 3
  });

  it('uses curated copy where we have it and Lighthouse text otherwise', () => {
    const lcp = lighthouseCopy(get('largest-contentful-paint'));
    expect(lcp.title).toBe('Largest Contentful Paint: 4.8 s');
    expect(lcp.whatItMeans).toMatch(/2\.5 seconds/);
    expect(lcp.learnMoreUrl).toMatch(/^https:\/\/developer\.chrome\.com/);
    const heading = lighthouseCopy(get('heading-order'));
    expect(heading.whatItMeans).toBe(
      'Properly ordered headings that do not skip levels convey the semantic structure of the page.',
    );
  });

  it('strips markdown but keeps non-"learn more" link text', () => {
    const p = parseLighthouseDescription(
      'Requests are blocking. [Deferring or inlining](https://web.dev/x) can help. Use `defer`. [Learn more](https://a.dev/y).',
    );
    expect(p.text).toBe('Requests are blocking. Deferring or inlining can help. Use defer.');
    expect(p.learnMoreUrl).toBe('https://a.dev/y');
  });
});

describe('GooglePsiProvider', () => {
  const respond = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('calls the v5 API with the key, strategy and all four categories', async () => {
    let called = '';
    const fake = (async (url: string) => {
      called = url;
      return new Response(JSON.stringify(fixture));
    }) as unknown as typeof fetch;
    const out = await new GooglePsiProvider('KEY123', fake).run('https://site.example/', 'desktop');
    expect(out.ok).toBe(true);
    const u = new URL(called);
    expect(u.searchParams.get('key')).toBe('KEY123');
    expect(u.searchParams.get('strategy')).toBe('desktop');
    expect(u.searchParams.getAll('category')).toEqual([
      'performance',
      'accessibility',
      'seo',
      'best-practices',
    ]);
  });

  it.each([
    [429, 'quota_exceeded'],
    [500, 'upstream_error'],
    [400, 'upstream_error'],
  ])('maps HTTP %i to %s', async (status, reason) => {
    const out = await new GooglePsiProvider('k', respond(status, { error: {} })).run(
      'https://x.example/',
      'mobile',
    );
    expect(out).toEqual({ ok: false, reason });
  });

  it('reports invalid responses', async () => {
    const out = await new GooglePsiProvider('k', respond(200, { nope: true })).run(
      'https://x.example/',
      'mobile',
    );
    expect(out).toEqual({ ok: false, reason: 'invalid_response' });
  });

  it('reports network errors', async () => {
    const failing = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const out = await new GooglePsiProvider('k', failing).run('https://x.example/', 'mobile');
    expect(out).toEqual({ ok: false, reason: 'upstream_error' });
  });
});
