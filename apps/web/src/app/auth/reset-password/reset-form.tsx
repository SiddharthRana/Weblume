'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard, Field, FormAlert, SubmitButton } from '@/components/auth/form-bits';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage, getSupabase, passwordProblems } from '@/lib/supabase';

/** Reached from the password-reset email; the recovery code is exchanged for a session on load. */
export function ResetForm() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <p role="status" className="py-16 text-center text-fg-muted">
        Checking your link…
      </p>
    );
  }
  if (!user) {
    return (
      <AuthCard title="Reset link expired">
        <FormAlert>
          This password reset link is invalid or has expired. Request a new one.
        </FormAlert>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problems = passwordProblems(password);
    if (problems.length) return setError(`Your password needs ${problems.join(', ')}.`);
    if (password !== confirm) return setError('The passwords don’t match.');
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(authErrorMessage(err));
    router.replace('/dashboard?passwordUpdated=1' as never);
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <Field
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 10 characters, with upper- and lowercase letters and a number."
          required
        />
        <Field
          id="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <SubmitButton busy={busy}>{busy ? 'Saving…' : 'Save new password'}</SubmitButton>
      </form>
    </AuthCard>
  );
}
