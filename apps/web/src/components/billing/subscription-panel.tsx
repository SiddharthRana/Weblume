'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { api, errorMessage } from '@/lib/api';
import { grantsAccess, playManageUrl, useBillingConfig } from '@/lib/billing';

type Account = Schemas['AccountDtoClass'];

const fmtDate = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
const STATUS_LABEL: Record<string, string> = {
  trialing: 'Trial',
  active: 'Active',
  grace_period: 'Payment issue — still active while it’s retried',
  on_hold: 'On hold — payment failed',
  paused: 'Paused',
  canceled: 'Cancelled',
  expired: 'Ended',
  refunded: 'Refunded',
};

export function SubscriptionPanel({ account }: { account: Account }) {
  const config = useBillingConfig();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const subs = account.subscriptions;
  const active = subs.filter(grantsAccess);
  const playPkg = config?.googlePlay.packageName ?? 'com.weblume.app';
  const playSub = config?.googlePlay.subscriptionId ?? 'weblume_starter';

  async function openPortal() {
    setOpening(true);
    setError(null);
    try {
      const { data, error: err } = await api.POST('/v1/billing/portal');
      if (data) return window.location.assign(data.url);
      setError(errorMessage(err));
    } catch {
      setError(errorMessage(undefined));
    }
    setOpening(false);
  }

  if (!subs.length) {
    return config?.enabled && config.web.available ? (
      <Link
        href="/pricing"
        className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary"
      >
        Upgrade to Starter
      </Link>
    ) : (
      <p className="text-sm text-fg-muted">
        Paid plans with more scans, PDF reports and share links are coming soon.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {active.length > 1 && (
        <p role="alert" className="rounded-md bg-sev-medium-bg p-3 text-sm text-sev-medium">
          You have more than one active subscription (for example on the web and in Google Play).
          You’re only charged for what you keep — cancel the one you don’t need to avoid paying
          twice.
        </p>
      )}
      <ul className="space-y-3">
        {subs.map((s, i) => (
          <li key={i} className="rounded-md border border-border p-3 text-sm">
            <p className="font-semibold text-fg">
              Starter · {s.provider === 'google_play' ? 'Google Play' : 'Web'}
            </p>
            <p className="text-fg-muted">
              {STATUS_LABEL[s.status] ?? s.status}
              {s.currentPeriodEnd &&
                grantsAccess(s) &&
                ` · ${s.cancelAtPeriodEnd || s.status === 'canceled' ? 'access until' : 'renews'} ${fmtDate.format(new Date(s.currentPeriodEnd))}`}
            </p>
            <div className="mt-2">
              {s.provider === 'google_play' ? (
                <a
                  href={playManageUrl(playPkg, playSub)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline"
                >
                  Manage in Google Play<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={opening}
                  className="min-h-11 rounded-md border border-border bg-surface px-4 font-semibold text-fg hover:bg-surface-muted disabled:opacity-70"
                >
                  {opening ? 'Opening…' : 'Manage subscription'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
