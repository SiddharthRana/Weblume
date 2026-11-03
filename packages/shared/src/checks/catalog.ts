import type { AuditCategory, FindingKind } from '../scan.js';
import type { Severity } from '../severity.js';

/**
 * Curated, human-written content for every check Weblume runs itself.
 * This copy is the product: write for a non-technical site owner, be concrete, never overclaim.
 * IDs are stable and stored in the database — never rename one; add a new ID instead.
 */
export interface CheckDefinition {
  id: string;
  category: AuditCategory;
  severity: Severity;
  kind: FindingKind;
  title: string;
  whatItMeans: string;
  whyItMatters: string;
  howToFix: string[];
  learnMoreUrl?: string;
}

const defs = [
  // ---------------------------------------------------------------- SEO
  {
    id: 'seo.title.missing',
    category: 'seo',
    severity: 'high',
    title: 'Page has no title',
    whatItMeans:
      'The page is missing a <title> tag: the text shown in browser tabs and as the clickable headline in search results.',
    whyItMatters:
      'Without a title, search engines invent one and people can’t tell what the page is about at a glance. It’s one of the most important on-page SEO signals.',
    howToFix: [
      'Add a <title> inside the page’s <head>, e.g. <title>Fresh Sourdough Bread | Example Bakery</title>.',
      'Make it unique to this page, around 30–60 characters, with the most important words first.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  },
  {
    id: 'seo.title.length',
    category: 'seo',
    severity: 'low',
    title: 'Page title is too short or too long',
    whatItMeans: 'The page title is outside the recommended length of roughly 10–60 characters.',
    whyItMatters:
      'Very short titles don’t describe the page well; very long ones get cut off in search results, hiding the end of your message.',
    howToFix: [
      'Rewrite the title to clearly describe the page in about 30–60 characters.',
      'Put the key topic first and your brand name last.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  },
  {
    id: 'seo.meta_description.missing',
    category: 'seo',
    severity: 'medium',
    title: 'Page has no meta description',
    whatItMeans:
      'The meta description is the short summary search engines may show under your page title in results. This page doesn’t have one.',
    whyItMatters:
      'Without one, search engines pick text from the page themselves, which is often less persuasive and can lower how many people click.',
    howToFix: [
      'Add <meta name="description" content="…"> inside the page’s <head>.',
      'Write 50–160 characters that describe the page and give people a reason to visit.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  },
  {
    id: 'seo.meta_description.length',
    category: 'seo',
    severity: 'low',
    title: 'Meta description is too short or too long',
    whatItMeans:
      'The meta description is outside the recommended length of roughly 50–160 characters.',
    whyItMatters:
      'Short descriptions waste the space you get in search results; long ones are cut off mid-sentence.',
    howToFix: [
      'Rewrite the description in about 50–160 characters, summarising the page and inviting a click.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  },
  {
    id: 'seo.h1.missing',
    category: 'seo',
    severity: 'medium',
    title: 'Page has no main heading (H1)',
    whatItMeans: 'The page has no <h1> element, the main heading that says what the page is about.',
    whyItMatters:
      'Search engines and screen-reader users rely on the main heading to understand the page. Without one, the page’s topic is less clear.',
    howToFix: [
      'Add one <h1> near the top of the page that describes its main topic.',
      'If your design already shows a big heading, make sure it is marked up as <h1> rather than just styled text.',
    ],
  },
  {
    id: 'seo.h1.multiple',
    category: 'seo',
    severity: 'low',
    title: 'Page has more than one main heading (H1)',
    whatItMeans: 'The page contains several <h1> elements.',
    whyItMatters:
      'Multiple main headings can blur what the page is mainly about for search engines and make navigation harder for screen-reader users.',
    howToFix: [
      'Keep one <h1> for the page’s main topic.',
      'Change the other headings to <h2> or <h3> to reflect their place in the outline.',
    ],
  },
  {
    id: 'seo.headings.skipped_level',
    category: 'seo',
    severity: 'low',
    title: 'Heading levels are skipped',
    whatItMeans:
      'The page jumps between heading levels (for example from <h2> straight to <h4>), leaving gaps in the outline.',
    whyItMatters:
      'Headings form an outline that screen-reader users navigate by and search engines use to understand structure. Gaps make that outline confusing.',
    howToFix: [
      'Use heading levels in order: <h1>, then <h2> for sections, <h3> for sub-sections, and so on.',
      'Choose heading levels for structure, and change their look with CSS instead.',
    ],
  },
  {
    id: 'seo.canonical.missing',
    category: 'seo',
    severity: 'low',
    title: 'No canonical URL is set',
    whatItMeans:
      'The page doesn’t declare a canonical URL: the preferred address search engines should index for this content.',
    whyItMatters:
      'The same page is often reachable at several addresses (with or without www, tracking parameters, etc.). A canonical tag tells search engines which one counts, avoiding split rankings.',
    howToFix: [
      'Add <link rel="canonical" href="https://www.example.com/page"> in the <head>, using the full preferred address.',
    ],
    learnMoreUrl:
      'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  },
  {
    id: 'seo.canonical.invalid',
    category: 'seo',
    severity: 'medium',
    title: 'Canonical URL is invalid',
    whatItMeans: 'The canonical tag is malformed, relative, repeated, or not an http(s) address.',
    whyItMatters: 'Search engines may ignore an invalid canonical, or worse, index the wrong page.',
    howToFix: [
      'Use exactly one <link rel="canonical"> with a full, absolute address starting with https://.',
    ],
    learnMoreUrl:
      'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  },
  {
    id: 'seo.canonical.other_url',
    category: 'seo',
    severity: 'info',
    title: 'Canonical URL points to a different page',
    whatItMeans: 'This page says another address is the preferred version of its content.',
    whyItMatters:
      'That’s correct for duplicates, but if this page should appear in search results on its own, search engines may index the other address instead.',
    howToFix: [
      'If this page is meant to rank on its own, set its canonical to its own address.',
      'If it’s a duplicate, no action is needed.',
    ],
  },
  {
    id: 'seo.noindex',
    category: 'seo',
    severity: 'high',
    title: 'Page asks search engines not to index it',
    whatItMeans: 'A robots meta tag or X-Robots-Tag header on this page contains “noindex”.',
    whyItMatters:
      'Search engines will drop this page from their results. That’s often left over from a staging site by mistake.',
    howToFix: [
      'If the page should appear in search, remove “noindex” from the robots meta tag and the X-Robots-Tag header.',
      'If hiding it is intentional, no action is needed.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
  },
  {
    id: 'seo.open_graph.missing',
    category: 'seo',
    severity: 'low',
    title: 'Social sharing previews are incomplete',
    whatItMeans:
      'Some Open Graph tags (og:title, og:description, og:image) are missing. These control how the page looks when shared on social media and in messaging apps.',
    whyItMatters:
      'Without them, shared links can show the wrong text or no image, making them less likely to be clicked.',
    howToFix: [
      'Add <meta property="og:title">, <meta property="og:description"> and <meta property="og:image"> to the <head>.',
      'Use an image at least 1200×630 pixels.',
    ],
    learnMoreUrl: 'https://ogp.me/',
  },
  {
    id: 'seo.robots_txt.missing',
    category: 'seo',
    severity: 'info',
    title: 'No robots.txt file found',
    whatItMeans: 'The site has no robots.txt file at its root (or it couldn’t be read).',
    whyItMatters:
      'It isn’t required. Without it, search engines assume they may crawl everything. It’s a useful place to point to your sitemap.',
    howToFix: [
      'Optionally add /robots.txt with a “Sitemap: https://www.example.com/sitemap.xml” line.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
  },
  {
    id: 'seo.robots_txt.blocks_page',
    category: 'seo',
    severity: 'high',
    title: 'robots.txt blocks search engines from this page',
    whatItMeans: 'The site’s robots.txt file tells search engine crawlers not to visit this page.',
    whyItMatters:
      'Search engines can’t read pages they’re blocked from, so this page is unlikely to rank. This is a common leftover from development.',
    howToFix: [
      'Edit robots.txt and remove or narrow the Disallow rule that matches this page.',
      'If blocking is intentional, no action is needed.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
  },
  {
    id: 'seo.sitemap.missing',
    category: 'seo',
    severity: 'low',
    title: 'No sitemap found',
    whatItMeans: 'We couldn’t find a sitemap listed in robots.txt or at /sitemap.xml.',
    whyItMatters:
      'A sitemap helps search engines discover all your pages, especially new ones or ones with few links pointing to them.',
    howToFix: [
      'Generate a sitemap.xml (most website builders and CMSs can do this automatically).',
      'Reference it in robots.txt and submit it in Google Search Console.',
    ],
    learnMoreUrl: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview',
  },
  {
    id: 'seo.sitemap.invalid',
    category: 'seo',
    severity: 'low',
    title: 'Sitemap couldn’t be read',
    whatItMeans:
      'A sitemap exists but isn’t valid XML in the sitemap format, or returned an error.',
    whyItMatters:
      'Search engines may ignore a broken sitemap, so pages it lists may be discovered more slowly.',
    howToFix: [
      'Open the sitemap in a browser and check it loads and is valid XML.',
      'Regenerate it with your CMS or a sitemap tool.',
    ],
    learnMoreUrl:
      'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
  },
  // ---------------------------------------------------------- Technical
  {
    id: 'tech.https.missing',
    category: 'technical',
    severity: 'high',
    title: 'Page isn’t served over HTTPS',
    whatItMeans: 'The page loads over plain HTTP, without encryption.',
    whyItMatters:
      'Browsers label HTTP pages “Not secure”, visitors’ data can be read or altered in transit, and search engines prefer HTTPS pages.',
    howToFix: [
      'Turn on HTTPS with your host or CDN (free certificates are widely available, e.g. Let’s Encrypt).',
      'Redirect all HTTP addresses to HTTPS.',
    ],
  },
  {
    id: 'tech.https.no_redirect',
    category: 'technical',
    severity: 'medium',
    title: 'HTTP version doesn’t redirect to HTTPS',
    whatItMeans:
      'When someone visits the http:// version of this page, they aren’t sent to the secure https:// version.',
    whyItMatters:
      'Visitors using old links or typing the address may end up on the insecure version, and search engines may see two copies of the page.',
    howToFix: [
      'Configure a permanent (301) redirect from every http:// address to its https:// equivalent. Most hosts have a one-click “force HTTPS” setting.',
    ],
  },
  {
    id: 'tech.hsts.missing',
    category: 'technical',
    severity: 'low',
    title: 'HTTPS isn’t enforced with HSTS',
    whatItMeans:
      'The Strict-Transport-Security header, which tells browsers to always use the secure version of your site, isn’t set.',
    whyItMatters:
      'Without it, a visitor’s first request can be made over insecure HTTP before being redirected.',
    howToFix: [
      'Ask your host or CDN to enable HSTS. Start with a short max-age (e.g. one day) and increase it once everything works over HTTPS.',
    ],
    learnMoreUrl: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security',
  },
  {
    id: 'tech.redirects.chain',
    category: 'technical',
    severity: 'low',
    title: 'Page is reached through several redirects',
    whatItMeans: 'The address you entered redirects more than once before reaching the final page.',
    whyItMatters:
      'Each redirect adds a delay, especially on mobile, and long chains can dilute search signals.',
    howToFix: [
      'Point links and redirects directly at the final address so there’s at most one hop.',
    ],
  },
  {
    id: 'tech.mixed_content',
    category: 'technical',
    severity: 'medium',
    title: 'Secure page loads insecure resources',
    whatItMeans: 'This HTTPS page references images, scripts or styles over plain http://.',
    whyItMatters:
      'Browsers block or warn about insecure resources on secure pages, which can break the page’s appearance or features.',
    howToFix: [
      'Change the listed resource addresses to https://.',
      'If a resource isn’t available over HTTPS, host it yourself or find an alternative.',
    ],
    learnMoreUrl: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
  },
  {
    id: 'tech.viewport.missing',
    category: 'technical',
    severity: 'medium',
    title: 'Page isn’t set up for mobile screens',
    whatItMeans: 'The page has no viewport meta tag, which tells phones how to size the page.',
    whyItMatters:
      'Without it, phones show a zoomed-out desktop layout with tiny text. Most visits are from mobile, and Google indexes the mobile version.',
    howToFix: [
      'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
      'Check the layout on a phone afterwards.',
    ],
  },
  {
    id: 'tech.favicon.missing',
    category: 'technical',
    severity: 'info',
    title: 'No favicon declared',
    whatItMeans: 'The page doesn’t declare a site icon (favicon).',
    whyItMatters:
      'Favicons appear in browser tabs, bookmarks and some search results, helping people recognise your site.',
    howToFix: ['Add <link rel="icon" href="/favicon.svg"> (or a .png/.ico) to the <head>.'],
  },
  {
    id: 'tech.page_size.large',
    category: 'technical',
    severity: 'low',
    title: 'Page HTML is very large',
    whatItMeans: 'The HTML document itself (not counting images or scripts) is over 1 MB.',
    whyItMatters:
      'Large documents take longer to download and process, especially on slow mobile connections.',
    howToFix: [
      'Remove inlined data, large embedded scripts or styles, and unused markup.',
      'Paginate or lazy-load very long lists.',
    ],
  },
  {
    id: 'tech.links.broken',
    category: 'technical',
    severity: 'high',
    title: 'Some links on this page are broken',
    whatItMeans:
      'Some links point to pages that returned an error (such as 404 Not Found or 500 Server Error) or didn’t respond in time.',
    whyItMatters:
      'Visitors who click them hit a dead end, and many broken links make a site look poorly maintained.',
    howToFix: [
      'Update each listed link to the correct address, or remove it.',
      'If a page moved, add a permanent (301) redirect from the old address.',
    ],
  },
  {
    id: 'tech.links.not_checked',
    category: 'technical',
    severity: 'info',
    title: 'Some links weren’t checked',
    whatItMeans:
      'We skipped some links because the page has more than we check per scan, a site’s robots.txt asked bots not to visit them, or they point to addresses we don’t scan.',
    whyItMatters: 'Their status is unknown; they may be fine.',
    howToFix: ['No action needed. Check important links manually if you’re unsure.'],
  },
  // ------------------------------------------------------ Accessibility
  {
    id: 'a11y.image_alt.missing',
    category: 'accessibility',
    severity: 'medium',
    title: 'Images are missing alternative text',
    whatItMeans:
      'Some <img> elements have no alt attribute. Alternative text describes an image for people who use screen readers or can’t load images.',
    whyItMatters:
      'Without it, blind and low-vision visitors miss the information those images carry, and some screen readers read out the file name instead.',
    howToFix: [
      'Add a short alt attribute describing each meaningful image, e.g. alt="Fresh sourdough loaves on a counter".',
      'Use an empty alt="" for purely decorative images so screen readers skip them.',
    ],
    learnMoreUrl: 'https://www.w3.org/WAI/tutorials/images/decision-tree/',
  },
  {
    id: 'a11y.html_lang.missing',
    category: 'accessibility',
    severity: 'medium',
    title: 'Page language isn’t declared',
    whatItMeans: 'The <html> element has no lang attribute stating the page’s language.',
    whyItMatters:
      'Screen readers use it to choose the right pronunciation; without it, content may be read in the wrong accent or language. Browsers also use it for translation.',
    howToFix: ['Add the language to the opening tag, e.g. <html lang="en"> or <html lang="hi">.'],
    learnMoreUrl: 'https://www.w3.org/International/questions/qa-html-language-declarations',
  },
] as const satisfies readonly (Omit<CheckDefinition, 'kind'> & { kind?: FindingKind })[];

export type CheckId = (typeof defs)[number]['id'];

export const CHECKS: Record<CheckId, CheckDefinition> = Object.fromEntries(
  defs.map((d) => [
    d.id,
    { kind: 'detected', ...d, howToFix: [...d.howToFix] } satisfies CheckDefinition,
  ]),
) as Record<CheckId, CheckDefinition>;

export const CHECK_IDS = defs.map((d) => d.id) as CheckId[];

export function getCheck(id: string): CheckDefinition | undefined {
  return (CHECKS as Record<string, CheckDefinition>)[id];
}
