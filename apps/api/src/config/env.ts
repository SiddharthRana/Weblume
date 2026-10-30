import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: csv,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SUPABASE_URL: z.url(),
  SUPABASE_JWT_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  /** Per signed-in user, across all their IPs. */
  USER_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  /** Stricter per-IP limit for starting/retrying scans. */
  SCAN_CREATE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  /**
   * Supabase secret key (sb_secret_…, or the legacy service_role key). Used only to delete users
   * from Supabase Auth on account deletion. Optional: without it, deletions stay pending.
   */
  SUPABASE_SECRET_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  // ---- Billing (all optional; with nothing set, billing stays unavailable)
  /** Web checkout provider. Confirm seller eligibility first (docs/payments-setup.md). */
  WEB_PAYMENT_PROVIDER: z.enum(['none', 'paddle', 'dodo']).default('none'),
  /** Where the provider sends customers after checkout (site URL + path). */
  BILLING_RETURN_URL: z.url().default('http://localhost:3000/account?checkout=success'),
  PADDLE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  PADDLE_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  PADDLE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  PADDLE_PRICE_STARTER_MONTHLY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  PADDLE_PRICE_STARTER_ANNUAL: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  DODO_ENV: z.enum(['test', 'live']).default('test'),
  DODO_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  DODO_WEBHOOK_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  DODO_PRODUCT_STARTER_MONTHLY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  DODO_PRODUCT_STARTER_ANNUAL: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** Android application id. */
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default('com.weblume.app'),
  /** Play subscription product id; base plans "monthly" and "annual". */
  GOOGLE_PLAY_SUBSCRIPTION_ID: z.string().default('weblume_starter'),
  /** Service account key JSON (raw or base64) with access to the Play Developer API. */
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** Expected audience of Pub/Sub push tokens for Real-time Developer Notifications. */
  GOOGLE_PLAY_RTDN_AUDIENCE: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** Service account email that Pub/Sub uses to sign push requests. */
  GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** HMAC key for the obfuscated account id sent to Google Play (>= 32 chars). Required in production with Play. */
  BILLING_ACCOUNT_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  // ---- Scanning
  /** Google PageSpeed Insights API key. Without it, reports say Lighthouse data is unavailable. */
  PSI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  PSI_CACHE_TTL_HOURS: z.coerce.number().min(0).max(168).default(6),
  /** Public site URL, used in the bot's User-Agent string. */
  PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  SCAN_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(300_000).default(90_000),
  SCAN_PAGE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  SCAN_PAGE_MAX_BYTES: z.coerce.number().int().min(100_000).max(20_000_000).default(5_000_000),
  SCAN_GLOBAL_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  /** Extra hostnames the scanner must never fetch (our own API/admin hosts). */
  SCAN_BLOCKED_HOSTS: csv,
  /** Run the scan worker in this process. */
  WORKER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  /** Secret for hashing guest IPs (HMAC). Required in production. */
  GUEST_HASH_SECRET: z
    .string()
    .min(32)
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** Cloudflare Turnstile secret. Required in production for guest scans. */
  TURNSTILE_SECRET_KEY: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  // ---- Monitoring
  /** Sentry DSN. Without it, errors are only logged. Requests are scrubbed of personal data. */
  SENTRY_DSN: z
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  SENTRY_ENVIRONMENT: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** Bearer token for GET /metrics (Prometheus format). Unset = endpoint disabled (404). */
  METRICS_TOKEN: z
    .string()
    .min(24)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Number of reverse-proxy hops in front of the API (so client IPs are read correctly). 0 = none.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Env = z.infer<typeof envSchema>;

function productionRules(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  if (!env.GUEST_HASH_SECRET) problems.push('  - GUEST_HASH_SECRET: required in production');
  if (
    env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON &&
    (!env.BILLING_ACCOUNT_SECRET || env.BILLING_ACCOUNT_SECRET.length < 32)
  ) {
    problems.push(
      '  - BILLING_ACCOUNT_SECRET: required (>= 32 chars) in production when Google Play is configured',
    );
  }
  return problems;
}

/** Validates process.env at startup; reports *which* variables are wrong, never their values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const extra = productionRules(parsed.data);
  if (extra.length) throw new Error(`Invalid environment configuration:\n${extra.join('\n')}`);
  return parsed.data;
}

export const ENV = Symbol('ENV');
