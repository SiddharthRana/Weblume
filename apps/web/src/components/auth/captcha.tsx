'use client';

import { useState } from 'react';
import { Turnstile } from '../turnstile';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/**
 * Turnstile bot check for Supabase sign-up, sign-in and password reset (Supabase's CAPTCHA
 * protection rejects those calls without a token once it's on). Without a site key (local
 * development, tests) it's off and every form works as before.
 */
export function useAuthCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const enabled = SITE_KEY !== '';
  return {
    /** True once the visitor has passed the check (always true when it's off). */
    ready: !enabled || token !== null,
    /** Pass as `captchaToken`; undefined when the check is off. */
    token: token ?? undefined,
    /** Tokens are single-use: call after every attempt, successful or not. */
    reset: () => {
      if (!enabled) return;
      setToken(null);
      setResetKey((k) => k + 1);
    },
    widget: enabled ? (
      <Turnstile siteKey={SITE_KEY} onToken={setToken} resetKey={resetKey} />
    ) : null,
  };
}

export const CAPTCHA_NOT_READY =
  'Please wait for the security check above to finish, then try again.';
