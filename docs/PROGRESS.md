# Progress

**Current phase:** 6 of 6 — Reports+ and launch prep ✅ complete. All phases are built; **nothing is deployed**. What remains before a public launch is listed below, in priority order.
**Last updated:** 2026-11-04

## Monitoring (scheduled re-scans with email digests)

### Done (verified in this environment)

| Area         | What                                                                                                                                                                                                                                                                                                               | Verified by                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Entitlements | `monitoredSites` / `monitorFrequency` in `packages/shared/src/plans.ts`: Free 1 site weekly, Starter 5 daily (confirmed by the owner), guests none; gated on the server (`upgrade_required`, `monitor_limit_reached`)                                                                                              | API DB e2e                                                                                                                             |
| API          | `GET/POST /v1/monitors`, `PATCH/DELETE /v1/monitors/:id` (pause/resume, frequency, what to email), public `POST /v1/monitors/pause` (signed link); migration `20261103000000_monitoring.sql` adds `daily` and digest bookkeeping columns                                                                           | API DB e2e (ownership, limits, validation, private addresses, guests)                                                                  |
| Scheduler    | pg-boss cron (`MONITOR_TICK_CRON`, default every 5 minutes) claims due monitors with `SKIP LOCKED`, queues scans outside the scan quota, keeps the time of day, skips while a run is active, pauses over-limit sites after a downgrade and monitors of deleted accounts                                            | API DB e2e; a live local run with the built API (cron every minute) queued the scan on time, scanned example.com and logged the digest |
| Digests      | `compareReports` against the previous finished scan; plain-language email (new issues, fixed issues, score changes of 5+ points, report and comparison links, manage and pause links, `List-Unsubscribe`); one notice when the site can't be reached; nothing for the baseline or no changes; Resend sender or log | Unit tests (rendering, thresholds, alert settings, escaping, no em dashes, Resend request), API DB e2e                                 |
| Web          | Dashboard "Monitoring" section (add, frequency, what to email, pause/resume, stop, skip reasons, upgrade hint); "Monitor this site" on reports; `/monitoring/pause` page; pricing lists monitoring                                                                                                                 | Playwright (desktop and mobile, axe WCAG 2.2 AA)                                                                                       |
| Android      | Dashboard lists monitored sites (schedule, paused, skip reasons, latest report); setting up and managing open the website                                                                                                                                                                                          | Flutter widget tests                                                                                                                   |
| Privacy      | Monitors included in the data export and deleted with the account                                                                                                                                                                                                                                                  | API DB e2e                                                                                                                             |

**Test totals:** API 340 (with `TEST_DATABASE_URL`), shared 86, web Playwright 202 passed / 5 skipped, Flutter 90.

### Not verified / needs the owner

- **Real email delivery.** No Resend key was available here; digests were checked as logged output. To send for real: verify a sending domain in Resend, then set `RESEND_API_KEY`, `EMAIL_FROM` and `MONITOR_LINK_SECRET`.
- Playwright now emulates reduced motion, so axe never checks a page mid-fade (the old dashboard check was timing-dependent).

## Phase 6 — Reports+ and launch prep

### Done (verified in this environment)

| Area               | What                                                                                                                                                                                                                                                                                                      | Verified by                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Comparison         | `compareReports` in `packages/shared`: new / resolved / still open / couldn't compare (when a source didn't run in one scan), severity changes, score deltas; `GET /v1/compare`; web `/compare` (pick an earlier scan, then results); Android compare screen                                              | 6 shared unit tests, API DB e2e, Playwright, Flutter tests                                                                                 |
| PDF export         | Branded A4 PDF via pdfkit (Inter embedded): scores, summary, priorities, findings by category with fixes and evidence, coverage, limitations notice, page numbers; `GET /v1/scans/:id/report.pdf`; web download button                                                                                    | Text extracted back with pdf.js (content, Unicode, hostile input, 60-finding report); rendered pages checked visually; API e2e; Playwright |
| Share links        | 128-bit tokens, hash-only storage, default 30 days (max 365, capped at the report's retention), revoke, at most 20 active per report; public `GET /v1/shared/:token` with `noindex`/`no-store`/`no-referrer` and no account data; web `/r/[token]` and share panel; Android share sheet (copies the link) | 8 API DB e2e tests, Playwright, Flutter tests                                                                                              |
| Entitlements       | Comparison, PDF and sharing require Starter (server-side `upgrade_required`); free plans see an upgrade prompt                                                                                                                                                                                            | API e2e, Playwright, Flutter                                                                                                               |
| Monitoring         | Optional Sentry (API + web) with personal-data scrubbing; exception filter reports only 5xx; token-protected `/metrics` (queue depth, scans and failures by reason, PSI calls/latency/cache hits, webhook failures); share tokens masked in request logs                                                  | Unit tests (including the real Sentry SDK with a fake transport), API e2e                                                                  |
| Security hardening | Content-Security-Policy on the web (built from configured origins); per-user rate limit in addition to per-IP; Android cloud backup / device transfer of session and cache disabled                                                                                                                       | Playwright (CSP header, no violations on key pages), API test (per-user limit across IPs), CI APK build                                    |
| Schema-ready (v2)  | `report_branding` and `scheduled_scans` tables with RLS, `scans.scheduled_scan_id`                                                                                                                                                                                                                        | `pnpm db:verify` (RLS tests)                                                                                                               |
| Deployment         | `apps/api/Dockerfile` (pnpm deploy, prod deps only, non-root, healthcheck), `.dockerignore`                                                                                                                                                                                                               | Image built and run locally against Postgres: `/health`, `/ready`, a public route, fonts present, runs as `node`                           |
| Lighthouse         | Own marketing pages: accessibility 100, SEO 100, best practices 100 (96 on `/pricing`, only because no API was running), performance 93–99 mobile / 100 desktop                                                                                                                                           | Lighthouse 13.4 on a local production build (`docs/quality-review.md`)                                                                     |
| Docs               | `deployment.md`, `monitoring.md`, `troubleshooting.md`, `smoke-test.md`, `security-review.md`, `quality-review.md` (accessibility + Lighthouse), `costs.md`, `unit-economics.md`; privacy data map, README and decisions updated                                                                          | —                                                                                                                                          |

**Test totals at the end of Phase 6:** API 305, shared 86, design tokens 36, TS client 2, web Playwright 189 passed / 5 skipped, Flutter 86. Lint, typecheck, format, `openapi:check`, `db:verify` and production builds are clean. `pnpm audit --prod` shows no known vulnerabilities.

### Bugs found and fixed during the review

- **Share tokens appeared in request logs.** Found by running the built container. Paths are now logged as `/v1/shared/[token]`.
- **Body-parser errors would have been reported to Sentry as 500s.** The 413 errors carry their own status; the filter now uses Nest's status rules.
- **The Dart client generator treated the PDF endpoint as JSON.** It now returns bytes for binary responses.

### Not verified / limitations

- **Nothing deployed.** No real hosting, DNS, Supabase cloud project, Play Console, Paddle/Dodo account, Pub/Sub or Sentry project was used. The CSP hasn't been checked with real Turnstile/Paddle keys.
- **Manual accessibility checks** (screen readers, zoom, TalkBack, large fonts) weren't done. They need a person and devices; the checklist is in `docs/quality-review.md`.
- **The Docker build** needed the build environment's proxy CA injected via a local copy of the Dockerfile; the committed Dockerfile is unchanged and expects normal internet access.
- **Prices in `costs.md` / `unit-economics.md`** are from memory of public pricing, not checked live.

## Phase 5 — Payments (complete; CI green on GitHub including the Android release APK with in_app_purchase)

### Done (verified in this environment)

| Area              | What                                                                                                                                                                                                                                                                                                                                                | Verified by                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Provider research | Paddle / Dodo / Lemon Squeezy eligibility for an India-based seller and Indian buyers; findings and the remaining checks in `docs/payments-setup.md`                                                                                                                                                                                                | Web search (official docs weren't reachable from the build environment)     |
| Core              | `WebPaymentProvider` interface; `ProductCatalog` (provider ids → plans from env); `SubscriptionStore` (only writer of `subscriptions`; resolves users by custom data, existing/linked rows or account ref; ignores out-of-order events); `WebhookLedger` (idempotency, audit)                                                                       | Unit + DB e2e tests                                                         |
| Web: Paddle       | Server-created transactions (user id in `custom_data`), customer portal, `Paddle-Signature` verification (rotation, 5-min tolerance), status mapping (scheduled cancel → access until period end, past_due → grace)                                                                                                                                 | 13 signature/mapping tests + 11 DB e2e tests through the real HTTP endpoint |
| Web: Dodo         | Checkout sessions, portal, Standard Webhooks verification, status mapping                                                                                                                                                                                                                                                                           | 13 signature/mapping tests (adapter not run against Dodo's API)             |
| Google Play       | Service-account OAuth (JWT bearer) + `subscriptionsv2.get` + acknowledge, without the googleapis SDK; purchase verification bound to an HMAC account ref (anti-replay); RTDN via Pub/Sub push with Google OIDC token verification; revocation → refunded; replacement tokens supersede old ones; first purchases matched via the stored account ref | 18 unit tests + 10 DB e2e tests                                             |
| API               | `GET /v1/billing/config`, `POST /v1/billing/checkout`, `POST /v1/billing/portal`, `GET /v1/billing/google-play/account-ref`, `POST /v1/billing/google-play/verify`, `POST /v1/billing/google-play/rtdn`, `POST /v1/billing/webhooks/:provider`; raw-body capture for signatures; dual-subscription guard                                            | 278 API tests in total                                                      |
| Web app           | Pricing: subscribe monthly/yearly (signed-in), account-first for visitors, "coming soon" when off; Paddle.js default-payment-link page; account: subscription list, provider portal, Manage in Google Play, double-subscription warning, post-checkout confirmation polling                                                                         | 18 new Playwright runs (170 in total)                                       |
| Android app       | `in_app_purchase` behind a `BillingGateway`; base-plan offers with Play's localised prices; purchase → server verify → complete only after verification; pending / error / cancel / mismatch / offline handling; restore; app-wide purchase listener; never offers a second subscription to web subscribers                                         | 10 new Flutter tests (79 in total)                                          |
| Docs              | `docs/payments-setup.md`: provider choice, dashboard and console steps for Paddle, Dodo, Play Console, Google Cloud, Pub/Sub; switching billing on; behaviour reference                                                                                                                                                                             | —                                                                           |

### Not verified / limitations

- **No real payment provider was called.** Paddle, Dodo, Google Play and Google OAuth were faked at the HTTP edge. Signature formats were tested against independently computed HMACs. **The Dodo adapter's request/response fields follow Dodo's docs as recalled; confirm in test mode** (`docs/payments-setup.md` §3).
- **Seller eligibility is unconfirmed** for Paddle (India). Dodo appears to be the better fit for India and UPI, but verify both with the providers.
- **The Android release APK with `in_app_purchase` built on CI** (run 41017600855). Purchases can only be tested on a device with an app uploaded to a Play testing track.
- Google Play subscriptions have no current-period start in the API; it's derived from expiry minus the base-plan length.
- Plan changes (monthly ↔ annual), proration and promotional offers aren't supported: base plans only.
- Tax-inclusive vs exclusive display of the ₹149 / $3.99 hypotheses still needs deciding (§1 of the setup guide).

### Phase 4 (complete; CI green on GitHub including the Android release APK with supabase_flutter)

### Phase 4 — Mobile app (details)

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

## Manual setup you'll need

- **PageSpeed Insights API key** (free): Google Cloud console → enable "PageSpeed Insights API" → create an API key restricted to that API → `PSI_API_KEY`.
- **Cloudflare Turnstile** (free): create a widget → site key to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret to `TURNSTILE_SECRET_KEY`.
- **`GUEST_HASH_SECRET`** for production: `openssl rand -hex 32`.
- **Supabase project:** see “Supabase Auth setup” in the README (URLs, keys, redirect URLs, SMTP, optional Google).
- Android upload keystore (see `apps/mobile/README.md`).
- **Payments:** follow `docs/payments-setup.md` (provider choice, sandbox accounts, Play Console products, service account, Pub/Sub).

## Remaining work and known limitations (prioritised)

### P0: before a public launch

1. **Choose and confirm the web payment provider.**
   - Confirm seller eligibility (India) and fees with Paddle and Dodo.
   - Run one sandbox purchase end to end.
   - Fix any Dodo field mismatches (`docs/payments-setup.md` §0, §3).
2. **Test with a real PageSpeed Insights key.** Run scans and compare with pagespeed.web.dev; so far the mapper is tested only against a hand-built fixture.
3. **Deploy a staging environment.** Follow `docs/deployment.md` and run `docs/smoke-test.md`. That includes the CSP with real Turnstile and Paddle keys, email delivery, and the Android build against staging.
4. **Get a legal review** of the privacy policy, terms and refund policy (all marked DRAFT), and fill in the Play data safety form from `docs/privacy-data-map.md`.
5. **Device-test Android.**
   - Play Billing on an internal track with license testers (purchase, renewal, cancel, refund via RTDN).
   - Share and compare flows.
   - TalkBack and large fonts.
6. **Harden Supabase Auth.** Enable CAPTCHA (Turnstile) and leaked-password protection, configure SMTP, and set the password policy (README).
7. **Pricing decisions.**
   - Paddle's fixed $0.50 fee takes ~28% of a ₹149 monthly payment (`docs/unit-economics.md`). Decide INR monthly price, provider, or an annual-first plan.
   - Decide tax-inclusive display.
8. **Manual accessibility checks** in `docs/quality-review.md`, plus a 3–5 person "understand the report in 10 seconds" test.

### P1: soon after launch

9. Store the mobile session in Keystore-backed secure storage (`flutter_secure_storage`).
10. Move rate-limit counters to a shared store (e.g. Redis) before running more than one API instance.
11. Add Sentry (or similar) to the Android app.
12. PDF download and system share sheet in the Android app (currently: "download on the website").
13. Nonce-based CSP to drop `'unsafe-inline'` scripts.
14. Wider PDF font coverage (Devanagari, CJK) via Noto fonts.
15. Set up uptime monitors, metric alerts and cost alerts (`docs/monitoring.md`, `docs/costs.md`).
16. Optional MFA (Supabase TOTP) in the account settings.

### P2: later / v2 (schema already in place)

17. Custom branding on PDFs and shared reports (`report_branding`).
18. ~~Scheduled re-scans with change alerts~~ Built (see Monitoring above). Next: RFC 8058 one-click unsubscribe, monitoring several pages per site, managing monitors in the Android app.
19. Agency plan (the entitlement model supports adding one in `packages/shared/src/plans.ts`).
20. iOS app and App Store purchases.
21. Plan changes (monthly ↔ annual), proration and promotional offers.
22. Web unit tests (only Playwright today) and an OpenNext/Cloudflare deployment option for the web app.
