'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { MONITOR_ALERTS, type MonitorAlert, type MonitorFrequency } from '@weblume/shared';
import { api, errorMessage } from '@/lib/api';
import {
  ALERT_DESCRIPTIONS,
  ALERT_LABELS,
  allowedFrequencies,
  FREQUENCY_LABELS,
  skipMessage,
  type Monitor,
  type MonitorList,
} from '@/lib/monitoring';
import { Select } from '../select';
import { ListSkeleton } from '../loading';

const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

/** Dashboard section: sites re-scanned on a schedule, with email digests when they change. */
export function MonitoringSection() {
  const [list, setList] = useState<MonitorList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    api.GET('/v1/monitors').then(
      ({ data, error: e }) => {
        if (!active) return;
        if (data) setList(data);
        else setError(errorMessage(e));
      },
      () => active && setError(errorMessage(undefined)),
    );
    return () => {
      active = false;
    };
  }, [reload]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await api.POST('/v1/monitors', { body: { url: url.trim() } });
      if (!data) return setError(errorMessage(err));
      setUrl('');
      setReload((n) => n + 1);
    } catch {
      setError(errorMessage(undefined));
    } finally {
      setBusy(false);
    }
  }

  async function update(
    m: Monitor,
    body: { enabled?: boolean; frequency?: MonitorFrequency; alert?: MonitorAlert },
  ) {
    setError(null);
    try {
      const { data, error: err } = await api.PATCH('/v1/monitors/{id}', {
        params: { path: { id: m.id } },
        body,
      });
      if (!data) return setError(errorMessage(err));
      setList((l) => l && { ...l, items: l.items.map((x) => (x.id === m.id ? data : x)) });
    } catch {
      setError(errorMessage(undefined));
    }
  }

  async function remove(m: Monitor) {
    setError(null);
    try {
      const { error: err } = await api.DELETE('/v1/monitors/{id}', {
        params: { path: { id: m.id } },
      });
      if (err) return setError(errorMessage(err));
      setList((l) => l && { ...l, items: l.items.filter((x) => x.id !== m.id) });
    } catch {
      setError(errorMessage(undefined));
    }
  }

  const frequencies = allowedFrequencies(list?.fastestFrequency ?? null);
  const full = !!list && list.items.length >= list.limit;

  return (
    <section id="monitoring" aria-labelledby="monitoring-heading" className="space-y-4">
      <div>
        <h2 id="monitoring-heading" className="text-xl font-bold text-fg">
          Monitoring
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          We re-scan these sites automatically and email you a short summary when something changes:
          new issues, fixed issues or a big score change. Scheduled scans don’t use your monthly
          scans.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!list ? (
        !error && <ListSkeleton rows={2} label="Loading your monitored sites" />
      ) : (
        <>
          {list.items.length > 0 && (
            <ul className="divide-y divide-border card" aria-label="Monitored sites">
              {list.items.map((m) => (
                <MonitorRow
                  key={m.id}
                  monitor={m}
                  frequencies={frequencies}
                  onUpdate={(b) => update(m, b)}
                  onRemove={() => remove(m)}
                />
              ))}
            </ul>
          )}
          {list.limit > 0 && !full && (
            <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label htmlFor="monitor-url" className="block text-sm font-semibold text-fg">
                  {list.items.length ? 'Monitor another site' : 'Monitor a site'}
                </label>
                <input
                  id="monitor-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="min-h-11 rounded-lg btn-primary px-4 text-sm font-semibold disabled:opacity-70"
              >
                {busy ? 'Adding…' : 'Start monitoring'}
              </button>
              <p className="w-full text-xs text-fg-muted">
                {list.items.length} of {list.limit} {list.limit === 1 ? 'site' : 'sites'} used ·{' '}
                {FREQUENCY_LABELS[frequencies[0] ?? 'weekly'].toLowerCase()} at most.
              </p>
            </form>
          )}
          {list.fastestFrequency !== 'daily' && (
            <p className="card p-4 text-sm text-fg-muted">
              {full
                ? `Your plan includes ${list.limit} monitored ${list.limit === 1 ? 'site' : 'sites'}.`
                : 'Want daily checks?'}{' '}
              Starter monitors up to 5 sites every day.{' '}
              <Link href="/pricing" className="font-medium text-primary underline">
                See plans
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function MonitorRow({
  monitor: m,
  frequencies,
  onUpdate,
  onRemove,
}: {
  monitor: Monitor;
  frequencies: MonitorFrequency[];
  onUpdate: (body: {
    enabled?: boolean;
    frequency?: MonitorFrequency;
    alert?: MonitorAlert;
  }) => void;
  onRemove: () => void;
}) {
  const skip = skipMessage(m.lastSkipReason);
  const options = frequencies.includes(m.frequency) ? frequencies : [m.frequency, ...frequencies];
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 break-all font-medium text-fg">{m.normalizedUrl}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-fg">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${m.enabled ? 'bg-success' : 'bg-fg-muted'}`}
          />
          {m.enabled ? 'Active' : 'Paused'}
        </span>
      </div>
      <p className="text-sm text-fg-muted">
        {m.enabled ? (
          <>
            Next scan <time dateTime={m.nextRunAt}>{dateFmt.format(new Date(m.nextRunAt))}</time>
          </>
        ) : (
          'No scans or emails while paused.'
        )}
        {m.lastScan && (
          <>
            {' · '}
            <Link href={`/scan/${m.lastScan.id}`} className="text-primary underline">
              Latest report
            </Link>
          </>
        )}
      </p>
      {skip && <p className="text-sm text-sev-medium">{skip}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="How often"
          value={m.frequency}
          onChange={(frequency) => onUpdate({ frequency })}
          options={options.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
        />
        <Select
          label="Email me when"
          value={m.alert}
          onChange={(alert) => onUpdate({ alert })}
          options={MONITOR_ALERTS.map((a) => ({ value: a, label: ALERT_LABELS[a] }))}
        />
        <button
          type="button"
          onClick={() => onUpdate({ enabled: !m.enabled })}
          className="min-h-11 rounded-lg btn-secondary px-4 text-sm font-semibold"
        >
          {m.enabled ? 'Pause' : 'Resume'}
          <span className="sr-only"> monitoring {m.normalizedUrl}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 rounded-md px-3 text-sm font-medium text-danger underline"
        >
          Stop monitoring<span className="sr-only"> {m.normalizedUrl}</span>
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-fg-muted">
        {ALERT_DESCRIPTIONS[m.alert]}
      </p>
    </li>
  );
}
