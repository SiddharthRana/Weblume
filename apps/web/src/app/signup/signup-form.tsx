'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  AuthCard,
  Field,
  FormAlert,
  NotConfigured,
  safeNext,
  SubmitButton,
} from '@/components/auth/form-bits';
import { GoogleButton } from '@/components/auth/google-button';
import { authConfigured, authErrorMessage, getSupabase, passwordProblems } from '@/lib/supabase';

export function SignupForm() {
  const next = safeNext(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPwError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    const problems = passwordProblems(password);
    if (problems.length) {
      setPwError(`Your password needs ${problems.join(', ')}.`);
      return;
    }
    setBusy(true);
    const { data, error: err } = await getSupabase()!.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    if (data.session) {
      window.location.assign(next);
      return;
    }
    // Email confirmation required. The same message is shown whether or not the address was already registered.
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <FormAlert tone="success">
          If <strong>{sentTo}</strong> can be used for a new account, we’ve sent a confirmation link
          to it. Open the link to finish creating your account.
        </FormAlert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your free account"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </>
      }
    >
      {!authConfigured ? (
        <NotConfigured />
      ) : (
        <>
          <GoogleButton next={next} />
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormAlert>{error}</FormAlert>
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 10 characters, with upper- and lowercase letters and a number."
              error={pwError}
              required
            />
            <SubmitButton busy={busy}>{busy ? 'Creating account…' : 'Create account'}</SubmitButton>
            <p className="text-xs text-fg-muted">
              By creating an account you agree to the{' '}
              <Link href="/legal/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline">
                Privacy policy
              </Link>
              . Scans you ran on this device as a guest will be moved into your account.
            </p>
          </form>
        </>
      )}
    </AuthCard>
  );
}
