import { Suspense, type CSSProperties } from 'react';
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
      <section className="hero-glow border-b border-border">
        <Container className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="eyebrow animate-rise">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-gradient" />
              Performance · SEO · Accessibility · Technical health
            </p>
            <h1
              className="text-gradient animate-rise mt-6 pb-1 text-4xl font-semibold tracking-tight sm:text-6xl"
              style={{ '--i': 1 } as CSSProperties}
            >
              Website audits your clients can actually read.
            </h1>
            <p
              className="animate-rise mt-6 max-w-xl text-lg text-fg-muted"
              style={{ '--i': 2 } as CSSProperties}
            >
              Enter a URL. Weblume checks performance, SEO, accessibility and technical health, then
              explains what matters most and exactly how to fix it.
            </p>
            <div
              className="animate-rise mt-9 flex flex-wrap gap-3"
              style={{ '--i': 3 } as CSSProperties}
            >
              <ButtonLink href="/scan">Scan a website free</ButtonLink>
              <ButtonLink href="/sample-report" variant="secondary">
                See a sample report
              </ButtonLink>
            </div>
            <p
              className="animate-rise mt-4 text-sm text-fg-muted"
              style={{ '--i': 4 } as CSSProperties}
            >
              One free scan a day without an account. No credit card needed.
            </p>
          </div>
          <div
            className="border-gradient animate-rise rounded-2xl p-6 shadow-[0_30px_80px_-40px_var(--wl-glow)]"
            style={{ '--i': 2 } as CSSProperties}
            aria-label="Preview of a Weblume report (illustrative)"
            role="img"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg">bakery.example</p>
              <p className="text-xs text-fg-muted">Report preview · illustrative</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-hidden="true">
              <ScoreRing score={54} label="Performance" size={72} index={0} />
              <ScoreRing score={81} label="Accessibility" size={72} index={1} />
              <ScoreRing score={83} label="SEO" size={72} index={2} />
              <ScoreRing score={92} label="Best practices" size={72} index={3} />
            </div>
            <ul className="mt-6 space-y-2" aria-hidden="true">
              {(
                [
                  ['high', '3 links on this page are broken'],
                  ['medium', 'Page has no meta description'],
                  ['low', 'HTTPS is not enforced with HSTS'],
                ] as const
              ).map(([sev, text], i) => (
                <li
                  key={text}
                  className="animate-rise flex items-center gap-3 rounded-lg border border-border bg-bg/60 p-3 text-sm text-fg"
                  style={{ '--i': i + 5 } as CSSProperties}
                >
                  <SeverityBadge severity={sev} /> {text}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="what-we-check">
        <Container>
          <h2
            id="what-we-check"
            className="text-gradient reveal pb-1 text-3xl font-semibold tracking-tight"
          >
            What Weblume checks
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <div key={c.title} className="card card-hover reveal p-6">
                <h3 className="text-lg font-semibold text-fg">{c.title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="border-y border-border bg-surface/50 py-16 sm:py-20"
        aria-labelledby="who"
      >
        <Container>
          <h2 id="who" className="text-gradient reveal pb-1 text-3xl font-semibold tracking-tight">
            Built for people who look after websites
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="reveal">
                <h3 className="text-lg font-semibold text-fg">{a.title}</h3>
                <p className="mt-2 text-fg-muted">{a.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="honest">
        <Container className="max-w-3xl">
          <h2
            id="honest"
            className="text-gradient reveal pb-1 text-3xl font-semibold tracking-tight"
          >
            Honest by design
          </h2>
          <p className="mt-4 text-lg text-fg-muted">
            Every report says what was <strong className="text-fg">measured</strong>, what was{' '}
            <strong className="text-fg">detected automatically</strong>, and what we{' '}
            <strong className="text-fg">recommend</strong>. If a data source fails, we tell you. We
            never fill gaps with guesses. Automated audits are a starting point: they can’t
            guarantee accessibility compliance, rankings or security.
          </p>
        </Container>
      </section>
    </>
  );
}
