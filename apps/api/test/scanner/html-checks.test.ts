import { describe, expect, it } from 'vitest';
import { runHtmlChecks, type PageContext } from '../../src/scanner/checks/html-checks';

const GOOD = `<!doctype html><html lang="en"><head>
<title>Fresh sourdough bread delivered | Example Bakery</title>
<meta name="description" content="Order fresh sourdough, croissants and cakes baked every morning in Pune and delivered to your door.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://www.bakery.example/">
<link rel="icon" href="/favicon.svg">
<meta property="og:title" content="Example Bakery"><meta property="og:description" content="Fresh bread"><meta property="og:image" content="https://www.bakery.example/og.png">
</head><body><h1>Example Bakery</h1><h2>Menu</h2><h3>Breads</h3>
<img src="/a.jpg" alt="Sourdough loaf"><img src="/divider.svg" alt="">
<a href="/menu">Menu</a> <a href="https://other.example/x#frag">Partner</a> <a href="#top">Top</a>
<a href="mailto:hi@bakery.example">Email</a> <a href="javascript:void(0)">JS</a> <a href="/menu">Dup</a>
</body></html>`;

function page(html: string, extra: Partial<PageContext> = {}): PageContext {
  return {
    finalUrl: 'https://www.bakery.example/',
    chain: ['https://www.bakery.example/'],
    headers: { 'strict-transport-security': 'max-age=31536000' },
    html,
    bytes: Buffer.byteLength(html),
    ...extra,
  };
}
const ids = (html: string, extra?: Partial<PageContext>) =>
  runHtmlChecks(page(html, extra)).findings.map((f) => f.checkId);
const finding = (html: string, id: string, extra?: Partial<PageContext>) =>
  runHtmlChecks(page(html, extra)).findings.find((f) => f.checkId === id);

describe('runHtmlChecks', () => {
  it('reports nothing for a well-built page and records passes', () => {
    const out = runHtmlChecks(page(GOOD));
    expect(out.findings).toEqual([]);
    expect(out.passed).toEqual(
      expect.arrayContaining([
        'seo.title.missing',
        'seo.meta_description.missing',
        'tech.https.missing',
        'a11y.image_alt.missing',
      ]),
    );
  });

  it('extracts unique absolute http(s) links without fragments, self links or other schemes', () => {
    expect(runHtmlChecks(page(GOOD)).links).toEqual([
      'https://www.bakery.example/menu',
      'https://other.example/x',
    ]);
  });

  it('respects <base href> when resolving links', () => {
    const html = `<html><head><base href="https://cdn.example/docs/"></head><body><a href="page">x</a></body></html>`;
    expect(runHtmlChecks(page(html)).links).toEqual(['https://cdn.example/docs/page']);
  });

  it('detects a missing title, description, h1, lang, viewport and favicon', () => {
    const found = ids('<html><head></head><body><p>hi</p></body></html>');
    expect(found).toEqual(
      expect.arrayContaining([
        'seo.title.missing',
        'seo.meta_description.missing',
        'seo.h1.missing',
        'a11y.html_lang.missing',
        'tech.viewport.missing',
        'tech.favicon.missing',
        'seo.canonical.missing',
        'seo.open_graph.missing',
      ]),
    );
  });

  it('checks title and description length', () => {
    const html = GOOD.replace(/<title>.*<\/title>/, '<title>Hi</title>').replace(
      /content="Order[^"]*"/,
      'content="Short."',
    );
    expect(finding(html, 'seo.title.length')?.details).toMatchObject({ length: 2 });
    expect(finding(html, 'seo.meta_description.length')?.details).toMatchObject({ length: 6 });
  });

  it('flags multiple h1s and skipped heading levels', () => {
    const html = GOOD.replace(
      '<h2>Menu</h2><h3>Breads</h3>',
      '<h1>Again</h1><h2>A</h2><h4>Skip</h4>',
    );
    expect(finding(html, 'seo.h1.multiple')?.details).toEqual({ count: 2 });
    expect(finding(html, 'seo.headings.skipped_level')?.details).toEqual({
      examples: [{ from: 'h2', to: 'h4' }],
    });
  });

  it('validates canonical URLs', () => {
    expect(ids(GOOD.replace('https://www.bakery.example/"', '/relative"'))).toContain(
      'seo.canonical.invalid',
    );
    expect(
      ids(
        GOOD.replace(
          '<link rel="icon"',
          '<link rel="canonical" href="https://x.example/"><link rel="icon"',
        ),
      ),
    ).toContain('seo.canonical.invalid');
    expect(
      ids(GOOD.replace('https://www.bakery.example/"', 'https://www.bakery.example/other"')),
    ).toContain('seo.canonical.other_url');
    // Trailing-slash differences are not "another page".
    expect(ids(GOOD, { finalUrl: 'https://www.bakery.example' })).not.toContain(
      'seo.canonical.other_url',
    );
  });

  it('detects noindex in meta tags and the X-Robots-Tag header', () => {
    expect(
      ids(
        GOOD.replace(
          '<link rel="icon"',
          '<meta name="robots" content="NOINDEX, follow"><link rel="icon"',
        ),
      ),
    ).toContain('seo.noindex');
    expect(
      ids(GOOD, {
        headers: { 'x-robots-tag': 'noindex', 'strict-transport-security': 'max-age=1' },
      }),
    ).toContain('seo.noindex');
    expect(
      ids(
        GOOD.replace(
          '<link rel="icon"',
          '<meta name="robots" content="index, follow"><link rel="icon"',
        ),
      ),
    ).not.toContain('seo.noindex');
  });

  it('flags HTTP pages and skips HTTPS-only checks for them', () => {
    const found = ids(GOOD, { finalUrl: 'http://www.bakery.example/', headers: {} });
    expect(found).toContain('tech.https.missing');
    expect(found).not.toContain('tech.hsts.missing');
    expect(found).not.toContain('tech.mixed_content');
  });

  it('flags missing or zero HSTS', () => {
    expect(ids(GOOD, { headers: {} })).toContain('tech.hsts.missing');
    expect(ids(GOOD, { headers: { 'strict-transport-security': 'max-age=0' } })).toContain(
      'tech.hsts.missing',
    );
  });

  it('lists mixed-content resources', () => {
    const html = GOOD.replace(
      '<img src="/a.jpg"',
      '<script src="http://cdn.example/a.js"></script><img src="http://img.example/a.jpg"',
    );
    expect(finding(html, 'tech.mixed_content')?.details).toEqual({
      count: 2,
      examples: ['http://img.example/a.jpg', 'http://cdn.example/a.js'],
    });
  });

  it('flags long redirect chains', () => {
    const chain = [
      'http://bakery.example/',
      'https://bakery.example/',
      'https://www.bakery.example/',
    ];
    expect(finding(GOOD, 'tech.redirects.chain', { chain })?.details).toMatchObject({ hops: 2 });
    expect(ids(GOOD, { chain: chain.slice(1) })).not.toContain('tech.redirects.chain');
  });

  it('flags images without alt, ignoring decorative ones', () => {
    const html = GOOD.replace(
      '<img src="/a.jpg" alt="Sourdough loaf">',
      '<img src="/a.jpg"><img src="/b.jpg"><img src="/c.jpg" aria-hidden="true"><img src="/d.jpg" role="presentation">',
    );
    expect(finding(html, 'a11y.image_alt.missing')?.details).toEqual({
      count: 2,
      examples: ['/a.jpg', '/b.jpg'],
    });
  });

  it('flags very large HTML', () => {
    expect(ids(GOOD, { bytes: 2 * 1024 * 1024 })).toContain('tech.page_size.large');
  });

  it('copes with malformed HTML', () => {
    expect(() =>
      runHtmlChecks(page('<html><head><title>x</head><body><h1><p></div>')),
    ).not.toThrow();
  });
});
