'use client';

import { useState } from 'react';
import { getSupabase, googleSignInEnabled } from '@/lib/supabase';

export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  if (!googleSignInEnabled) return null;
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
          const { error } =
            (await getSupabase()?.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo },
            })) ?? {};
          if (error) setBusy(false);
        }}
        className="min-h-12 w-full rounded-lg btn-secondary px-5 text-sm font-semibold disabled:opacity-70"
      >
        Continue with Google
      </button>
      <p className="my-4 text-center text-xs uppercase tracking-wide text-fg-muted">or</p>
    </>
  );
}
