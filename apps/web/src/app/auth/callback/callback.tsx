'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard, FormAlert, safeNext } from '@/components/auth/form-bits';
import { getSupabase } from '@/lib/supabase';
import { PageLoader } from '@/components/loading';

/** Landing page for email confirmation and OAuth links. supabase-js exchanges the ?code= automatically. */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [noSession, setNoSession] = useState(false);
  // Failures known up front (no auth configured, or the provider reported an error in the URL).
  const linkError =
    !getSupabase() || Boolean(params.get('error') || params.get('error_description'));

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || linkError) return;
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next as never);
      else setNoSession(true);
    });
  }, [linkError, next, router]);

  if (linkError || noSession) {
    return (
      <AuthCard title="Couldn’t sign you in from that link">
        <FormAlert>
          The link may have expired or been used already. If you opened it on a different device or
          browser, your email may still be confirmed, so try logging in.
        </FormAlert>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Go to log in
        </Link>
      </AuthCard>
    );
  }
  return <PageLoader label="Signing you in" />;
}
