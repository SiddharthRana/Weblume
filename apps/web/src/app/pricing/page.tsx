import type { Metadata } from 'next';
import { formatPrice, PLANS, type Entitlements } from '@weblume/shared';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { SubscribeButtons } from '@/components/billing/subscribe-buttons';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Start free. Upgrade to Starter for more scans, daily monitoring, code fixes, longer history, PDF exports and share links.',
  alternates: { canonical: '/pricing' },
};

function features(e: Entitlements, period: string): string[] {
  return [
    `${e.scansPerPeriod} scans per ${period}`,
    `History kept for ${e.retentionDays >= 365 ? '12 months' : `${e.retentionDays} days`}`,
    'Lighthouse scores (mobile & desktop)',
    ...(e.monitoredSites > 0
      ? [
          `Monitor ${e.monitoredSites} ${e.monitoredSites === 1 ? 'site' : 'sites'} ${
            e.monitorFrequency === 'daily' ? 'daily' : 'weekly'
          }, with email alerts`,
        ]
      : []),
    ...(e.comparison ? ['Compare scans over time'] : []),
    ...(e.codeFixes ? ['Copy-paste code fixes for each issue'] : []),
    ...(e.pdfExport ? ['PDF export'] : []),
    ...(e.shareLinks ? ['Private share links'] : []),
  ];
}

export default function PricingPage() {
  const free = PLANS.free;
  const starter = PLANS.starter;
  const usd = starter.displayPrices?.find((p) => p.currency === 'USD');
  // e.g. $29.99 a year instead of 12 × $3.99 = $47.88.
  const annualSaving = usd ? Math.round((1 - usd.annual / (usd.monthly * 12)) * 100) : 0;

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
            {usd && (
              <div className="mt-2">
                <p className="text-4xl font-bold text-fg">
                  {formatPrice(usd.monthly, 'USD', 'en-US')}
                  <span className="text-base font-normal text-fg-muted"> / month</span>
                </p>
                <p className="mt-1 text-sm text-fg-muted">
                  or {formatPrice(usd.annual, 'USD', 'en-US')} / year
                  {annualSaving > 0 && ` (save ${annualSaving}%)`}
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
            Prices are in US dollars. At checkout you can pay in your local currency, and the final
            amount, including any taxes such as VAT or GST, is shown before you pay.
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
