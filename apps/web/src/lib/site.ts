export const site = {
  name: 'Weblume',
  tagline: 'Website audits your clients can actually read',
  description:
    'Weblume checks a web page for performance, SEO, accessibility and technical issues, then explains what matters and how to fix it in plain language.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com',
  /** Non-production builds (e.g. dev.weblu.me) ask search engines to skip the whole site. */
  noindex: process.env.NEXT_PUBLIC_NOINDEX === 'true',
  /** Pre-launch production: everything except the pages below shows a "launching soon" screen. */
  comingSoon: process.env.NEXT_PUBLIC_COMING_SOON === 'true',
  /** Store pages for the mobile apps; null shows "coming soon" instead of a link. */
  apps: {
    // Turn on once the app is published on Google Play (a link before then would lead nowhere).
    android:
      process.env.NEXT_PUBLIC_ANDROID_APP_LIVE === 'true'
        ? 'https://play.google.com/store/apps/details?id=com.weblume.app'
        : null,
    ios: null as string | null,
  },
} as const;

/**
 * Pages that stay visible in coming-soon mode: pricing, contact, the WeblumeBot page and the legal
 * pages, which payment providers and Google Play check on the live website.
 */
export function visibleWhileComingSoon(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return ['/pricing', '/contact', '/bot'].includes(path) || path.startsWith('/legal/');
}

export const mainNav = [
  { href: '/scan', label: 'Scan' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/sample-report', label: 'Sample report' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
] as const;

export const footerNav = {
  Product: [
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/sample-report', label: 'Sample report' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/history', label: 'Your recent scans' },
  ],
  Resources: [
    { href: '/blog', label: 'Blog' },
    { href: '/bot', label: 'About WeblumeBot' },
    { href: '/contact', label: 'Contact & support' },
  ],
  Legal: [
    { href: '/legal/privacy', label: 'Privacy policy' },
    { href: '/legal/terms', label: 'Terms of service' },
    { href: '/legal/refunds', label: 'Refund policy' },
    { href: '/legal/account-deletion', label: 'Delete your account' },
  ],
} as const;
