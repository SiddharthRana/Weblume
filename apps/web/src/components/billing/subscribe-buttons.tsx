'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { InlineLoader } from '@/components/loading';
import { useBillingConfigStatus } from '@/lib/billing';
import { site } from '@/lib/site';

/** Pricing-page actions for the paid plan; honest about availability. */
export function SubscribeButtons() {
  // Before launch there's no production API to ask, so don't.
  if (site.comingSoon) return <LaunchingSoon />;
  return <Subscribe />;
}

function LaunchingSoon() {
  return (
    <div className="mt-6 space-y-3">
      <p className="rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
        Weblume launches soon. Want to try it first? Ask us for early access.
      </p>
      <a
        href={`mailto:${site.supportEmail}?subject=Weblume%20early%20access`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg btn-primary px-5 text-sm font-semibold"
      >
        Ask for early access
      </a>
    </div>
  );
}

function Subscribe() {
  const { config, failed } = useBillingConfigStatus();
  const { user, configured } = useAuth();
  const [busy, setBusy] = useState<'monthly' | 'annual' | null>(null);
  const [error, setError] = useState<{ text: string; already?: boolean } | null>(null);

  if (failed) {
    return (
      <p className="mt-6 rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
        We couldn’t check whether checkout is open right now. Please try again in a few minutes.
      </p>
    );
  }
  if (!config) return <InlineLoader label="Checking availability" className="mt-6" />;
  if (!config.enabled || !config.web.available) {
    return (
      <p className="mt-6 rounded-md bg-surface-muted p-3 text-sm text-fg-muted">
        Paid plans are coming soon. Checkout isn’t open yet.
      </p>
    );
  }
  if (!user) {
    return (
      <div className="mt-6">
        <Link
          href={configured ? '/signup?next=%2Fpricing' : '/scan'}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Create an account to subscribe
        </Link>
      </div>
    );
  }

  async function start(interval: 'monthly' | 'annual') {
    setBusy(interval);
    setError(null);
    try {
      const { data, error: err } = await api.POST('/v1/billing/checkout', { body: { interval } });
      if (data) {
        window.location.assign(data.url);
        return;
      }
      const code = (err as { code?: string } | undefined)?.code;
      setError({ text: errorMessage(err), already: code === 'already_subscribed' });
    } catch {
      setError({ text: errorMessage(undefined) });
    }
    setBusy(null);
  }

  return (
    <div className="mt-6 space-y-3">
      {config.web.intervals.includes('monthly') && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => start('monthly')}
          className="min-h-11 w-full rounded-lg btn-primary px-5 text-sm font-semibold disabled:opacity-70"
        >
          {busy === 'monthly' ? 'Opening checkout…' : 'Subscribe monthly'}
        </button>
      )}
      {config.web.intervals.includes('annual') && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => start('annual')}
          className="min-h-11 w-full rounded-lg btn-secondary px-5 text-sm font-semibold disabled:opacity-70"
        >
          {busy === 'annual' ? 'Opening checkout…' : 'Subscribe yearly (save ~37%)'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error.text}{' '}
          {error.already && (
            <Link href="/account" className="underline">
              Manage your subscription
            </Link>
          )}
        </p>
      )}
      <p className="text-xs text-fg-muted">
        Secure checkout by our payment partner, who handles taxes and invoices. Cancel anytime.
      </p>
    </div>
  );
}
