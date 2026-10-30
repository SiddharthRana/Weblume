import { load, type CheerioAPI } from 'cheerio';
import { type CheckOutcome, emptyOutcome, record } from './types';

export interface PageContext {
  /** URL the page was finally served from (after redirects). */
  finalUrl: string;
  /** Every URL requested while fetching the page, in order. */
  chain: string[];
  headers: Record<string, string>;
  html: string;
  bytes: number;
}

export const LIMITS = {
  title: { min: 10, max: 60 },
  description: { min: 50, max: 160 },
  largeHtmlBytes: 1024 * 1024,
  maxEvidence: 10,
};

const MIXED_CONTENT_SELECTORS = [
  ['img[src]', 'src'],
  ['script[src]', 'src'],
  ['iframe[src]', 'src'],
  ['video[src]', 'src'],
  ['audio[src]', 'src'],
  ['source[src]', 'src'],
  ['link[rel~="stylesheet" i][href]', 'href'],
] as const;

const text = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Parses once and runs every HTML/HTTP-level check. Pure: no network access. */
export function runHtmlChecks(page: PageContext): CheckOutcome & { links: string[] } {
  const $ = load(page.html);
  const out = emptyOutcome();
  const final = new URL(page.finalUrl);
  const isHttps = final.protocol === 'https:';

  seoChecks($, page, out);

  // ---- Technical
  record(out, 'tech.https.missing', !isHttps, { url: page.finalUrl });
  if (isHttps) {
    const hsts = page.headers['strict-transport-security'] ?? '';
    const maxAge = Number(/max-age\s*=\s*"?(\d+)/i.exec(hsts)?.[1] ?? 0);
    record(out, 'tech.hsts.missing', maxAge <= 0, hsts ? { header: hsts } : {});
    const insecure = new Set<string>();
    for (const [sel, attr] of MIXED_CONTENT_SELECTORS) {
      $(sel).each((_, el) => {
        const v = $(el).attr(attr)?.trim() ?? '';
        if (/^http:\/\//i.test(v)) insecure.add(v);
      });
    }
    record(out, 'tech.mixed_content', insecure.size > 0, {
      count: insecure.size,
      examples: [...insecure].slice(0, LIMITS.maxEvidence),
    });
  }
  const hops = page.chain.length - 1;
  record(out, 'tech.redirects.chain', hops >= 2, { hops, chain: page.chain });
  record(out, 'tech.viewport.missing', $('meta[name="viewport" i]').length === 0);
  record(out, 'tech.favicon.missing', $('link[rel~="icon" i]').length === 0);
  record(out, 'tech.page_size.large', page.bytes > LIMITS.largeHtmlBytes, { bytes: page.bytes });

  // ---- Accessibility
  record(out, 'a11y.html_lang.missing', text($('html').attr('lang')) === '');
  const noAlt: string[] = [];
  $('img:not([alt])').each((_, el) => {
    const img = $(el);
    const role = (img.attr('role') ?? '').toLowerCase();
    if (img.attr('aria-hidden') === 'true' || role === 'presentation' || role === 'none') return;
    noAlt.push(img.attr('src') ?? '(no src)');
  });
  record(out, 'a11y.image_alt.missing', noAlt.length > 0, {
    count: noAlt.length,
    examples: noAlt.slice(0, LIMITS.maxEvidence),
  });

  return { ...out, links: extractLinks($, page.finalUrl) };
}

function seoChecks($: CheerioAPI, page: PageContext, out: CheckOutcome): void {
  const title = text($('title').first().text());
  record(out, 'seo.title.missing', title === '');
  if (title) {
    const len = [...title].length;
    record(out, 'seo.title.length', len < LIMITS.title.min || len > LIMITS.title.max, {
      length: len,
      title,
    });
  }

  const description = text($('meta[name="description" i]').first().attr('content'));
  record(out, 'seo.meta_description.missing', description === '');
  if (description) {
    const len = [...description].length;
    record(
      out,
      'seo.meta_description.length',
      len < LIMITS.description.min || len > LIMITS.description.max,
      {
        length: len,
        description,
      },
    );
  }

  const h1Count = $('h1').length;
  record(out, 'seo.h1.missing', h1Count === 0);
  if (h1Count > 0) record(out, 'seo.h1.multiple', h1Count > 1, { count: h1Count });

  const skips: { from: string; to: string }[] = [];
  let prev = 0;
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = Number((el as { tagName: string }).tagName.slice(1));
    if (prev > 0 && level > prev + 1) skips.push({ from: `h${prev}`, to: `h${level}` });
    prev = level;
  });
  record(out, 'seo.headings.skipped_level', skips.length > 0, {
    examples: skips.slice(0, LIMITS.maxEvidence),
  });

  const canonicals = $('link[rel~="canonical" i]')
    .map((_, el) => $(el).attr('href')?.trim() ?? '')
    .get();
  if (canonicals.length === 0) {
    record(out, 'seo.canonical.missing', true);
  } else {
    out.passed.push('seo.canonical.missing');
    const href = canonicals[0]!;
    const absolute = /^https?:\/\//i.test(href);
    let parsed: URL | null;
    try {
      parsed = absolute ? new URL(href) : null;
    } catch {
      parsed = null;
    }
    const invalid = canonicals.length > 1 || !parsed;
    record(out, 'seo.canonical.invalid', invalid, { values: canonicals.slice(0, 5) });
    if (parsed) {
      parsed.hash = '';
      const same =
        stripTrailingSlash(parsed.toString()) === stripTrailingSlash(withoutHash(page.finalUrl));
      record(out, 'seo.canonical.other_url', !same, {
        canonical: parsed.toString(),
        page: page.finalUrl,
      });
    }
  }

  const robotsMeta = $('meta[name="robots" i], meta[name="googlebot" i]')
    .map((_, el) => $(el).attr('content') ?? '')
    .get()
    .join(',');
  const robotsHeader = page.headers['x-robots-tag'] ?? '';
  const noindex =
    /\bnoindex\b|\bnone\b/i.test(robotsMeta) || /\bnoindex\b|\bnone\b/i.test(robotsHeader);
  record(out, 'seo.noindex', noindex, {
    ...(robotsMeta ? { meta: robotsMeta } : {}),
    ...(robotsHeader ? { header: robotsHeader } : {}),
  });

  const missingOg = ['og:title', 'og:description', 'og:image'].filter(
    (p) => text($(`meta[property="${p}" i]`).first().attr('content')) === '',
  );
  record(out, 'seo.open_graph.missing', missingOg.length > 0, { missing: missingOg });
}

const stripTrailingSlash = (u: string) => u.replace(/\/$/, '');
const withoutHash = (u: string) => u.split('#')[0]!;

/** Unique absolute http(s) links on the page, excluding the page itself. Respects <base href>. */
export function extractLinks($: CheerioAPI, pageUrl: string): string[] {
  let base = pageUrl;
  const baseHref = $('base[href]').first().attr('href');
  if (baseHref) {
    try {
      base = new URL(baseHref, pageUrl).toString();
    } catch {
      /* ignore invalid base */
    }
  }
  const seen = new Set<string>();
  const self = withoutHash(pageUrl);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (!href || href.startsWith('#')) return;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    u.hash = '';
    const s = u.toString();
    if (s !== self) seen.add(s);
  });
  return [...seen];
}
