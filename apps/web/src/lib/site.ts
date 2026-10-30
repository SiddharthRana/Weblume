export const site = {
  name: 'Weblume',
  tagline: 'Website audits your clients can actually read',
  description:
    'Weblume checks a web page for performance, SEO, accessibility and technical issues, then explains what matters and how to fix it — in plain language.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com',
} as const;

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
