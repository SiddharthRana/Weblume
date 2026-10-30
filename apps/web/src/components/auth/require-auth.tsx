'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Container } from '../container';
import { NotConfigured } from './form-bits';

/** Client-side gate for signed-in pages. The API enforces authorisation regardless. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, loading, user, leaving } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (configured && !loading && !user && !leaving)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [configured, loading, user, leaving, router, pathname]);

  if (!configured) {
    return (
      <Container className="max-w-xl py-16">
        <NotConfigured />
      </Container>
    );
  }
  if (loading || !user) {
    return (
      <p role="status" className="py-16 text-center text-fg-muted">
        Loading…
      </p>
    );
  }
  return <>{children}</>;
}
