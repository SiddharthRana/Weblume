/**
 * Content-Security-Policy for the web app, built from the same public env vars the app uses so only
 * the origins we actually talk to are allowed. Inline scripts/styles stay allowed: Next.js injects
 * inline bootstrap scripts, and nonces would force every page to render dynamically. The policy
 * still blocks scripts, frames and connections to any other origin.
 */
export function buildCsp(env: NodeJS.ProcessEnv = process.env): string {
  const dev = env.NODE_ENV !== 'production';
  const origin = (u: string | undefined) => {
    try {
      return u ? new URL(u).origin : null;
    } catch {
      return null;
    }
  };
  const api = origin(env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');
  const supabase = origin(env.NEXT_PUBLIC_SUPABASE_URL);
  const sentry = origin(env.NEXT_PUBLIC_SENTRY_DSN?.replace(/\/\/[^@]*@/, '//'));
  const turnstile = 'https://challenges.cloudflare.com';
  // Cloudflare Web Analytics, injected by Pages: cookieless page-view counts.
  const cfAnalytics = {
    script: 'https://static.cloudflareinsights.com',
    beacon: 'https://cloudflareinsights.com',
  };
  const paddle = ['https://cdn.paddle.com', 'https://*.paddle.com'];

  const connect = [
    "'self'",
    api,
    supabase,
    supabase?.replace(/^http/, 'ws'),
    sentry,
    cfAnalytics.beacon,
    ...paddle,
  ];
  if (dev) connect.push('ws:', 'wss:');

  const directives: Record<string, (string | null | undefined)[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      dev ? "'unsafe-eval'" : null,
      turnstile,
      cfAnalytics.script,
      ...paddle,
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': connect,
    'frame-src': [turnstile, ...paddle],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const parts = Object.entries(directives).map(
    ([k, v]) => `${k} ${[...new Set(v.filter(Boolean))].join(' ')}`,
  );
  if (!dev && env.NEXT_PUBLIC_SITE_URL?.startsWith('https:'))
    parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}
