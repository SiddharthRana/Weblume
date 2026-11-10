'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { UsageMeter } from '@/components/app/usage-meter';
import { SubscriptionPanel } from '@/components/billing/subscription-panel';
import {
  CheckoutStatus,
  checkoutFailed,
  type CheckoutState,
} from '@/components/billing/checkout-status';
import { Field, FormAlert } from '@/components/auth/form-bits';
import { API_URL, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { currentAccessToken } from '@/lib/supabase';
import { AccountSkeleton, Spinner } from '@/components/loading';

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
    <section aria-labelledby={id} className="card p-6">
      <h2 id={id} className="text-lg font-bold text-fg">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Checking for the new plan after checkout: every 3 s for 30 s, then every 15 s up to 15 minutes. */
const FAST_CHECKS = 10;
const FAST_CHECK_MS = 3_000;
const SLOW_CHECK_MS = 15_000;
const MAX_WAIT_MS = 15 * 60_000;

export function AccountView() {
  const { user, signOut } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSave, setNameSave] = useState<'idle' | 'saving' | 'saved'>('idle');
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

  // After checkout the provider's webhook may land a few seconds after the redirect, or several
  // minutes later: check quickly at first, then quietly in the background, and straight away when
  // the visitor comes back to the tab. A checkout that didn't go through comes back with
  // ?status=failed (or cancelled) instead.
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollNow = useRef<(() => void) | null>(null);
  const stopPolling = useCallback(() => {
    clearTimeout(pollTimer.current);
    pollNow.current = null;
  }, []);
  const pollForPlan = useCallback(() => {
    clearTimeout(pollTimer.current);
    const started = Date.now();
    let tries = 0;
    const poll = async () => {
      clearTimeout(pollTimer.current);
      if (tries < FAST_CHECKS) setCheckout('confirming');
      const { data } = await api.GET('/v1/me').catch(() => ({ data: undefined }));
      if (pollNow.current !== poll) return; // stopped, or restarted by "Check again"
      if (data?.plan.paid) {
        stopPolling();
        setAccount(data);
        setCheckout('active');
      } else if (++tries < FAST_CHECKS) {
        pollTimer.current = setTimeout(poll, FAST_CHECK_MS);
      } else {
        setCheckout('pending');
        if (Date.now() - started < MAX_WAIT_MS) {
          pollTimer.current = setTimeout(poll, SLOW_CHECK_MS);
        } else {
          pollNow.current = null;
        }
      }
    };
    pollNow.current = poll;
    pollTimer.current = setTimeout(poll, 0);
  }, [stopPolling]);
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'visible') pollNow.current?.();
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => document.removeEventListener('visibilitychange', onReturn);
  }, []);
  const returnParams = useRef<URLSearchParams>(undefined);
  useEffect(() => {
    // Kept in a ref: the address is cleaned below, and React may run this effect twice.
    returnParams.current ??= new URLSearchParams(window.location.search);
    const params = returnParams.current;
    if (!params.has('checkout')) return;
    // Drop the provider's parameters so a refresh or a shared link doesn't replay the result.
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    if (checkoutFailed(params.get('status'))) {
      pollTimer.current = setTimeout(() => setCheckout('failed'), 0);
    } else {
      pollForPlan();
    }
    return stopPolling;
  }, [pollForPlan, stopPolling]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameSave('saving');
    try {
      const { data, error } = await api.PATCH('/v1/me', {
        body: { displayName: name.trim() || null },
      });
      if (!data) throw error;
      setAccount(data);
      setNameSave('saved');
    } catch (error) {
      setNameSave('idle');
      setNameError(errorMessage(error));
    }
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
    return <AccountSkeleton />;
  }

  return (
    <div className="space-y-6">
      {checkout && account && (
        <CheckoutStatus
          state={checkout}
          planName={account.plan.name}
          onCheckAgain={pollForPlan}
          onDismiss={() => {
            stopPolling();
            setCheckout(null);
          }}
        />
      )}
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
            onChange={(e) => {
              setName(e.target.value);
              setNameSave('idle');
            }}
            trailing={<NameSaveIndicator state={nameSave} />}
          />
          {nameError && <FormAlert>{nameError}</FormAlert>}
          <button
            type="submit"
            disabled={nameSave === 'saving'}
            className="min-h-11 rounded-lg btn-secondary px-5 text-sm font-semibold disabled:opacity-70"
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
        <SubscriptionPanel account={account} />
      </Section>

      <Section id="data" title="Your data">
        <p className="text-sm text-fg-muted">
          Download everything Weblume holds about your account (profile, plan and all saved reports)
          as a JSON file.
        </p>
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="min-h-11 rounded-lg btn-secondary px-5 text-sm font-semibold disabled:opacity-70"
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
          className="min-h-11 rounded-lg btn-secondary px-5 text-sm font-semibold"
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
          first, because deleting your account doesn’t cancel it.
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

/** Spinner inside the name field while saving, then a green check once saved. */
function NameSaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  return (
    <span role="status" className="flex items-center">
      {state === 'saving' && (
        <>
          <Spinner className="size-5" />
          <span className="sr-only">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <svg
          role="img"
          aria-label="Saved"
          viewBox="0 0 24 24"
          className="checkout-badge-in size-6 text-success"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m7.5 12.5 3 3 6-6.5" pathLength={1} className="checkout-draw" />
        </svg>
      )}
    </span>
  );
}
