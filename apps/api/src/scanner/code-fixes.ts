import type { CodeFix, CodeLanguage, CodeSnippet } from '@weblume/shared';
import { LIMITS } from './checks/html-checks';

/**
 * Copy-paste code fixes for Weblume's own checks, built from each finding's evidence and the scanned
 * page's address so the code is specific to the site. Server-side only: the plan gate in
 * ScansService decides who receives them, so they never ship in the website's bundle.
 * Returns null for checks with no meaningful code (e.g. broken links, Lighthouse audits).
 */
export function codeFixFor(
  checkId: string,
  details: Record<string, unknown>,
  pageUrl: string,
): CodeFix | null {
  const build = BUILDERS[checkId];
  if (!build) return null;
  const page = parsePage(pageUrl);
  return page ? build(details, page) : null;
}

interface Page {
  /** The page address without the fragment. */
  url: string;
  origin: string;
  host: string;
  path: string;
  /** A readable site name for placeholders, e.g. "Example" for www.example.com. */
  brand: string;
}

type Builder = (details: Record<string, unknown>, page: Page) => CodeFix | null;

const MAX_EXAMPLES = 3;

const snippet = (label: string, language: CodeLanguage, code: string): CodeSnippet => ({
  label,
  language,
  code,
});
const head = (code: string) => snippet('In the page’s <head>', 'html', code);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const strs = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
/** Escapes text for use inside an HTML attribute or element in a snippet. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Shortens text at a word boundary so it fits `max` characters. */
function shorten(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join('');
  const space = cut.lastIndexOf(' ');
  return (space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:|.-]+$/, '');
}

function parsePage(pageUrl: string): Page | null {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    return null;
  }
  u.hash = '';
  const label = u.hostname.replace(/^www\./, '').split('.')[0] ?? u.hostname;
  return {
    url: u.toString(),
    origin: u.origin,
    host: u.hostname,
    path: u.pathname,
    brand: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

const sitemapXml = (page: Page) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${esc(page.url)}</loc>`,
    '  </url>',
    '  <!-- One <url> entry per page you want found -->',
    '</urlset>',
  ].join('\n');

const BUILDERS: Record<string, Builder> = {
  // ---------------------------------------------------------------- SEO
  'seo.title.missing': (_, page) => ({
    snippets: [head(`<title>What this page offers | ${esc(page.brand)}</title>`)],
    note: `Write a unique title for this page, ${LIMITS.title.min}–${LIMITS.title.max} characters, with the most important words first.`,
  }),

  'seo.title.length': (d, page) => {
    const title = str(d.title);
    if (!title) return null;
    const tooLong = [...title].length > LIMITS.title.max;
    const suggested = tooLong
      ? shorten(title, LIMITS.title.max)
      : `${title} | ${page.brand}`.slice(0, LIMITS.title.max);
    return {
      snippets: [
        snippet('Now', 'html', `<title>${esc(title)}</title>`),
        snippet('Suggested starting point', 'html', `<title>${esc(suggested)}</title>`),
      ],
      note: tooLong
        ? 'Shortened at a word boundary. Reword it so the most important words come first.'
        : 'Add detail that tells people what the page offers; your brand name is a simple start.',
    };
  },

  'seo.meta_description.missing': () => ({
    snippets: [
      head(
        '<meta name="description" content="One or two sentences that sum up this page and give people a reason to click.">',
      ),
    ],
    note: `Aim for ${LIMITS.description.min}–${LIMITS.description.max} characters, written for people rather than keywords.`,
  }),

  'seo.meta_description.length': (d) => {
    const description = str(d.description);
    if (!description) return null;
    const tooLong = [...description].length > LIMITS.description.max;
    return {
      snippets: [
        snippet('Now', 'html', `<meta name="description" content="${esc(description)}">`),
        snippet(
          tooLong ? 'Suggested starting point' : 'Expand it',
          'html',
          tooLong
            ? `<meta name="description" content="${esc(shorten(description, LIMITS.description.max - 3))}...">`
            : `<meta name="description" content="${esc(description)} Add what makes this page useful and why someone should visit.">`,
        ),
      ],
      note: `Keep it between ${LIMITS.description.min} and ${LIMITS.description.max} characters.`,
    };
  },

  'seo.h1.missing': () => ({
    snippets: [
      snippet(
        'At the top of the main content',
        'html',
        '<main>\n  <h1>What this page is about</h1>\n  ...\n</main>',
      ),
    ],
    note: 'If the page already has a big heading styled to look like one, change its tag to <h1>.',
  }),

  'seo.h1.multiple': (d) => ({
    snippets: [
      snippet(
        'Keep one <h1>, turn the rest into <h2>',
        'html',
        '<h1>Main heading of the page</h1>\n\n<!-- Before: <h1>Section heading</h1> -->\n<h2>Section heading</h2>',
      ),
    ],
    note:
      typeof d.count === 'number'
        ? `This page has ${d.count} <h1> elements. Restyle the <h2>s with CSS if they need to look the same.`
        : undefined,
  }),

  'seo.headings.skipped_level': (d) => {
    const first = Array.isArray(d.examples)
      ? (d.examples[0] as { from?: string; to?: string })
      : {};
    const from = /^h[1-6]$/.test(first?.from ?? '') ? first.from! : 'h2';
    const to = /^h[1-6]$/.test(first?.to ?? '') ? first.to! : 'h4';
    const next = `h${Number(from.slice(1)) + 1}`;
    return {
      snippets: [
        snippet('Before', 'html', `<${from}>Section</${from}>\n<${to}>Subsection</${to}>`),
        snippet('After', 'html', `<${from}>Section</${from}>\n<${next}>Subsection</${next}>`),
      ],
      note: 'Choose heading tags for the outline, then use CSS for their size.',
    };
  },

  'seo.canonical.missing': (_, page) => ({
    snippets: [head(`<link rel="canonical" href="${esc(page.url)}">`)],
    note: 'If this page is a copy of another one, point the canonical at that page instead.',
  }),

  'seo.canonical.invalid': (d, page) => ({
    snippets: [
      ...(strs(d.values).length
        ? [
            snippet(
              'Now',
              'html',
              strs(d.values)
                .map((v) => `<link rel="canonical" href="${esc(v)}">`)
                .join('\n'),
            ),
          ]
        : []),
      snippet(
        'Replace with one absolute URL',
        'html',
        `<link rel="canonical" href="${esc(page.url)}">`,
      ),
    ],
  }),

  'seo.canonical.other_url': (d, page) => ({
    snippets: [
      snippet('Now', 'html', `<link rel="canonical" href="${esc(str(d.canonical))}">`),
      snippet(
        'If this page should be indexed itself',
        'html',
        `<link rel="canonical" href="${esc(page.url)}">`,
      ),
    ],
    note: 'Leave it as it is if this page really is a copy of the canonical page.',
  }),

  'seo.noindex': (d) => {
    const snippets: CodeSnippet[] = [];
    if (str(d.meta)) {
      snippets.push(
        snippet(
          'Remove from the page’s <head>',
          'html',
          `<meta name="robots" content="${esc(str(d.meta))}">`,
        ),
      );
    }
    if (str(d.header)) {
      snippets.push(
        snippet('nginx: remove this line', 'nginx', `add_header X-Robots-Tag "${str(d.header)}";`),
        snippet('Apache: remove this line', 'apache', `Header set X-Robots-Tag "${str(d.header)}"`),
      );
    }
    return snippets.length
      ? { snippets, note: 'Only do this if the page should appear in search results.' }
      : null;
  },

  'seo.open_graph.missing': (d, page) => {
    const missing = strs(d.missing);
    const tags: Record<string, string> = {
      'og:title': `<meta property="og:title" content="Title shown when the page is shared">`,
      'og:description': `<meta property="og:description" content="One sentence about the page">`,
      'og:image': `<meta property="og:image" content="${esc(page.origin)}/og-image.jpg">`,
    };
    const lines = (missing.length ? missing : Object.keys(tags))
      .map((p) => tags[p])
      .filter(Boolean);
    lines.push(`<meta property="og:url" content="${esc(page.url)}">`);
    return {
      snippets: [head(lines.join('\n'))],
      note: 'Use an image of 1200 × 630 pixels for the best preview.',
    };
  },

  'seo.robots_txt.missing': (_, page) => ({
    snippets: [
      snippet(
        `${page.origin}/robots.txt`,
        'text',
        `User-agent: *\nAllow: /\n\nSitemap: ${page.origin}/sitemap.xml`,
      ),
    ],
  }),

  'seo.robots_txt.blocks_page': (_, page) => ({
    snippets: [
      snippet(
        `${page.origin}/robots.txt: add above the Disallow rule that matches`,
        'text',
        `User-agent: *\nAllow: ${page.path}`,
      ),
    ],
    note: 'Or delete the Disallow rule if nothing on the site needs hiding.',
  }),

  'seo.sitemap.missing': (_, page) => ({
    snippets: [
      snippet(`${page.origin}/sitemap.xml`, 'xml', sitemapXml(page)),
      snippet(`${page.origin}/robots.txt: add`, 'text', `Sitemap: ${page.origin}/sitemap.xml`),
    ],
    note: 'Most CMSs (WordPress, Shopify, Wix) can generate this file for you.',
  }),

  'seo.sitemap.invalid': (d, page) => ({
    snippets: [snippet(str(d.url) || `${page.origin}/sitemap.xml`, 'xml', sitemapXml(page))],
    note: 'The file must be valid XML in this format (or a sitemap index).',
  }),

  // ---------------------------------------------------------------- Technical
  'tech.https.missing': (_, page) => ({
    snippets: [
      snippet(
        'Server shell: free certificate from Let’s Encrypt (nginx)',
        'text',
        `sudo certbot --nginx -d ${page.host}`,
      ),
    ],
    note: 'Many hosts and CDNs (Cloudflare, Netlify, Vercel) turn on HTTPS with one setting instead.',
  }),

  'tech.https.no_redirect': (_, page) => ({
    snippets: [
      snippet(
        'nginx',
        'nginx',
        `server {\n  listen 80;\n  server_name ${page.host};\n  return 301 https://$host$request_uri;\n}`,
      ),
      snippet(
        'Apache (.htaccess)',
        'apache',
        'RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]',
      ),
    ],
  }),

  'tech.hsts.missing': () => ({
    snippets: [
      snippet(
        'nginx (inside the HTTPS server block)',
        'nginx',
        'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
      ),
      snippet(
        'Apache',
        'apache',
        'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
      ),
    ],
    note: 'Only keep includeSubDomains if every subdomain serves HTTPS.',
  }),

  'tech.redirects.chain': (d) => {
    const chain = strs(d.chain);
    if (chain.length < 2) return null;
    const final = chain[chain.length - 1]!;
    return {
      snippets: [
        snippet('Before', 'html', `<a href="${esc(chain[0]!)}">...</a>`),
        snippet('After: link to the final address', 'html', `<a href="${esc(final)}">...</a>`),
      ],
      note: 'Also make the first address redirect straight to the final one in a single step.',
    };
  },

  'tech.mixed_content': (d) => {
    const examples = strs(d.examples).slice(0, MAX_EXAMPLES);
    return {
      snippets: [
        ...(examples.length
          ? [
              snippet(
                'Change these addresses to https://',
                'text',
                examples.map((u) => `${u}\n→ ${u.replace(/^http:/i, 'https:')}`).join('\n\n'),
              ),
            ]
          : []),
        head('<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">'),
      ],
      note: 'The meta tag upgrades any remaining http:// requests while you update the addresses.',
    };
  },

  'tech.viewport.missing': () => ({
    snippets: [head('<meta name="viewport" content="width=device-width, initial-scale=1">')],
  }),

  'tech.favicon.missing': () => ({
    snippets: [
      head(
        '<link rel="icon" href="/favicon.ico" sizes="32x32">\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      ),
    ],
    note: 'Upload the icon files to your site’s root folder.',
  }),

  // ---------------------------------------------------------------- Accessibility
  'a11y.html_lang.missing': () => ({
    snippets: [snippet('The first tag of the page', 'html', '<html lang="en">')],
    note: 'Use your page’s language code, e.g. "hi" for Hindi or "en-IN" for Indian English.',
  }),

  'a11y.image_alt.missing': (d) => {
    const srcs = strs(d.examples).slice(0, MAX_EXAMPLES);
    const lines = (srcs.length ? srcs : ['image.jpg']).map(
      (src) => `<img src="${esc(src)}" alt="Describe what this image shows">`,
    );
    return {
      snippets: [
        snippet('Images that carry meaning', 'html', lines.join('\n')),
        snippet(
          'Purely decorative images',
          'html',
          `<img src="${esc(srcs[0] ?? 'image.jpg')}" alt="">`,
        ),
      ],
    };
  },
};
