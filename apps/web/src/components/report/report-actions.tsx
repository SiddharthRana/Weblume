'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { api, API_URL, errorMessage } from '@/lib/api';
import { currentAccessToken } from '@/lib/supabase';

type Entitlements = Schemas['AccountDtoClass']['entitlements'];
type ShareLink = Schemas['ShareLinkDto'];

const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const EXPIRY_OPTIONS = [7, 30, 90, 365] as const;

const buttonClass =
  'inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-fg hover:border-primary disabled:opacity-70';

/** Owner-only actions on a finished report: PDF download, share links and comparison. */
export function ReportActions({ scanId }: { scanId: string }) {
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.GET('/v1/me').then(
      ({ data }) => active && data && setEnt(data.entitlements),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  if (!ent) return null;
  if (!ent.pdfExport && !ent.shareLinks && !ent.comparison) {
    return (
      <aside className="rounded-lg border border-border bg-surface p-4 text-sm text-fg-muted">
        <span className="font-semibold text-fg">Need to send this to a client?</span> PDF reports,
        share links and before/after comparisons are part of Starter.{' '}
        <Link href="/pricing" className="font-medium text-primary underline">
          See plans
        </Link>
      </aside>
    );
  }

  async function downloadPdf() {
    setPdfBusy(true);
    setError(null);
    try {
      const token = await currentAccessToken();
      const res = await fetch(`${API_URL}/v1/scans/${scanId}/report.pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setError(errorMessage(await res.json().catch(() => undefined)));
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ??
        'weblume-report.pdf';
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError(errorMessage(undefined));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3" role="group" aria-label="Report actions">
        {ent.pdfExport && (
          <button type="button" className={buttonClass} onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        )}
        {ent.shareLinks && (
          <button
            type="button"
            className={buttonClass}
            aria-expanded={shareOpen}
            aria-controls="share-panel"
            onClick={() => setShareOpen((o) => !o)}
          >
            Share
          </button>
        )}
        {ent.comparison && (
          <Link href={`/compare?target=${scanId}`} className={buttonClass}>
            Compare with another scan
          </Link>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {shareOpen && <SharePanel scanId={scanId} />}
    </div>
  );
}

function SharePanel({ scanId }: { scanId: string }) {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [days, setDays] = useState<number>(30);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiryId = useId();

  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    let active = true;
    api.GET('/v1/scans/{id}/shares', { params: { path: { id: scanId } } }).then(
      ({ data, error: e }) => {
        if (!active) return;
        if (data) setLinks(data.items);
        else setError(errorMessage(e));
      },
      () => active && setError(errorMessage(undefined)),
    );
    return () => {
      active = false;
    };
  }, [scanId, reload]);

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const { data, error: e } = await api.POST('/v1/scans/{id}/shares', {
        params: { path: { id: scanId } },
        body: { expiresInDays: days },
      });
      if (!data) return setError(errorMessage(e));
      setCreated(data.url);
      refresh();
    } catch {
      setError(errorMessage(undefined));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      const { error: e } = await api.DELETE('/v1/shares/{shareId}', {
        params: { path: { shareId: id } },
      });
      if (e) return setError(errorMessage(e));
      refresh();
    } catch {
      setError(errorMessage(undefined));
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const active = links?.filter((l) => l.active) ?? [];

  return (
    <section
      id="share-panel"
      aria-labelledby="share-heading"
      className="rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="share-heading" className="font-semibold text-fg">
        Share a read-only copy
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Anyone with the link can view this report without an account. Your email and other reports
        stay private, and search engines are asked not to index it.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={expiryId} className="block text-sm font-medium text-fg">
            Link works for
          </label>
          <select
            id={expiryId}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 min-h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg"
          >
            {EXPIRY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d === 365 ? '1 year' : `${d} days`}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-70"
        >
          {busy ? 'Creating…' : 'Create link'}
        </button>
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        A link also stops working when this report reaches the end of its retention period.
      </p>

      {created && (
        <div className="mt-4 rounded-md border border-success p-3" role="status">
          <p className="text-sm font-medium text-fg">
            Link created. Copy it now: for security we only show it once.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              readOnly
              aria-label="Share link"
              value={created}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 w-full flex-1 rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg sm:w-auto"
            />
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-fg"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <h3 className="mt-5 text-sm font-semibold text-fg">Active links</h3>
      {links === null ? (
        <p className="mt-2 text-sm text-fg-muted">Loading…</p>
      ) : active.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">No active links.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border text-sm">
          {active.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-fg-muted">
                Created {dateFmt.format(new Date(l.createdAt))}
                {l.expiresAt ? ` · expires ${dateFmt.format(new Date(l.expiresAt))}` : ''}
              </span>
              <button
                type="button"
                onClick={() => revoke(l.id)}
                className="min-h-11 rounded-md px-3 font-medium text-danger underline"
              >
                Turn off
                <span className="sr-only">
                  {' '}
                  link created {dateFmt.format(new Date(l.createdAt))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
