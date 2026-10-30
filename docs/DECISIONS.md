# Decisions

Short, dated records of non-trivial choices. Newest first.

## 2026-10-30 — Phase 2 scan engine

**SSRF defence via a custom `lookup` in undici's connector.** DNS resolution, validation and connection happen in one step, so the socket connects to exactly the address that was checked: no rebinding window. A host is rejected if _any_ resolved address is non-public. IP literals skip DNS, so they're checked separately. Policy: allow only addresses ipaddr.js classifies as `unicast`, plus an explicit blocklist for ranges it misses (CGNAT, documentation, benchmarking, NAT64, 6to4, Teredo, ULA, …). _Rejected:_ resolve-then-fetch (time-of-check/time-of-use gap), and blocklisting only well-known private ranges.

**No HTTP proxy support for scanning.** A forward proxy resolves DNS itself, defeating pinning. Production hosts need direct egress.

**No headless browser in v1.** Accessibility data comes from Lighthouse via PSI (axe-core based). Our own checks are static HTML/HTTP analysis with cheerio.

**One-page scans; link checks capped at 50.** At most 5 concurrent per host, HEAD with GET fallback (many servers mishandle HEAD), robots.txt respected for links (WeblumeBot) and for the page (Googlebot, for the "blocked from search" check). 429 responses count as "not checked", not "broken".

**PSI findings from the mobile run only**, with desktop used for scores (and as a fallback). Lighthouse audits that duplicate our checks are dropped so each issue appears once. Severity rules are in `docs/scoring.md`.

**Copy lives in `packages/shared` and is composed server-side.** The API returns findings with their title/explanation/fix text, so the Flutter app needs no copy of the catalogue. Lighthouse findings keep the audit's own text in `details`, so old reports render even if our overrides change.

**pg-boss queue with the worker in the API process** (`WORKER_ENABLED`). Jobs aren't retried automatically (`retryLimit: 0`); users retry explicitly, and failures caused by us are free. A sweeper fails scans stuck in `running` (crash/deploy) after the scan timeout plus 5 minutes.

**Guest access by one-time scan token.** Guests receive a random 192-bit token once, stored as SHA-256. Guest quota uses HMAC-SHA256(IP) with `GUEST_HASH_SECRET`. Guests don't get dedupe, since they couldn't open an earlier scan without its token.

**404, not 403, for other people's scans**, so scan IDs can't be probed.

**`@OptionalAuth()`**: routes usable signed out, but a _present_ bearer token must be valid. An expired session gets a 401 instead of silently becoming a guest scan.

**`counts_toward_quota` is only ever cleared by the processor, never set.** This fixes a bug found by tests, where a free retry that failed for a target-side reason was charged.

**Test seam `testPortOverride`** in the guarded client lets integration tests serve `http://fixture-site.com/` from a random local port, because URL validation (correctly) only allows ports 80/443. It's never set by production wiring.

**Web history is per device (localStorage) until Phase 3.** Wrapped in try/catch; the app works without storage. Reports under `/scan/` are `noindex` and disallowed in robots.txt.

## 2026-10-29 — Phase 1 foundation

**TypeScript 6.0, not 7.0.** TypeScript 7.0 (the native Go compiler) is the npm `latest`, but typescript-eslint supports `<6.1` and `@nestjs/swagger` supports `^5.5 || ^6`. We pin `~6.0.3` and will upgrade once the tooling supports 7.

**Latest stable versions elsewhere.** Next.js 16 (App Router, Turbopack, React Compiler, typed routes), React 19.3, Tailwind CSS 4, NestJS 12, Vitest 5, ESLint 10 flat config, Playwright 1.63, Flutter 3.47 / Dart 3.13, Riverpod 3, go_router 18.

**Playwright pinned to 1.63.0** so it matches the browser build available in the dev environment. CI installs the matching Chromium with `playwright install`.

**pnpm workspaces, no Turborepo/Nx.** Five TypeScript packages don't need a build orchestrator yet. Root scripts build packages before apps. Revisit if CI gets slow.

**Supabase Auth + JWT verification in NestJS.** We support asymmetric signing keys via JWKS (the current Supabase default) and the legacy HS256 secret. Tokens must have issuer `<SUPABASE_URL>/auth/v1`, audience `authenticated` and `role=authenticated`, which rejects the anon/service keys. Failure reasons are never returned to clients.
_Rejected:_ our own auth (more security surface), and Supabase's `getUser()` per request (a network round trip each time).

**SQL migrations are the schema source of truth** (`supabase/migrations`). The API uses Drizzle ORM over postgres.js for queries; Drizzle table definitions will be added in Phase 2, matching the migrations. _Rejected:_ Prisma (heavier runtime, a second migration system).

**Postgres-backed queue (pg-boss), decided now and implemented in Phase 2.** No Redis.

**Authorisation in the API; RLS as a second layer.** Users get read-only policies on their own rows (plus profile update). All writes go through the API. `webhook_events` and `feature_flags` have no user policies.

**Quota counted from `scans`, no separate usage table.** `scans.counts_toward_quota` lets failures caused by us or an integration be excluded. Guest quota uses a salted SHA-256 of the IP (`guest_key_hash`), never the raw IP.

**Share links store a token hash**, not the token, so a database leak doesn't expose working links.

**Feature flags/kill switches live in a `feature_flags` table**, seeded with `guest_scans`, `psi`, `link_check` and `billing` (billing off).

**Prices are stored in minor units** (paise/cents) in `packages/shared/src/plans.ts`, for display only. The amount actually charged always comes from the payment provider.

**Logging uses allow-list serializers.** Request logs contain only the request id, method, path (no query string) and status code. No headers, bodies or cookies.

**Local DB verification on plain Postgres.** Docker wasn't available in the build environment, so `scripts/db-verify.sh` applies migrations to a throwaway database with a minimal `auth` stub (`supabase/tests/auth_stub.sql`) and runs the RLS tests. CI does the same with a Postgres service. Developers can still use `supabase start`.

**Web Phase 1 has no sign-in or scan pages yet.** CTAs point to the sample report rather than to non-functional pages. The pricing page says checkout isn't open.

**Android application ID `com.weblume.app`, iOS bundle ID `com.weblume.app`.** These are permanent once published. Release signing reads `android/key.properties` (git-ignored) and falls back to debug signing locally.

**Mobile localisation via `flutter gen-l10n`** (ARB files); web strings are inline English for now. `next-intl` will be introduced with the authenticated app pages in Phase 2/3, to avoid churn on marketing copy.

**Design tokens:** brand primary `#2448D8` (blue) and accent `#F2A516` (amber, the "lume"/light). Severity colours are distinct per level, and each badge also carries a distinct icon and text label.
