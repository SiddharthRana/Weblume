import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode } from 'react';

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-12 sm:py-16">
      <div className="card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-fg">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  trailing,
  ...input
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Shown inside the field on the right, for example a saving spinner or a check. */
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={`min-h-12 w-full rounded-md border border-border bg-bg px-4 text-base text-fg ${trailing ? 'pr-11' : ''}`}
          {...input}
        />
        {trailing && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {trailing}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="min-h-12 w-full rounded-lg btn-primary px-5 text-sm font-semibold disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success';
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md p-3 text-sm ${tone === 'error' ? 'bg-sev-critical-bg text-sev-critical' : 'bg-surface-muted text-fg'}`}
    >
      {children}
    </div>
  );
}

export function NotConfigured() {
  return (
    <FormAlert>
      Accounts aren’t available on this server yet. You can still{' '}
      <Link href="/scan" className="underline">
        run a free scan
      </Link>{' '}
      without an account.
    </FormAlert>
  );
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : fallback;
}
