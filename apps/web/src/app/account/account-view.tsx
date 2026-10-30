'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { UsageMeter } from '@/components/app/usage-meter';
import { Field, FormAlert } from '@/components/auth/form-bits';
import { API_URL, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { currentAccessToken } from '@/lib/supabase';

type Account = Schemas['AccountDtoClass'];

const fmtDate = new Intl.DateTimeFormat('en', { dateStyle: 'long' });

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface p-6">
      <h2 id={id} className="text-lg font-bold text-fg">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function AccountView() {
  const { user, signOut } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void api.GET('/v1/me').then(
      ({ data, error }) => {
        if (!data) return setLoadError(errorMessage(error));
        setAccount(data);
        setName(data.displayName ?? '');
      },
      () => setLoadError(errorMessage(undefined)),
    );
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    const { data, error } = await api.PATCH('/v1/me', {
      body: { displayName: name.trim() || null },
    });
    if (!data) return setNameMsg({ tone: 'error', text: errorMessage(error) });
    setAccount(data);
    setNameMsg({ tone: 'success', text: 'Saved.' });
  }

  async function exportData() {
    setExporting(true);
    setExportMsg(null);
    try {
      // Fetched directly so the JSON can be saved as a file.
      const token = await currentAccessToken();
      const res = await fetch(`${API_URL}/v1/me/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weblume-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('Your data export has been downloaded.');
    } catch {
      setExportMsg('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    if (confirm !== 'DELETE') return setDeleteError('Type DELETE (in capitals) to confirm.');
    setDeleting(true);
    const { data, error } = await api.DELETE('/v1/me', { body: { confirm } });
    setDeleting(false);
    if (!data) return setDeleteError(errorMessage(error));
    await signOut(`/?accountDeleted=${data.status}`);
  }

  if (loadError) return <FormAlert>{loadError}</FormAlert>;
  if (!account) {
    return (
      <p role="status" className="text-fg-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Section id="profile" title="Profile">
        <p className="text-sm text-fg-muted">
          Signed in as <span className="font-medium text-fg">{user?.email ?? account.email}</span> ·
          member since {fmtDate.format(new Date(account.createdAt))}
        </p>
        <form onSubmit={saveName} className="space-y-3">
          <Field
            id="displayName"
            label="Display name"
            value={name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
          {nameMsg && <FormAlert tone={nameMsg.tone}>{nameMsg.text}</FormAlert>}
          <button
            type="submit"
            className="min-h-11 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-fg hover:bg-surface-muted"
          >
            Save name
          </button>
        </form>
      </Section>

      <Section id="plan" title="Plan and usage">
        <p className="text-fg">
          <span className="font-semibold">{account.plan.name}</span>{' '}
          <span className="text-fg-muted">
            · {account.entitlements.scansPerPeriod} scans per period · reports kept{' '}
            {account.entitlements.retentionDays >= 365
              ? '12 months'
              : `${account.entitlements.retentionDays} days`}
          </span>
        </p>
        <UsageMeter
          used={account.usage.used}
          limit={account.usage.limit}
          resetsAt={account.usage.resetsAt}
        />
        {account.subscriptions.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Paid plans with more scans, PDF reports and share links are coming soon.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-fg-muted">
            {account.subscriptions.map((s, i) => (
              <li key={i}>
                {s.planId} via {s.provider === 'google_play' ? 'Google Play' : 'web'} —{' '}
                {s.status.replace('_', ' ')}
                {s.currentPeriodEnd &&
                  ` · ${s.cancelAtPeriodEnd ? 'ends' : 'renews'} ${fmtDate.format(new Date(s.currentPeriodEnd))}`}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="data" title="Your data">
        <p className="text-sm text-fg-muted">
          Download everything Weblume holds about your account — profile, plan and all saved reports
          — as a JSON file.
        </p>
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="min-h-11 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-fg hover:bg-surface-muted disabled:opacity-70"
        >
          {exporting ? 'Preparing…' : 'Download my data'}
        </button>
        {exportMsg && (
          <p role="status" className="text-sm text-fg-muted">
            {exportMsg}
          </p>
        )}
      </Section>

      <Section id="session" title="Session">
        <button
          type="button"
          onClick={() => signOut('/')}
          className="min-h-11 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-fg hover:bg-surface-muted"
        >
          Log out
        </button>
      </Section>

      <section
        aria-labelledby="danger"
        className="rounded-lg border-2 border-danger bg-surface p-6"
      >
        <h2 id="danger" className="text-lg font-bold text-danger">
          Delete account
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          This permanently deletes your account, your saved reports and your settings. It can’t be
          undone. If you subscribed through Google Play, cancel the subscription in Google Play
          first — deleting your account doesn’t cancel it.
        </p>
        <form onSubmit={deleteAccount} className="mt-4 space-y-3">
          <Field
            id="confirmDelete"
            label='Type "DELETE" to confirm'
            value={confirm}
            autoComplete="off"
            onChange={(e) => setConfirm(e.target.value)}
            error={deleteError}
          />
          <button
            type="submit"
            disabled={deleting}
            className="min-h-11 rounded-md bg-danger px-5 text-sm font-semibold text-on-primary disabled:opacity-70"
          >
            {deleting ? 'Deleting…' : 'Permanently delete my account'}
          </button>
        </form>
      </section>
    </div>
  );
}
