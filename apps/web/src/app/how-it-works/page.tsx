import type { Metadata } from 'next';
import { ButtonLink } from '@/components/button-link';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How a Weblume scan works, what data sources it uses and what its limits are.',
  alternates: { canonical: '/how-it-works' },
};

const steps = [
  {
    title: 'Enter a URL',
    body: 'Paste the address of any public web page. We check it’s a valid public HTTP or HTTPS address.',
  },
  {
    title: 'We fetch and measure',
    body: 'WeblumeBot loads the page once, checks up to 50 of its links, reads robots.txt and the sitemap, and asks Google PageSpeed Insights for Lighthouse measurements on mobile and desktop.',
  },
  {
    title: 'We explain',
    body: 'Findings are grouped by category, rated by severity and paired with plain-language explanations and fixes.',
  },
  {
    title: 'You fix and re-scan',
    body: 'Track progress over time and compare scans to show what improved.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="How it works" title="From URL to action plan in about a minute" />
      <Container className="py-16">
        <ol className="grid gap-6 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="card card-hover p-6">
              <span className="inline-flex size-8 items-center justify-center rounded-full btn-primary text-sm font-bold">
                {i + 1}
              </span>
              <h2 className="mt-3 text-lg font-semibold text-fg">{s.title}</h2>
              <p className="mt-2 text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-16 max-w-3xl" aria-labelledby="limits">
          <h2 id="limits" className="text-2xl font-bold text-fg">
            What automated audits can’t do
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-fg-muted">
            <li>
              Automated accessibility tools catch only part of all accessibility barriers. Manual
              testing with real users and assistive technology is still needed.
            </li>
            <li>
              Good SEO signals don’t guarantee rankings. Content, competition and links matter too.
            </li>
            <li>Weblume is not a security scanner and does not test for vulnerabilities.</li>
            <li>Each scan looks at one page; other pages on the site may differ.</li>
            <li>Lighthouse results are lab measurements and can vary between runs.</li>
          </ul>
        </section>
        <div className="mt-10">
          <ButtonLink href="/sample-report">See a sample report</ButtonLink>
        </div>
      </Container>
    </>
  );
}
