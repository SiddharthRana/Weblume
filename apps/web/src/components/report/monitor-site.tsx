'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { FREQUENCY_LABELS, type Monitor } from '@/lib/monitoring';

type State =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'available' }
  | { kind: 'monitored'; monitor: Monitor }
  | { kind: 'full'; limit: number };

/** "Monitor this site" on a report: re-scan the address on a schedule and email changes. */
export function MonitorSite({ normalizedUrl }: { normalizedUrl: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.GET('/v1/monitors').then(
      ({ data }) => {
        if (!active || !data) return;
        const existing = data.items.find((m) => m.normalizedUrl === normalizedUrl);
        if (existing) setState({ kind: 'monitored', monitor: existing });
        else if (data.limit <= 0) setState({ kind: 'none' });
        else if (data.items.length >= data.limit) setState({ kind: 'full', limit: data.limit });
        else setState({ kind: 'available' });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [normalizedUrl]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: e } = await api.POST('/v1/monitors', { body: { url: normalizedUrl } });
      if (data) setState({ kind: 'monitored', monitor: data });
      else setError(errorMessage(e));
    } catch {
      setError(errorMessage(undefined));
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'loading' || state.kind === 'none') return null;
  return (
    <aside className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      {state.kind === 'monitored' ? (
        <p className="text-fg-muted">
          <span className="font-semibold text-fg">You’re monitoring this site</span> (
          {FREQUENCY_LABELS[state.monitor.frequency].toLowerCase()}
          {state.monitor.enabled ? '' : ', paused'}). We’ll email you when something changes.{' '}
          <Link href="/dashboard#monitoring" className="font-medium text-primary underline">
            Manage
          </Link>
        </p>
      ) : state.kind === 'full' ? (
        <p className="text-fg-muted">
          <span className="font-semibold text-fg">Want to know when this site changes?</span> You’re
          monitoring {state.limit} {state.limit === 1 ? 'site' : 'sites'} already.{' '}
          <Link href="/dashboard#monitoring" className="font-medium text-primary underline">
            Manage monitoring
          </Link>
        </p>
      ) : (
        <>
          <p className="text-fg-muted">
            <span className="font-semibold text-fg">Keep an eye on this site.</span> We’ll re-scan
            it automatically and email you when new issues appear or scores change.
          </p>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="min-h-11 rounded-lg btn-primary px-4 text-sm font-semibold disabled:opacity-70"
          >
            {busy ? 'Starting…' : 'Monitor this site'}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="w-full font-medium text-danger">
          {error}
        </p>
      )}
    </aside>
  );
}
