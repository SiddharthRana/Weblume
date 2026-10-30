'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ButtonLink } from './button-link';

/** Header actions that depend on sign-in state. */
export function AuthNav() {
  const { configured, user, loading } = useAuth();
  return (
    <div className="hidden items-center gap-2 md:flex">
      {configured &&
        !loading &&
        (user ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Account
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            Log in
          </Link>
        ))}
      <ButtonLink href="/scan">Scan a website</ButtonLink>
    </div>
  );
}
