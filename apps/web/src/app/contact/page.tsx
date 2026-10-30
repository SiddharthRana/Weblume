import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact & support',
  description: 'Get help with Weblume or send us feedback.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="We’re here to help">
        Questions, feedback or a problem with a report? Get in touch.
      </PageHeader>
      <Container className="grid gap-6 py-16 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-fg">Email</h2>
          <p className="mt-2 text-fg-muted">
            <a className="font-medium text-primary underline" href={`mailto:${site.supportEmail}`}>
              {site.supportEmail}
            </a>
          </p>
          <p className="mt-2 text-sm text-fg-muted">We usually reply within two working days.</p>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-fg">Helpful to include</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
            <li>The URL you scanned and roughly when</li>
            <li>What you expected and what happened instead</li>
            <li>Never send passwords or payment card details</li>
          </ul>
        </section>
      </Container>
    </>
  );
}
