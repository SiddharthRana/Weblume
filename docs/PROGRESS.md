# Progress

**Current phase:** 4 — Mobile app ✅ complete (Android release build pending CI confirmation — see below), awaiting go-ahead for Phase 5.
**Last updated:** 2026-10-30

## Phase 4 — Mobile app

### Done (verified in this environment)

| Area            | What                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Verified by                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dart API client | Generated from `openapi.json` by `scripts/generate-dart-client.mjs`: 25 immutable models, 14 enums (unknown values → `unknown`), 12 operations, `ApiException` with API error codes; part of `pnpm openapi` and the CI staleness check                                                                                                                                                                                                                          | 8 tests (decoding, round trip, unknown enums, params, bodies, errors, network failures); `flutter analyze` clean |
| API spec        | Inline objects replaced by named schemas (`SeverityCounts`, `ScanSources`, `SourceStatus`, `LighthouseResult`…); counts typed as integers                                                                                                                                                                                                                                                                                                                       | TS and Dart clients regenerated; all API/web tests still pass                                                    |
| Auth            | supabase_flutter (PKCE) behind an `AuthRepository` interface; log in, sign up (email confirmation), forgot password, password-recovery deep link → new password, log out; "not configured" screen; `weblume://auth-callback` deep link (Android intent filter, iOS URL scheme)                                                                                                                                                                                  | 10 tests (redirect rules, flows with a fake auth repository)                                                     |
| Screens         | Dashboard (greeting, plan, usage meter, recent scans, pull to refresh), new scan (shared URL rules), scan progress (2 s polling, 5 min give-up), report (Lighthouse rings, summary, top priorities, category filter, coverage, limitations), finding detail (what/why/how, evidence, learn more), history (search, load more), account (name, plan/usage, data export via web, legal, log out, delete with typed confirmation); responsive rail on wide screens | 13 flow tests                                                                                                    |
| Offline         | Account, first page of history and up to 20 finished reports cached (shared_preferences); offline banner; writes disabled offline; cache cleared on log-out/deletion                                                                                                                                                                                                                                                                                            | Repository tests + offline widget test                                                                           |
| URL rules       | Dart validator runs the same JSON test cases as the TypeScript one (`packages/shared/test/url-cases.json`)                                                                                                                                                                                                                                                                                                                                                      | 33 Dart + 33 TS cases                                                                                            |
| Accessibility   | Flutter guidelines (tap targets, labelled targets, text contrast) on dashboard and report, light and dark                                                                                                                                                                                                                                                                                                                                                       | Widget tests                                                                                                     |

69 Flutter tests in total; `dart format` and `flutter analyze` clean.

### Bugs found and fixed by the new tests

- The **New scan** tab route (`/scan/new`) was captured by the report route `/scan/:id`, so the tab opened a "report" for scan id `new`. Moved to `/new`, with a regression test.

### Not verified / limitations

- **The Android release APK is built only on CI** (the Android SDK download is blocked in this environment). This needs confirming on this commit's CI run; supabase_flutter adds native plugins.
- **Not run on a device or emulator**, and there's no visual check of the Flutter screens (widget tests render text as placeholder blocks). First manual test: install the CI-built APK, sign in, run a scan, open a finding, go offline, delete the account.
- Supabase auth in the app (sessions, the deep link opening the app, password recovery) is only tested against a fake auth repository.
- Data export on mobile links to the website's Account settings rather than saving a file in the app.
- Mobile requires sign-in to scan (no guest scans). Turnstile is web-only.
- Google sign-in isn't offered in the app yet (email/password only).

## Phase 3 — Accounts, entitlements, quotas

### Done (verified in this environment)

| Area           | What                                                                                                                                                                                                                                                                                                                                                       | Verified by                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Entitlements   | `EntitlementService`: the single server-side source of plan/limits. Plans come from `subscriptions` rows only (with billing switched on); access rules per status (`canceled` keeps access until period end; `grace_period` keeps access; `on_hold`/`paused`/`expired`/`refunded` don't); best plan wins; billing-period quota windows; retention per plan | 11 shared unit tests + DB e2e tests for every status, billing on/off, cross-user isolation |
| Account API    | `GET/PATCH/DELETE /v1/me`, `GET /v1/me/export`, `POST /v1/scans/:id/claim`; deleted accounts get 403 even with a still-valid token                                                                                                                                                                                                                         | 23 DB-backed e2e tests                                                                     |
| Deletion       | Immediate app-data deletion in one transaction, then Supabase admin-API user deletion; deferred and retried by the retention job when the key is missing or the call fails                                                                                                                                                                                 | e2e tests (immediate, deferred, failing admin call)                                        |
| Retention      | Hourly pg-boss job (`17 * * * *`): expired scans, stale PSI cache, webhook payloads older than 30 days, pending auth deletions                                                                                                                                                                                                                             | e2e test; live run confirmed the schedule is registered                                    |
| Infrastructure | Shared `PgBossService` (one instance, lazy start); DB test files run sequentially                                                                                                                                                                                                                                                                          | All 212 API tests pass                                                                     |
| Web auth       | Supabase Auth (supabase-js, PKCE): sign-up with email confirmation, log in, Google (optional), forgot/reset password, email callback, safe `?next=` redirects, auth-aware header and mobile nav, “not configured” fallback                                                                                                                                 | 18 auth scenarios on desktop + mobile (35 runs, 1 desktop-only), Supabase and API mocked   |
| Web app        | Dashboard (plan, usage meter, recent scans), account settings (name, plan/usage, export download, log out, delete with typed confirmation), history from the account (search, pagination) when signed in, guest scans claimed automatically on sign-in, Turnstile only for guests                                                                          | Playwright incl. axe on sign-up, dashboard and account pages; 152 web tests in total       |
| Docs           | `docs/privacy-data-map.md`, Supabase setup steps in README                                                                                                                                                                                                                                                                                                 | —                                                                                          |

### Bugs found and fixed by the new tests

- Signing out (or deleting the account) on a protected page was hijacked by the auth guard, which redirected to `/login?next=…` instead of the intended page.

### Not verified / limitations

- **No real Supabase project was used.** JWT verification, PKCE email links, Google OAuth and the admin delete call follow Supabase's documented formats but were only exercised against mocks. First manual test: sign up, confirm the email, reset the password, delete the account.
- The "accounts not configured" web state isn't covered by automated tests (the e2e build always has a mocked Supabase URL).
- When the web app deletes an account, it says "deleted" or "pending" based on the API response. A pending deletion completes within the hour once `SUPABASE_SECRET_KEY` is set.
- Plan downgrades don't shorten the retention of existing reports (expiry is set when a scan is created).

## Phase 2 — Audit engine and web results

### Done (verified in this environment)

| Area          | What                                                                                                                                                                                                                                                                                                                       | Verified by                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| URL handling  | Shared `normalizeUrl`: http/https only, ports 80/443, no credentials, IDN → punycode, canonical IPv4 forms, reserved TLDs rejected, fragments stripped                                                                                                                                                                     | 30 unit tests                                                                         |
| SSRF defences | `GuardedHttpClient`: DNS resolved and validated inside the socket connector (pinning, no rebinding window), public-unicast allow-list, any-bad-answer rejection, IP-literal checks, manual redirects re-validated per hop, scheme/port/credential/blocked-host checks, overall deadline, streaming size cap, no cookies    | 91 tests (IP policy cases + client cases against a local server)                      |
| Checks        | 28 curated checks with plain-language copy (SEO, technical, accessibility); robots.txt (Googlebot), sitemap discovery/validation, http→https redirect, link checker (50 links, ≤ 5 per host, robots-respecting, HEAD→GET fallback)                                                                                         | 27 tests (fixtures + local server)                                                    |
| PSI           | Google PSI v5 provider (mobile + desktop, 4 categories), response mapping, severity rules, curated copy for common audits, dedupe against own checks, 6 h DB cache                                                                                                                                                         | 14 tests (hand-built PSI fixture) + cache test                                        |
| Scan engine   | Runner (PSI in parallel, 90 s deadline, completed/partial/failed), processor (atomic claim, transactional persist, stuck-scan sweeper), pg-boss queue + in-process worker                                                                                                                                                  | DB e2e tests; live run of the built API with the real pg-boss worker                  |
| Scans API     | `POST /v1/scans` (signed-in or guest), `GET /v1/scans`, `GET /v1/scans/:id`, `POST /v1/scans/:id/retry`; quotas (guest 1/day, free 5/month), 10-min dedupe, one active scan per user, guest tokens (hashed), Turnstile, kill switches, 404-not-403 for others' scans, stricter rate limit                                  | 33 DB-backed e2e tests on PostgreSQL 16                                               |
| Database      | Migration 2: `passed_checks`, `retry_of`, `psi_cache` (RLS, no user access)                                                                                                                                                                                                                                                | `pnpm db:verify` incl. new RLS assertion                                              |
| Web           | `/scan` form (client validation, Turnstile when configured), `/scan/[id]` (polling, progress, report, partial/failed/not-found/offline states, retry), `/history` (this device), shared `ReportView` (sample report now uses it with real catalogue copy), nav/CTA updates, reports `noindex` and disallowed in robots.txt | 117 Playwright tests incl. 16 scan-flow tests with mocked API; axe clean on new pages |
| Docs          | `docs/scoring.md` (scores, severities, statuses, limits), README env vars/testing/troubleshooting                                                                                                                                                                                                                          | —                                                                                     |

### Not verified / limitations

- **A real scan of a real public website** hasn't been run here: this environment has no direct outbound internet. The worker deliberately doesn't use HTTP proxies, because a proxy would resolve DNS itself and defeat DNS pinning. A live run of the built API confirmed the full queue → worker → result pipeline (the scan failed honestly with `dns_failure`). Scanning itself is tested end to end against local servers via test seams.
- **Real PSI responses:** the keyless PSI quota is exhausted, and testing with a real key needs your Google Cloud key. The mapper is tested against a hand-built fixture following the documented v5 shape. **First thing to check once you add a key:** run one scan and compare the report with pagespeed.web.dev.
- **Turnstile** is tested with a fake verifier; the Cloudflare call itself is untested (needs keys).
- **HTTPS fetches** (TLS/SNI through the pinned connector) aren't covered by automated tests (local test servers are plain HTTP). The design relies on Node's standard `lookup` hook; confirm with a real scan.
- **History** is per device until sign-in arrives (Phase 3).

### Phase 1 (complete; CI green on GitHub, including the Android release APK build)

Monorepo, design tokens, shared package, initial schema with RLS, NestJS foundation (auth guard, health, OpenAPI), generated TS client, marketing site, Flutter skeleton, CI. Details in git history (`876fa66`).

## Next: Phase 5 — Payments

PaymentProvider interface, Merchant-of-Record web checkout (sandbox; provider eligibility checked first), Google Play Billing in the app with server-side purchase verification and acknowledgement, Real-time Developer Notifications, webhook signature verification and idempotency, subscription state machine, cross-channel entitlements, billing-disabled mode.

## Manual setup you'll need

- **PageSpeed Insights API key** (free): Google Cloud console → enable "PageSpeed Insights API" → create an API key restricted to that API → `PSI_API_KEY`.
- **Cloudflare Turnstile** (free): create a widget → site key to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret to `TURNSTILE_SECRET_KEY`.
- **`GUEST_HASH_SECRET`** for production: `openssl rand -hex 32`.
- **Supabase project:** see “Supabase Auth setup” in the README (URLs, keys, redirect URLs, SMTP, optional Google).
- Android upload keystore (Phase 4).
