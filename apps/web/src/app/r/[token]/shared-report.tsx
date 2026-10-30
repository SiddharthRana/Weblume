'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ScanReportDto } from '@weblume/shared';
import { ReportView } from '@/components/report/report-view';
import { api, errorMessage } from '@/lib/api';

const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

type State =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
  | { kind: 'report'; report: ScanReportDto; expiresAt: string | null };

/** Read-only report opened from a share link. Sends no credentials. */
export function SharedReport({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error, response } = await api.GET('/v1/shared/{token}', {
          params: { path: { token } },
        });
        if (!active) return;
        if (data)
          return setState({
            kind: 'report',
            report: data.report as ScanReportDto,
            expiresAt: data.shareExpiresAt,
          });
        if (response.status === 404) return setState({ kind: 'not_found' });
        setState({ kind: 'error', message: errorMessage(error) });
      } catch {
        if (active) setState({ kind: 'error', message: errorMessage(undefined) });
      }
    })();
    return () => {
      active = false;
    };
  }, [token, attempt]);

  if (state.kind === 'loading')
    return (
      <p role="status" className="py-16 text-center text-fg-muted">
        Loading report…
      </p>
    );

  if (state.kind === 'not_found')
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">This link doesn’t work</h1>
        <p className="mt-3 text-fg-muted">
          It may have expired, or the person who shared it may have turned it off. Ask them for a
          new link.
        </p>
        <Link href="/" className="mt-6 inline-block font-medium text-primary underline">
          What is Weblume?
        </Link>
      </div>
    );

  if (state.kind === 'error')
    return (
      <div role="alert" className="py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">Couldn’t load this report</h1>
        <p className="mt-3 text-fg-muted">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: 'loading' });
            setAttempt((a) => a + 1);
          }}
          className="mt-6 min-h-11 rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="space-y-8 py-12">
      <p
        role="note"
        className="rounded-md border border-border bg-surface-muted p-3 text-sm text-fg-muted"
      >
        <span className="font-semibold text-fg">Shared report (read-only).</span> Someone shared
        this Weblume report with you
        {state.expiresAt
          ? `; the link works until ${dateFmt.format(new Date(state.expiresAt))}`
          : ''}
        .{' '}
        <Link href="/scan" className="font-medium text-primary underline">
          Scan your own site
        </Link>
      </p>
      <ReportView report={state.report} />
    </div>
  );
}
