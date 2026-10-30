import type { Severity } from '@weblume/shared';
import type { LighthouseAudit } from './psi.types';

/**
 * Lighthouse audits that duplicate one of our own checks. We report ours (curated copy) and skip these.
 */
export const DUPLICATE_OF_OWN_CHECK = new Set([
  'document-title',
  'meta-description',
  'html-has-lang',
  'image-alt',
  'viewport',
  'is-crawlable',
  'canonical',
  'robots-txt',
  'is-on-https',
  'http-status-code',
]);

const METRIC_AUDITS = new Set([
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
]);

export function isMetric(id: string): boolean {
  return METRIC_AUDITS.has(id);
}

/** Severity rules for Lighthouse findings — documented in docs/scoring.md. */
export function lighthouseSeverity(a: LighthouseAudit): Severity {
  if (isMetric(a.id)) return a.score < 0.5 ? 'high' : 'medium';
  switch (a.lhCategory) {
    case 'performance':
      return a.score < 0.5 ? 'medium' : 'low';
    case 'accessibility':
      return a.weight >= 10 ? 'high' : a.weight >= 7 ? 'medium' : 'low';
    case 'seo':
      return 'medium';
    default:
      return 'low';
  }
}

const WHY_BY_CATEGORY: Record<string, string> = {
  performance:
    'Slow pages lose visitors — especially on mobile connections — and page speed is one of the signals search engines use.',
  accessibility:
    'Barriers like this can stop people using screen readers, keyboards or magnifiers from using your site, and may create legal risk in some countries.',
  seo: 'This can make it harder for search engines to understand, index or display your page well.',
  'best-practices': 'This affects the reliability, security or quality of the page for visitors.',
};

interface Copy {
  whatItMeans?: string;
  howToFix: string[];
}

/** Curated plain-language copy for the most common Lighthouse audits. Others fall back to Lighthouse's own text. */
const OVERRIDES: Record<string, Copy> = {
  'largest-contentful-paint': {
    whatItMeans:
      'Largest Contentful Paint (LCP) measures when the biggest piece of content on screen — usually a hero image or heading — finishes loading. Google recommends 2.5 seconds or less.',
    howToFix: [
      'Compress the main image and serve it in a modern format such as WebP or AVIF, at the size it’s displayed.',
      'Don’t lazy-load the main image; consider fetchpriority="high" on it.',
      'Remove or defer render-blocking scripts and styles at the top of the page.',
      'Use caching or a CDN so the page’s HTML arrives quickly.',
    ],
  },
  'first-contentful-paint': {
    whatItMeans:
      'First Contentful Paint (FCP) measures how long it takes before anything — text or an image — appears on screen.',
    howToFix: [
      'Reduce render-blocking CSS and JavaScript in the <head>.',
      'Speed up the server response with caching or a CDN.',
      'Use font-display: swap so text shows while web fonts load.',
    ],
  },
  'total-blocking-time': {
    whatItMeans:
      'Total Blocking Time (TBT) adds up how long the browser was too busy running JavaScript to respond to taps and clicks while the page loaded.',
    howToFix: [
      'Remove unused JavaScript, plugins and third-party widgets.',
      'Load non-essential scripts with defer or after the page is interactive.',
      'Split large scripts so less runs at once.',
    ],
  },
  'cumulative-layout-shift': {
    whatItMeans:
      'Cumulative Layout Shift (CLS) measures how much content jumps around while the page loads — for example when an image or ad pushes text down.',
    howToFix: [
      'Give images, videos and embeds width and height attributes (or a CSS aspect-ratio).',
      'Reserve space for ads, banners and cookie notices before they load.',
      'Avoid inserting content above existing content after load.',
    ],
  },
  'speed-index': {
    whatItMeans:
      'Speed Index measures how quickly the visible part of the page fills in during loading.',
    howToFix: [
      'Prioritise content above the fold and defer everything else.',
      'Reduce render-blocking resources and large images.',
    ],
  },
  'color-contrast': {
    whatItMeans:
      'Some text doesn’t have enough contrast with its background to be read comfortably.',
    howToFix: [
      'Darken the text or lighten the background (or vice versa) until the contrast ratio is at least 4.5:1 for normal text and 3:1 for large text.',
      'Check your brand colours with a contrast checker before using them for text.',
    ],
  },
  'link-name': {
    whatItMeans:
      'Some links have no text a screen reader can announce — for example icon-only links.',
    howToFix: [
      'Add visible text, or an aria-label describing where the link goes, e.g. aria-label="Instagram".',
    ],
  },
  'button-name': {
    whatItMeans: 'Some buttons have no accessible name, so screen readers announce just “button”.',
    howToFix: ['Add visible text to the button, or an aria-label describing what it does.'],
  },
  label: {
    whatItMeans: 'Some form fields have no label, so screen-reader users don’t know what to enter.',
    howToFix: [
      'Add a <label for="…"> for each field, or an aria-label if a visible label isn’t possible.',
    ],
  },
  'render-blocking-resources': {
    howToFix: [
      'Inline the CSS needed for the first screen and load the rest later.',
      'Add defer or async to scripts that aren’t needed immediately.',
    ],
  },
  'render-blocking-insight': {
    howToFix: [
      'Inline the CSS needed for the first screen and load the rest later.',
      'Add defer or async to scripts that aren’t needed immediately.',
    ],
  },
  'uses-optimized-images': {
    howToFix: [
      'Compress images (e.g. with Squoosh or your CMS’s image optimiser) and use WebP or AVIF.',
    ],
  },
  'image-delivery-insight': {
    howToFix: [
      'Compress images, serve modern formats (WebP/AVIF) and size them to how large they’re displayed.',
    ],
  },
  'unused-javascript': {
    howToFix: [
      'Remove plugins and scripts you don’t use.',
      'Load page-specific scripts only on the pages that need them.',
    ],
  },
};

const GENERIC_FIX = [
  'Follow the guidance in the linked Lighthouse documentation, then re-scan to confirm the fix.',
];

/** Strips Markdown links/code from Lighthouse descriptions and extracts the "Learn more" URL. */
export function parseLighthouseDescription(md: string): { text: string; learnMoreUrl?: string } {
  let learnMoreUrl: string | undefined;
  const text = md
    .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)\.?/g, (_m, label: string, url: string) => {
      if (/learn/i.test(label)) {
        learnMoreUrl ??= url;
        return '';
      }
      return label;
    })
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, learnMoreUrl };
}

export function lighthouseCopy(a: LighthouseAudit) {
  const parsed = parseLighthouseDescription(a.description);
  const override = OVERRIDES[a.id];
  return {
    title: a.displayValue && isMetric(a.id) ? `${a.title}: ${a.displayValue}` : a.title,
    whatItMeans: override?.whatItMeans ?? (parsed.text || a.title),
    whyItMatters: WHY_BY_CATEGORY[a.lhCategory] ?? WHY_BY_CATEGORY['best-practices']!,
    howToFix: override?.howToFix ?? GENERIC_FIX,
    learnMoreUrl: parsed.learnMoreUrl,
  };
}
