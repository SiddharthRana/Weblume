'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  AuthCard,
  Field,
  FormAlert,
  NotConfigured,
  safeNext,
  SubmitButton,
} from '@/components/auth/form-bits';
import { CAPTCHA_NOT_READY, useAuthCaptcha } from '@/components/auth/captcha';
import { GoogleButton } from '@/components/auth/google-button';
import { authConfigured, authErrorMessage, getSupabase } from '@/lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const captcha = useAuthCaptcha();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!captcha.ready) {
      setError(CAPTCHA_NOT_READY);
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken: captcha.token },
    });
    setBusy(false);
    captcha.reset();
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    router.replace(next as never);
  }

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          New to Weblume?{' '}
          <Link
            href={
              `/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}` as never
            }
            className="font-medium text-primary underline"
          >
            Create a free account
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {captcha.widget}
            <SubmitButton busy={busy}>{busy ? 'Logging in…' : 'Log in'}</SubmitButton>
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-primary underline">
                Forgot your password?
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthCard>
  );
}
