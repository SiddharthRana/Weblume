'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { normalizeUrl } from '@weblume/shared';
import { Turnstile } from '@/components/turnstile';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { saveLocalScan } from '@/lib/local-scans';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function ScanForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const { user } = useAuth();
  // Signed-in users are verified by their session; only guests need the bot check.
  const needsCaptcha = Boolean(SITE_KEY) && !user;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeUrl(url);
    if (!normalized.ok) {
      setError(normalized.message);
      return;
    }
    if (needsCaptcha && !token) {
      setError('Please complete the verification below, then try again.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: apiError } = await api.POST('/v1/scans', {
        body: { url: normalized.url, ...(needsCaptcha && token ? { turnstileToken: token } : {}) },
      });
      if (!data) {
        setError(errorMessage(apiError));
        // Turnstile tokens are single-use.
        setToken(null);
        setResetKey((k) => k + 1);
        return;
      }
      saveLocalScan({
        id: data.scan.id,
        url: data.scan.normalizedUrl,
        createdAt: data.scan.createdAt,
        scanToken: data.scanToken,
      });
      router.push(`/scan/${data.scan.id}`);
    } catch {
      setError(errorMessage(undefined));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card p-6 shadow-sm">
      <label htmlFor={inputId} className="block text-sm font-semibold text-fg">
        Website address
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          maxLength={2048}
          className="min-h-12 w-full rounded-md border border-border bg-bg px-4 text-base text-fg placeholder:text-fg-muted"
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 shrink-0 rounded-lg btn-primary px-6 text-sm font-semibold disabled:opacity-70"
        >
          {submitting ? 'Starting…' : 'Scan website'}
        </button>
      </div>
      <p id={errorId} role="alert" className="mt-2 min-h-5 text-sm font-medium text-danger">
        {error}
      </p>
      {needsCaptcha && (
        <div className="mt-2">
          <Turnstile siteKey={SITE_KEY} onToken={setToken} resetKey={resetKey} />
        </div>
      )}
      <p className="mt-3 text-sm text-fg-muted">
        We check one public page. Only scan websites you own or are allowed to evaluate.
      </p>
    </form>
  );
}
