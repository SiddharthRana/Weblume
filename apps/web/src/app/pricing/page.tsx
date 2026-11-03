import type { Metadata } from 'next';
import { formatPrice, PLANS, type Entitlements } from '@weblume/shared';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { SubscribeButtons } from '@/components/billing/subscribe-buttons';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Start free. Upgrade to Starter for more scans, code fixes, longer history, PDF exports and share links.',
  alternates: { canonical: '/pricing' },
};

function features(e: Entitlements, period: string): string[] {
  return [
    `${e.scansPerPeriod} scans per ${period}`,
    `History kept for ${e.retentionDays >= 365 ? '12 months' : `${e.retentionDays} days`}`,
    'Lighthouse scores (mobile & desktop)',
    ...(e.comparison ? ['Compare scans over time'] : []),
    ...(e.codeFixes ? ['Copy-paste code fixes for each issue'] : []),
    ...(e.pdfExport ? ['PDF export'] : []),
    ...(e.shareLinks ? ['Private share links'] : []),
  ];
}

export default function PricingPage() {
  const free = PLANS.free;
  const starter = PLANS.starter;
  const inr = starter.displayPrices?.find((p) => p.currency === 'INR');
  const usd = starter.displayPrices?.find((p) => p.currency === 'USD');

  return (
    <>
      <PageHeader eyebrow="Pricing" title="Simple pricing that grows with you">
        Start free. Upgrade when you need more scans and client-ready reports.
      </PageHeader>
      <Container className="py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col card card-hover p-8" aria-labelledby="plan-free">
            <h2 id="plan-free" className="text-xl font-bold text-fg">
              {free.name}
            </h2>
            <p className="mt-2 text-4xl font-bold text-fg">
              {formatPrice(0, 'USD')}
              <span className="text-base font-normal text-fg-muted"> forever</span>
            </p>
            <ul className="mt-6 space-y-2 text-fg-muted">
              {features(free.entitlements, 'month').map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </section>
          <section
            className="border-gradient flex flex-col rounded-2xl p-8 shadow-[0_30px_80px_-40px_var(--wl-glow)]"
            aria-labelledby="plan-starter"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="plan-starter" className="text-xl font-bold text-fg">
                {starter.name}
              </h2>
              <span className="bg-brand-gradient rounded-full px-3 py-1 text-xs font-semibold text-white">
                Best for client work
              </span>
            </div>
            {usd && inr && (
              <div className="mt-2">
                <p className="text-4xl font-bold text-fg">
                  {formatPrice(usd.monthly, 'USD', 'en-US')}
                  <span className="text-base font-normal text-fg-muted"> / month</span>
                </p>
                <p className="mt-1 text-sm text-fg-muted">
                  or {formatPrice(usd.annual, 'USD', 'en-US')} / year · India:{' '}
                  {formatPrice(inr.monthly, 'INR', 'en-IN')} / month or{' '}
                  {formatPrice(inr.annual, 'INR', 'en-IN')} / year
                </p>
              </div>
            )}
            <ul className="mt-6 space-y-2 text-fg-muted">
              {features(starter.entitlements, 'billing period').map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <SubscribeButtons />
          </section>
        </div>
        <div className="mt-10 max-w-3xl space-y-2 text-sm text-fg-muted">
          <p>
            Prices shown are indicative. The final price, currency and any applicable taxes (such as
            VAT or GST) are shown at checkout and depend on your billing country.
          </p>
          <p>
            Subscriptions bought in the Android app are billed through Google Play and managed
            there. Subscriptions bought on the web are managed from your account settings. Both
            unlock the same features everywhere.
          </p>
        </div>
      </Container>
    </>
  );
}
