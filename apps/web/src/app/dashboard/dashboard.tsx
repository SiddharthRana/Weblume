'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ScanSummaryDto } from '@weblume/shared';
import type { Schemas } from '@weblume/api-client-ts';
import { ScanList } from '@/components/app/scan-list';
import { UsageMeter } from '@/components/app/usage-meter';
import { FormAlert } from '@/components/auth/form-bits';
import { api, errorMessage } from '@/lib/api';

type Account = Schemas['AccountDtoClass'];

export function Dashboard() {
  const params = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [scans, setScans] = useState<ScanSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [me, list] = await Promise.all([
          api.GET('/v1/me'),
          api.GET('/v1/scans', { params: { query: { limit: 5 } } }),
        ]);
        if (!active) return;
        if (!me.data || !list.data) return setError(errorMessage(me.error ?? list.error));
        setAccount(me.data);
        setScans(list.data.items as ScanSummaryDto[]);
      } catch {
        if (active) setError(errorMessage(undefined));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-fg">
            {account?.displayName ? `Hi, ${account.displayName}` : 'Welcome back'}
          </h1>
        </div>
        <Link
          href="/scan"
          className="inline-flex min-h-11 items-center rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          New scan
        </Link>
      </div>
      {params.get('passwordUpdated') && (
        <FormAlert tone="success">Your password has been updated.</FormAlert>
      )}
      <FormAlert>{error}</FormAlert>
      {!error && !account && (
        <p role="status" className="text-fg-muted">
          Loading…
        </p>
      )}
      {account && (
        <section aria-labelledby="usage" className="grid gap-6 card p-6 md:grid-cols-2">
          <div>
            <h2 id="usage" className="text-lg font-bold text-fg">
              {account.plan.name} plan
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Reports are kept for{' '}
              {account.entitlements.retentionDays >= 365
                ? '12 months'
                : `${account.entitlements.retentionDays} days`}
              .{' '}
              <Link href="/account" className="text-primary underline">
                Manage account
              </Link>
            </p>
          </div>
          <UsageMeter
            used={account.usage.used}
            limit={account.usage.limit}
            resetsAt={account.usage.resetsAt}
          />
        </section>
      )}
      {scans && (
        <section aria-labelledby="recent" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="recent" className="text-xl font-bold text-fg">
              Recent scans
            </h2>
            {scans.length > 0 && (
              <Link href="/history" className="text-sm font-medium text-primary underline">
                View all
              </Link>
            )}
          </div>
          {scans.length ? (
            <ScanList scans={scans} />
          ) : (
            <div className="card p-8 text-center">
              <p className="font-semibold text-fg">No scans yet</p>
              <p className="mt-1 text-fg-muted">Run your first scan to see a report here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
