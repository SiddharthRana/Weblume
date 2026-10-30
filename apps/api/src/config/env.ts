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
  // Number of reverse-proxy hops in front of the API (so client IPs are read correctly). 0 = none.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Env = z.infer<typeof envSchema>;

function productionRules(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  if (!env.GUEST_HASH_SECRET) problems.push('  - GUEST_HASH_SECRET: required in production');
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
