# Decisions

Short, dated records of non-trivial choices. Newest first.

## 2026-10-30 — Visual redesign (Linear-inspired)

**Brand gradient instead of a flat blue.** The palette is near-black and off-white with hairline borders, plus an indigo → violet → purple gradient (`gradientStart/Mid/End` tokens) for primary actions, the logo, accents and headline text. White button text is tested at ≥ 4.5:1 on every gradient stop, in both themes. One token source still drives the web (CSS variables), the PDF and Flutter.

**Motion is CSS-only on the web** (no animation library), and is turned off for people who choose reduced motion:

- pages fade in on navigation (`app/template.tsx`);
- hero content rises in staggered;
- score rings fill;
- sections reveal on scroll via `animation-timeline: view()` (no JavaScript, and no hidden content where it isn't supported);
- findings expand smoothly via `::details-content`.

Score numbers aren't animated as text, so screen readers and tests always read the real value.

**Flutter:**

- Gradient filled buttons through the theme's `backgroundBuilder`, so every `FilledButton` gets it without new widgets.
- Fade-forwards page transitions.
- Score rings animate unless `MediaQuery.disableAnimations` is set.

## 2026-10-30 — Phase 6 reports and launch prep

**PDF with pdfkit, not `@react-pdf/renderer`.** Both are pure JS (no browser). pdfkit is CommonJS like the API, needs no React/JSX in the backend, and draws text directly, so there's no HTML to inject into. Inter (OFL) is embedded for Latin, Greek and Cyrillic. Tests check the output by extracting the text back with pdf.js. _Trade-off:_ the layout is hand-positioned rather than declarative.

**Comparison logic lives in `packages/shared`** (`compareReports`): one tested implementation for the API, and available to the web. Findings are matched by check id plus Lighthouse strategy. A finding is only called **new** or **resolved** when its data source ran in both scans; otherwise it's listed as **couldn't compare**. Without that, a Lighthouse timeout would look like every performance issue was fixed.

**Share links:** 128-bit tokens, only SHA-256 hashes stored, default 30 days, never beyond the report's retention, at most 20 active per report, revocable, and the same 404 for unknown/revoked/expired. **Links keep working after a downgrade** until they expire, because the owner may already have sent them to a client; creating new ones needs the plan. The public page sends `noindex` and `no-referrer`, and tokens are masked in logs and Sentry.

**PDF on Android is deferred:** the app links to the web for PDFs. Saving and sharing a file on Android needs new plugins (path/share) that can't be device-tested here.

**Metrics without a metrics stack:** in-process counters plus database aggregates, served as Prometheus text on a token-protected `/metrics`. Queue depth and failures come from the database, so they're correct across instances. _Rejected for now:_ OpenTelemetry/prom-client (more dependencies than the need).

**Sentry is optional and explicit-capture only:** default integrations are off, and only 5xx and worker crashes are sent, scrubbed in `beforeSend`. The web SDK is dynamically imported only when a DSN is set.

**CSP with `'unsafe-inline'` scripts:** origins are restricted (API, Supabase, Turnstile, Paddle, Sentry) and framing, objects and base-uri are locked down. Nonces would make every page dynamic. Recorded as a known gap in `docs/security-review.md`.

**Per-user rate limit in addition to per-IP.** Two guards share one throttler config: per-IP runs before authentication (so floods are limited), per-user runs after it (so it can key on the verified user id).

**Android backups off:** the session and cached reports are excluded from cloud backup and device transfer. Users sign in again on a new phone.

**API container via `pnpm deploy`:** production dependencies only, non-root, with the PDF fonts included. Workspace packages declare `files` so their built `dist` is included.

## 2026-10-30 — Phase 5 payments

**Two web MoR adapters behind one interface; neither assumed.** The build prompt's default was Paddle, but India seller eligibility couldn't be confirmed from official sources, and Dodo Payments explicitly targets Indian sellers and supports UPI AutoPay mandates. Both are implemented, selected by `WEB_PAYMENT_PROVIDER`. _Rejected:_ Lemon Squeezy, since Indian payouts appear to be PayPal-only. Details and the remaining checks are in `docs/payments-setup.md`.

**The user id travels server-side to the provider** (Paddle transaction `custom_data`, Dodo `metadata`) and comes back in signed webhooks, so a client can't attach a payment to someone else's account. Webhook signatures are verified over the raw request bytes (Nest `rawBody`).

**One writer for subscriptions** (`SubscriptionStore`) with `last_event_at` ordering; **one idempotency ledger** (`webhook_events`, unique per provider + event id). Failed events return 5xx and are retried by providers.

**Google Play without the googleapis SDK:** a service-account JWT is signed with `jose` and the two REST calls are made directly. That's ~100 lines instead of a very large dependency.

**Play anti-replay:** each user has an `obfuscatedAccountId` = HMAC(`BILLING_ACCOUNT_SECRET`, user id), stored on the profile. Verification requires the purchase to carry the caller's reference, so a leaked token can't unlock another account. The stored reference also lets RTDN match first purchases the app never reported.

**Acknowledge on the server**, from both `/verify` and RTDN. The app finishes the purchase on the device only after server verification succeeds, so interrupted purchases are redelivered instead of lost.

**Status mapping:** Paddle `active` with a scheduled cancel, and Play with auto-renew off, become `canceled` (access until period end). Paddle `canceled` = ended → `expired`. Play `SUBSCRIPTION_REVOKED` → `refunded`. Pending/payment-incomplete states grant no access.

**Duplicate subscriptions are prevented where we can and surfaced where we can't:** web checkout refuses users with any active subscription, the app hides purchase options for web subscribers, and both UIs warn when two are active.

**Base plans only** (monthly/annual) in Play; no offers or proration in v1.

## 2026-10-30 — Phase 4 mobile app

**Dart client from our own small generator** (`scripts/generate-dart-client.mjs`, ~300 lines, no dependencies) instead of openapi-generator (Java, large output) or swagger_parser (build_runner/freezed). Our API surface is small. The output is plain immutable classes with `fromJson`/`toJson` plus a dio client, committed and checked in CI. Unknown enum values decode to `unknown`, so older app versions survive API additions.

**Named schemas over inline objects in the OpenAPI spec**, so both generated clients get one reusable type per shape. Swagger's `allOf: [$ref]` wrapper (added for descriptions/nullability) is treated as a plain reference.

**Repository + interface boundaries** (`AuthRepository`, `WeblumeRepository`) overridden with fakes in widget tests. Riverpod 3's automatic retry is disabled app-wide (`ProviderScope(retry: …)`), because screens offer explicit "Try again" actions and auto-retry would hide failures and slow tests.

**Mobile requires an account to scan.** Turnstile has no native SDK, and embedding it in a WebView isn't worth it for v1. The dashboard and usage only make sense signed in anyway.

**Offline = read-only cache in shared_preferences** (account, first history page, up to 20 finished reports). In-progress scans are never cached. Writes (scan, retry, rename, delete) are disabled offline rather than queued. The cache is cleared on log-out and deletion. _Rejected:_ SQLite/drift (more weight than the data needs).

**Password recovery via deep link:** Supabase emits `passwordRecovery` after the PKCE code exchange; the router forces the new-password screen until it's saved.

**Data export on mobile links to the website**, which already produces the JSON download. In-app file saving can come later.

**URL rules shared by test cases, not code:** `packages/shared/test/url-cases.json` is run by both the TypeScript and Dart validators. The Dart side accepts IDN and numeric hosts and leaves exact normalisation to the API.

## 2026-10-30 — Phase 3 accounts

**Entitlements only from server-side subscription rows**, through one `EntitlementService`. Clients can't influence plans (`PATCH /v1/me` rejects unknown fields). While the `billing` flag is off, everyone is on Free regardless of rows, matching the spec's "billing disabled" mode. The best plan among subscriptions that grant access wins.

**Access by subscription status:** `trialing`, `active` and `grace_period` grant access. `canceled` grants access until `current_period_end`. `on_hold`, `paused`, `expired` and `refunded` don't. This matches Google Play's grace-period vs account-hold semantics.

**Retention is fixed at scan creation** (`expires_at`). Claiming a guest scan re-bases it on the account's plan from its original creation time. Downgrades don't retroactively shorten existing reports; upgrades don't extend them (documented limitation).

**Claimed guest scans stay counted where they were counted** (no quota games). The guest token is cleared on claim, so only the account can open the report.

**Account deletion = immediate app-data deletion + auth user deletion via the Supabase admin API**, with `deletion_requested_at` as a tombstone. The API refuses tombstoned or missing profiles (403 `account_deleted`), so a still-valid JWT can't recreate data. The retention job retries pending auth deletions. _Rejected:_ a 30-day soft delete. It's simpler to delete immediately, and the privacy policy promises "within 30 days" as an upper bound.

**Supabase in the browser via supabase-js with PKCE** (not `@supabase/ssr`): all app pages are client-rendered and call our API with the access token, so no server-side session is needed. Email links (confirmation, password reset) use PKCE codes exchanged on `/auth/callback` and `/auth/reset-password`.

**`?next=` redirects only to same-site relative paths** (`/…`, not `//…`), preventing open redirects.

**`signOut(redirectTo)` suppresses auth-guard redirects** while it navigates. This fixes a race found by the e2e tests.

**Web e2e build uses a mocked Supabase URL** (`build:e2e`). Supabase Auth and the API are mocked at the network layer, so the tests need no real project or keys.

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
