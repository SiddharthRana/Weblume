'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  AuthCard,
  Field,
  FormAlert,
  NotConfigured,
  SubmitButton,
} from '@/components/auth/form-bits';
import { authConfigured, authErrorMessage, getSupabase } from '@/lib/supabase';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    // Only rate limits are surfaced; we never reveal whether an account exists.
    if (err && (err.status === 429 || /rate/i.test(err.code ?? ''))) {
      setError(authErrorMessage(err));
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      footer={
        <Link href="/login" className="font-medium text-primary underline">
          Back to log in
        </Link>
      }
    >
      {!authConfigured ? (
        <NotConfigured />
      ) : sent ? (
        <FormAlert tone="success">
          If an account exists for that email, we’ve sent a link to reset the password.
        </FormAlert>
      ) : (
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
          <SubmitButton busy={busy}>{busy ? 'Sending…' : 'Send reset link'}</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
