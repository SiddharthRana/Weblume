import Link from 'next/link';
import { site } from '@/lib/site';
import { Container } from './container';
import { LogoMark } from './logo';

const HIGHLIGHTS = [
  'Performance, SEO, accessibility and technical checks in one scan',
  'Every finding explained in plain language, with how to fix it',
  'Copy-paste code fixes and client-ready PDF reports',
];

/** Shown on production before launch, in place of every page except pricing, contact and legal. */
export function ComingSoon() {
  return (
    <section className="hero-glow flex min-h-[70vh] items-center border-b border-border">
      <Container className="py-20 text-center sm:py-28">
        <LogoMark size={56} className="animate-rise mx-auto" />
        <p className="eyebrow animate-rise mx-auto mt-8 w-fit" style={{ ['--i' as string]: 1 }}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-gradient" />
          Launching soon
        </p>
        <h1
          className="text-gradient animate-rise mx-auto mt-6 max-w-3xl pb-1 text-4xl font-semibold tracking-tight sm:text-6xl"
          style={{ ['--i' as string]: 2 }}
        >
          {site.tagline}.
        </h1>
        <p
          className="animate-rise mx-auto mt-6 max-w-xl text-lg text-fg-muted"
          style={{ ['--i' as string]: 3 }}
        >
          We’re putting the finishing touches on Weblume. Soon you’ll be able to check any web page
          and get a report your clients can understand.
        </p>
        <ul
          className="animate-rise mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3"
          style={{ ['--i' as string]: 4 }}
        >
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="card flex gap-3 p-4 text-sm text-fg">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-gradient"
              />
              {h}
            </li>
          ))}
        </ul>
        <div
          className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3"
          style={{ ['--i' as string]: 5 }}
        >
          <a
            href={`mailto:${site.supportEmail}?subject=Weblume%20early%20access`}
            className="inline-flex min-h-11 items-center rounded-lg btn-primary px-5 text-sm font-semibold"
          >
            Ask for early access
          </a>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-lg btn-secondary px-5 text-sm font-semibold"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-6 text-sm text-fg-muted">
          Questions? Email{' '}
          <a href={`mailto:${site.supportEmail}`} className="font-medium text-primary underline">
            {site.supportEmail}
          </a>
          .
        </p>
      </Container>
    </section>
  );
}
