import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** True when Supabase Auth is configured for this deployment. Guests can scan either way. */
export const authConfigured = Boolean(URL && KEY);
export const googleSignInEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === 'true';

let client: SupabaseClient | null = null;

/** Browser Supabase client (PKCE flow). Null when auth isn't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!authConfigured || typeof window === 'undefined') return null;
  client ??= createClient(URL, KEY, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export async function currentAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Password rules, matching supabase/config.toml (minimum 10, lower + upper + digit). */
export function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < 10) problems.push('at least 10 characters');
  if (!/[a-z]/.test(pw)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(pw)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(pw)) problems.push('a number');
  return problems;
}

/** Turns Supabase auth errors into friendly messages without revealing whether an account exists. */
export function authErrorMessage(
  err: { message?: string; code?: string; status?: number } | null | undefined,
): string {
  const code = err?.code ?? '';
  const msg = err?.message ?? '';
  // Supabase's CAPTCHA protection (Turnstile) rejected or didn't receive a token.
  if (code === 'captcha_failed' || /captcha/i.test(msg))
    return 'The security check didn’t go through. Complete it again, then try again.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return 'Incorrect email or password.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return 'Please confirm your email address first. Check your inbox.';
  if (code === 'weak_password' || /password/i.test(msg))
    return 'That password is too weak. Use at least 10 characters with upper- and lowercase letters and a number.';
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    err?.status === 429
  )
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'same_password') return 'Choose a password different from your current one.';
  return 'Something went wrong. Please try again.';
}
