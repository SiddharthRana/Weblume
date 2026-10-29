import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About WeblumeBot',
  description: 'What WeblumeBot is, what it requests from your site and how to contact us.',
  alternates: { canonical: '/bot' },
};

export default function BotPage() {
  return (
    <>
      <PageHeader eyebrow="WeblumeBot" title="Did WeblumeBot visit your site?">
        WeblumeBot fetches pages only when a Weblume user asks for an audit of a specific URL.
      </PageHeader>
      <Container className="py-16">
        <div className="prose">
          <h2>How it identifies itself</h2>
          <p>
            <code>User-Agent: WeblumeBot/1.0 (+{site.url}/bot)</code>
          </p>
          <h2>What it requests</h2>
          <ul>
            <li>The one page a user asked to audit, fetched once.</li>
            <li>
              Your <code>robots.txt</code> and sitemap.
            </li>
            <li>
              Up to 50 links found on that page, checked with lightweight requests, respecting{' '}
              <code>robots.txt</code>.
            </li>
          </ul>
          <p>It doesn’t submit forms, log in, run vulnerability tests or crawl your whole site.</p>
          <p>
            Performance measurements are made by Google PageSpeed Insights, which visits your page
            from Google’s infrastructure.
          </p>
          <h2>Contact</h2>
          <p>
            If you have concerns about WeblumeBot’s activity, email{' '}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
          </p>
        </div>
      </Container>
    </>
  );
}
