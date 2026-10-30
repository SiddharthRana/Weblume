import { Suspense } from 'react';
import { AccountDeletedNotice } from '@/components/account-deleted-notice';
import { ButtonLink } from '@/components/button-link';
import { Container } from '@/components/container';
import { ScoreRing } from '@/components/report/score-ring';
import { SeverityBadge } from '@/components/report/severity-badge';

const categories = [
  {
    title: 'Performance',
    body: 'Real Lighthouse lab measurements from Google PageSpeed Insights, for mobile and desktop.',
  },
  {
    title: 'SEO',
    body: 'Titles, descriptions, headings, canonical URLs, indexability, robots.txt and sitemaps.',
  },
  {
    title: 'Accessibility',
    body: 'Automated accessibility checks that catch common barriers like missing alt text and low contrast.',
  },
  {
    title: 'Technical health',
    body: 'HTTPS, redirects, status codes, broken links, mixed content and basic metadata.',
  },
];

const audiences = [
  {
    title: 'Freelancers & agencies',
    body: 'Hand clients a clear, prioritised report instead of a wall of jargon.',
  },
  { title: 'Developers', body: 'Get a quick health check before launch or after a big change.' },
  {
    title: 'Small businesses',
    body: 'Understand what’s holding your site back, in plain language, without hiring an expert first.',
  },
];

export default function HomePage() {
  return (
    <>
      <Suspense>
        <AccountDeletedNotice />
      </Suspense>
      <section className="border-b border-border bg-surface">
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              Website audits your clients can actually read.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-fg-muted">
              Enter a URL. Weblume checks performance, SEO, accessibility and technical health, then
              explains what matters most and exactly how to fix it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/scan">Scan a website free</ButtonLink>
              <ButtonLink href="/sample-report" variant="secondary">
                See a sample report
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-fg-muted">
              One free scan a day without an account. No credit card needed.
            </p>
          </div>
          <div
            className="rounded-lg border border-border bg-bg p-6 shadow-sm"
            aria-label="Preview of a Weblume report (illustrative)"
            role="img"
          >
            <p className="text-sm font-semibold text-fg">Report preview · illustrative</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-hidden="true">
              <ScoreRing score={54} label="Performance" size={72} />
              <ScoreRing score={81} label="Accessibility" size={72} />
              <ScoreRing score={83} label="SEO" size={72} />
              <ScoreRing score={92} label="Best practices" size={72} />
            </div>
            <ul className="mt-6 space-y-2" aria-hidden="true">
              <li className="flex items-center gap-3 rounded-md bg-surface p-3 text-sm">
                <SeverityBadge severity="high" /> 3 links on this page are broken
              </li>
              <li className="flex items-center gap-3 rounded-md bg-surface p-3 text-sm">
                <SeverityBadge severity="medium" /> Page has no meta description
              </li>
              <li className="flex items-center gap-3 rounded-md bg-surface p-3 text-sm">
                <SeverityBadge severity="low" /> HTTPS is not enforced with HSTS
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="what-we-check">
        <Container>
          <h2 id="what-we-check" className="text-3xl font-bold tracking-tight text-fg">
            What Weblume checks
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <div key={c.title} className="rounded-lg border border-border bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{c.title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-16 sm:py-20" aria-labelledby="who">
        <Container>
          <h2 id="who" className="text-3xl font-bold tracking-tight text-fg">
            Built for people who look after websites
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title}>
                <h3 className="text-lg font-semibold text-fg">{a.title}</h3>
                <p className="mt-2 text-fg-muted">{a.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="honest">
        <Container className="max-w-3xl">
          <h2 id="honest" className="text-3xl font-bold tracking-tight text-fg">
            Honest by design
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Every report says what was <strong className="text-fg">measured</strong>, what was{' '}
            <strong className="text-fg">detected automatically</strong>, and what we{' '}
            <strong className="text-fg">recommend</strong>. If a data source fails, we tell you — we
            never fill gaps with guesses. Automated audits are a starting point: they can’t
            guarantee accessibility compliance, rankings or security.
          </p>
        </Container>
      </section>
    </>
  );
}
