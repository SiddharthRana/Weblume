'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';

type State =
  | { kind: 'confirm' }
  | { kind: 'busy' }
  | { kind: 'done'; site: string; already: boolean }
  | { kind: 'error'; message: string };

/**
 * Landing page for the "Pause monitoring" link in digest emails. Works signed out. It asks for a
 * click rather than pausing on load, so link scanners in mail clients don't pause by accident.
 */
export function PauseMonitor() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<State>(
    token ? { kind: 'confirm' } : { kind: 'error', message: 'This link is incomplete.' },
  );

  async function pause() {
    setState({ kind: 'busy' });
    try {
      const { data, error } = await api.POST('/v1/monitors/pause', { body: { token } });
      if (data) setState({ kind: 'done', site: data.targetUrl, already: data.alreadyPaused });
      else setState({ kind: 'error', message: errorMessage(error) });
    } catch {
      setState({ kind: 'error', message: errorMessage(undefined) });
    }
  }

  return (
    <div className="mx-auto max-w-md card p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-fg">Pause monitoring</h1>
      {state.kind === 'done' ? (
        <div role="status" className="mt-4 space-y-3 text-fg-muted">
          <p>
            {state.already ? 'Monitoring was already paused for' : 'Monitoring is paused for'}{' '}
            <span className="break-all font-semibold text-fg">{state.site}</span>. We won’t scan it
            or email you about it until you resume it.
          </p>
          <p>
            <Link href="/dashboard#monitoring" className="font-medium text-primary underline">
              Manage monitoring
            </Link>
          </p>
        </div>
      ) : state.kind === 'error' ? (
        <p role="alert" className="mt-4 font-medium text-danger">
          {state.message}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-fg-muted">
            Stop the scheduled scans and emails for this site? You can resume any time from your
            dashboard.
          </p>
          <button
            type="button"
            onClick={pause}
            disabled={state.kind === 'busy'}
            className="min-h-11 rounded-lg btn-primary px-5 text-sm font-semibold disabled:opacity-70"
          >
            {state.kind === 'busy' ? 'Pausing…' : 'Pause monitoring'}
          </button>
        </div>
      )}
    </div>
  );
}
