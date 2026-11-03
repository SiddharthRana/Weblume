import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Performance, SEO, accessibility and technical checks with plain-language explanations, history and PDF reports.',
  alternates: { canonical: '/features' },
};

const groups = [
  {
    title: 'Clear, prioritised findings',
    items: [
      'Every issue rated critical, high, medium, low or informational',
      'What it means, why it matters and step-by-step fixes',
      'Top priorities shown first so you know where to start',
    ],
  },
  {
    title: 'Real measurements',
    items: [
      'Lighthouse scores from Google PageSpeed Insights, mobile and desktop',
      'Core Web Vitals lab metrics such as Largest Contentful Paint',
      'Each score labelled with its source. No invented numbers',
    ],
  },
  {
    title: 'SEO & technical checks',
    items: [
      'Title, meta description, headings, canonical and indexability',
      'robots.txt and sitemap discovery',
      'HTTPS, redirects, HSTS, mixed content and broken links',
    ],
  },
  {
    title: 'Reports you can share (paid plans)',
    items: [
      'Clean PDF export for clients',
      'Private by default; optional share links that expire and can be revoked',
      'Scan history and side-by-side comparison to show progress',
    ],
  },
  {
    title: 'Web and Android',
    items: [
      'Run scans and read reports on the web or in the Android app',
      'One account and subscription across both',
    ],
  },
  {
    title: 'Safe and respectful scanning',
    items: [
      'A single page per scan, fetched like a normal visitor would',
      'No intrusive testing: we never try to break in',
      'Identifies itself honestly as WeblumeBot',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader eyebrow="Features" title="Everything you need to understand a web page’s health">
        Weblume turns technical audit data into a report anyone can act on.
      </PageHeader>
      <Container className="grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.title} className="card card-hover p-6">
            <h2 className="text-lg font-semibold text-fg">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              {g.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-success">
                    ✓
                  </span>
                  {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
