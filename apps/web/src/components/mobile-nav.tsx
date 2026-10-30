'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { mainNav } from '@/lib/site';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const { configured, user } = useAuth();
  const accountLinks = !configured
    ? []
    : user
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/account', label: 'Account' },
        ]
      : [{ href: '/login', label: 'Log in' }];

  // Close the menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          {open ? (
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 6h14M3 10h14M3 14h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label="Main"
          className="absolute inset-x-0 top-16 z-20 border-b border-border bg-surface px-4 pb-4 shadow-sm"
        >
          <ul className="flex flex-col">
            {[...mainNav, ...accountLinks].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as never}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="block rounded-md px-2 py-3 text-base font-medium text-fg hover:bg-surface-muted aria-[current=page]:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/scan"
                className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary"
              >
                Scan a website
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
