'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ButtonLink } from './button-link';

/** Header actions that depend on sign-in state. */
export function AuthNav() {
  const { configured, user, loading } = useAuth();
  return (
    <div className="hidden items-center gap-1 lg:flex">
      {configured &&
        !loading &&
        (user ? (
          <>
            <Link
              href="/dashboard"
              className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Account
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            Log in
          </Link>
        ))}
      <ButtonLink href="/scan" className="whitespace-nowrap">
        Scan a website
      </ButtonLink>
    </div>
  );
}
