# Weblume — Build Prompt (v2)

You are a senior full-stack engineer, Flutter developer, product designer, and pragmatic startup CTO. Build a production-minded MVP for a subscription product called **Weblume**.

---

## 0. PRODUCT IN ONE PARAGRAPH

Weblume is a website audit toolkit for freelancers, developers, agencies, website owners, and small businesses. A user enters a website URL and gets a **plain-language, client-ready report** covering performance, SEO, accessibility, and technical health, with prioritised, actionable fixes.

**Why anyone pays:** raw tools like PageSpeed Insights and Lighthouse are free, but hard for non-technical people to read and unsuitable to hand to a client. Weblume's value is **clear explanations, prioritisation, history, and polished PDF reports**. Spend design and copy effort there.

Constraints: works globally (India included), cheap to operate, easy to maintain, built and run by a solo founder working part-time.

---

## 1. WORKING RULES

- Inspect the workspace and any instructions (`README`, `CLAUDE.md`, `docs/`) before changing anything. Preserve useful existing work.
- Build the product, not just a proposal.
- **Work in phases and stop at each checkpoint** (section 12). At each checkpoint: summarise what was built, what was verified (with command output), and what is incomplete. Then wait for my go-ahead before starting the next phase.
- Maintain these files throughout and commit them with the code:
  - `docs/PROGRESS.md`: current phase, done / in progress / blocked, next steps. Keep it accurate enough that a fresh session can resume from it alone.
  - `docs/DECISIONS.md`: short dated entries for every non-trivial choice (what, why, alternatives rejected).
- Commit in small, logical commits. Commit at the end of every phase at minimum.
- Run formatters, linters, type checks, tests, and production builds. **If a toolchain is missing** (Flutter SDK, Android SDK, Chromium, Postgres), try to install it. If you can't, report exactly what was skipped and why. Never silently skip it.
- Never claim a feature, test, integration, build, or deployment works unless you verified it in this session.
- Never log or commit secrets, API keys, tokens, personal data, or report contents.
- **Do not spend money, create paid resources, register accounts, or deploy publicly.** Prepare the configuration and document the manual steps instead.
- Ask a question only when a decision genuinely blocks you. Otherwise use the defaults in this document. If a default is impossible, pick the closest low-cost alternative and record it in `DECISIONS.md`.
- Phrases like "out of scope for v1" are deliberate. Don't build those items, but don't make design choices that block them.

---

## 2. REPOSITORY (MONOREPO)

All Weblume code lives in **this single Git repository**:

```
/
├── apps/
│   ├── web/            # Next.js (TypeScript) — marketing site + web app
│   ├── api/            # NestJS (TypeScript) — REST API + scan worker
│   └── mobile/         # Flutter (Dart) — Android-first app
├── packages/
│   ├── design-tokens/  # tokens.json → generated CSS variables (web) + Dart theme (mobile)
│   ├── api-client-ts/  # generated from OpenAPI
│   └── shared/         # shared TS types/constants (plan config, check IDs, severities)
├── supabase/           # SQL migrations, seed data, local config
├── docs/               # PROGRESS.md, DECISIONS.md, architecture, runbooks, legal placeholders
├── .github/workflows/  # CI
└── README.md
```

- Use **pnpm workspaces** for the TypeScript packages. The Flutter app is managed by its own tooling, but root scripts can call it.
- **API contract:** NestJS generates an OpenAPI spec (`apps/api/openapi.json`, committed). The TypeScript client and the Dart client (`apps/mobile/lib/api/`) are **generated from it**, never hand-written. Add a script that regenerates both and a CI check that fails if they're stale.
- **Design tokens:** a single `packages/design-tokens/tokens.json` (colours, type scale, spacing, radii, severity colours) generates CSS variables for web and a Dart `ThemeData` extension for Flutter.
- Root `README.md` must cover: prerequisites, local setup, every environment variable, commands, architecture diagram (text or Mermaid), testing, deployment, and troubleshooting.
- Every app has a `.env.example` with placeholders only.
- **CI (GitHub Actions):** on every push, lint + typecheck + unit tests for web and api, `flutter analyze` + `flutter test` for mobile, and the OpenAPI-staleness check.

---

## 3. TECH STACK AND HOSTING DEFAULTS

| Concern | Default | Notes |
|---|---|---|
| Web | Next.js (App Router), TypeScript, Tailwind | SSG for marketing/blog/sample report, SSR or client for the app |
| API | NestJS, TypeScript | One deployable that runs both the HTTP API and the queue worker (separable later by env flag) |
| Database | PostgreSQL via **Supabase** | Migrations in `supabase/migrations`, applied with the Supabase CLI |
| Auth | **Supabase Auth** (email/password + Google sign-in) | NestJS verifies the Supabase JWT on every request; authorisation happens in NestJS, with Row Level Security as a second layer |
| Queue | **pg-boss** (Postgres-backed) | No Redis. Required because scans take 10–60s |
| Mobile | Flutter, Material 3, Riverpod, go_router, dio | Android first; iOS-ready structure, but no iOS billing |
| Transactional email | Supabase Auth emails via custom SMTP (Resend or Postmark free tier) | Supabase's built-in SMTP is rate-limited and not for production |
| Bot protection | Cloudflare Turnstile | Guest scans and sign-up |
| Errors | Sentry (free tier) with PII scrubbing | Optional; app must run without it |
| Analytics | Privacy-friendly and optional (e.g. Plausible/Umami) | Off by default |
| Hosting (documented, not deployed) | Web: Cloudflare Pages or Vercel Pro. API + worker: one small container on Fly.io / Render / Railway. DB: Supabase | Note that Vercel Hobby forbids commercial use, and that Supabase's free tier pauses inactive projects |

No microservices, Kubernetes, Redis, or extra services beyond these unless something genuinely blocks you (record it in `DECISIONS.md`).

Every third-party integration (PSI, payments, email, error tracking) sits behind an interface with a **no-op or fake implementation** used when it isn't configured, so the whole system runs locally with zero API keys.

---

## 4. WHAT A SCAN IS (v1)

A scan audits **one page**: the submitted URL after normalisation and redirects.

1. **Validate and normalise** the URL: `http`/`https` only, ports 80/443 only, lowercase the host, strip fragments, keep paths and queries, convert IDNs to punycode. Show clear, specific error messages.
2. **Dedupe:** if the same user scanned the same normalised URL within the last 10 minutes, return the existing scan instead of running a new one.
3. **Guarded fetch** of the page HTML through a single hardened HTTP client (section 5).
4. **Own checks** on the fetched HTML and response (section 6).
5. **PageSpeed Insights** API call for **mobile and desktop** strategies, if a key is configured. PSI runs on Google's infrastructure and returns the Lighthouse Performance, Accessibility, SEO, and Best Practices categories.
6. **Link check:** up to **50** unique links found on the page, checked with HEAD (falling back to GET), at most **5 concurrent requests per host**, a 5s timeout each, all through the guarded client.
7. **robots.txt and sitemap.xml** of the origin: fetch, parse, and report.
8. Assemble and store the report.

**Hard limits** (configurable via env, these are defaults):

| Limit | Default |
|---|---|
| Total scan time | 90s |
| Per-request timeout | 10s (page), 5s (links) |
| Max response body | 5 MB (page), 1 MB (robots/sitemap) |
| Max redirects | 5, each hop revalidated |
| Global concurrent scans | 3 |
| Concurrent scans per user | 1 |

- Identify yourself honestly: `User-Agent: WeblumeBot/1.0 (+https://<domain>/bot)`, and add a `/bot` page explaining what the bot does.
- Respect `robots.txt` for the link checker (skip disallowed URLs and report them as "not checked"). The user-requested page itself is fetched once, like a browser would.
- **No headless browser in v1.** Accessibility data comes from PSI/Lighthouse (which uses axe-core). Running our own Chromium against untrusted pages is a separate SSRF and sandboxing problem and is **out of scope for v1**. Document it as a possible v2 addition that would require per-request IP validation inside the browser and a sandboxed worker.
- Never attempt intrusive testing, vulnerability scanning, form submission, authentication bypass, or anything beyond what a normal visitor's browser would request.

**Scan states:** `queued → running → completed | partial | failed`.
- `partial` means some sources succeeded and others failed (for example, PSI timed out but own checks worked). The report says exactly which sources are missing and why.
- `failed` gets a human-readable reason (DNS failure, blocked destination, timeout, too large, non-HTML, HTTP 4xx/5xx) and a retry button. Retrying a failed scan does not count against quota if the failure was on our side or the integration's.
- Clients poll `GET /scans/:id` every 2s while a scan is running (no websockets in v1).

---

## 5. SSRF AND OUTBOUND SAFETY

Every outbound request to a user-influenced destination goes through **one** guarded HTTP client module. Nothing else may make such requests.

- Resolve DNS yourself, validate **every** resolved address, then **connect to the validated IP** (pinning the IP in the connection while keeping the Host/SNI header). This prevents DNS rebinding.
- Block: loopback, private (RFC 1918), CGNAT `100.64.0.0/10`, link-local (`169.254.0.0/16` including cloud metadata `169.254.169.254`), `0.0.0.0/8`, multicast, broadcast, reserved/documentation ranges, IPv6 loopback `::1`, unique-local `fc00::/7`, link-local `fe80::/10`, IPv4-mapped/compatible IPv6 (`::ffff:127.0.0.1`), NAT64 prefixes, and the API's own hosts. Use a maintained IP-range library and add our own tests on top.
- Reject alternative IP notations in URLs (decimal `2130706433`, octal `0177.0.0.1`, hex `0x7f.1`, shortened `127.1`) or normalise them and then validate.
- Follow redirects manually, at most 5, revalidating scheme, port, host, and IPs on every hop.
- Enforce timeouts, body-size limits (abort the stream when exceeded), and allowed content types.
- Don't send cookies or credentials, and don't forward user headers.

**Mandatory security tests** cover every case above, plus: a domain that resolves to a private IP, a public URL that redirects to a private IP, a redirect loop, an oversized body, a slow-drip body, a non-HTTP scheme (`file:`, `gopher:`, `ftp:`, `data:`), a URL with credentials (`http://user:pass@host`), and a non-standard port.

---

## 6. AUDIT CHECKS AND SCORING

Every check has a **stable ID** (e.g. `seo.title.missing`), a category, a severity, and **curated static content** in `packages/shared/checks/`: a title, what it means, why it matters (plain language, for a non-technical owner), how to fix it (concrete steps), and a "learn more" link. Write this copy carefully; it is the product. No LLM-generated copy at runtime.

**Our checks (from HTML/HTTP):**
- **SEO:** title present, length 10–60 characters; meta description present, 50–160; exactly one `<h1>`; heading levels not skipped; canonical present and absolute; `noindex` in meta robots or `X-Robots-Tag`; `lang` attribute; Open Graph basics (title, description, image); robots.txt reachable and not blocking the page; sitemap present (from robots.txt or `/sitemap.xml`) and parseable.
- **Technical:** HTTPS used; HTTP redirects to HTTPS; HSTS header; redirect chain length; final status code; mixed-content references (`http://` assets on an HTTPS page); `<img>` without `alt`; viewport meta; favicon; page size; broken links (4xx/5xx/timeouts, listed with their status).

**Lighthouse findings from PSI:** map failed Lighthouse audits to findings, keeping Lighthouse's audit ID and description and adding our plain-language explanation where we have one.

**Severity:** `critical`, `high`, `medium`, `low`, `info`. Each check's severity is defined in the check catalogue, not computed ad hoc.

**Scoring rules (documented in `docs/scoring.md`):**
- Category scores shown are **Lighthouse scores from PSI**, labelled "Lighthouse (mobile)" and "Lighthouse (desktop)". If PSI is unavailable, **show no score**, just the reason.
- Our own checks produce findings and pass/fail counts, **not** an invented numeric score.
- No overall "Weblume score" in v1.

**Every report shows:** target URL, final URL, scan date/time, which sources ran or failed, what was **measured** (Lighthouse metrics) vs. **detected** (automated findings) vs. **recommended**, and a fixed limitations notice: automated audits can't guarantee accessibility compliance, SEO rankings, security, or business outcomes. Never fill in missing data with estimates.

---

## 7. REPORTS, HISTORY, SHARING, PDF

- **Results page:** summary (scores if available, a findings count by severity, top 5 priorities), then findings grouped by category and sorted by severity, each expandable to show its explanation and fix.
- **History:** list of past scans with URL, date, status, and severity counts, with search by URL.
- **Comparison:** for two completed scans of the same normalised URL, show findings that are new, resolved, and unchanged, plus score deltas.
- **PDF export** (paid plans): generated server-side from a dedicated HTML template with a print stylesheet. Use a pure-JS PDF library (e.g. `@react-pdf/renderer`) to avoid running a browser. The PDF should be clean, branded, and include the limitations notice.
- **Sharing** (paid plans): private by default. The owner can create a share link with a random 128-bit token, an optional expiry (default 30 days), and revocation. Shared pages are read-only, `noindex`, and hide account details.
- Out of scope for v1, but **schema-ready**: custom branding on PDFs (agency logo and name) and scheduled re-scans with change alerts.

---

## 8. ACCOUNTS AND PLANS

**Auth:** sign-up, login, logout, password reset, email verification, Google sign-in, and **account deletion** (in-app and on web; Google Play requires both, plus a public web URL for deletion requests). Data export as JSON.

**Plans are configuration, not code.** Define them in `packages/shared/plans.ts` (or a DB table seeded from it), mapping provider product IDs to an internal plan and a set of entitlements. All entitlement checks go through one server-side `EntitlementService`. Never trust client-side flags.

**Initial plan hypotheses** (to be validated, so keep them easy to change):

| | Guest (no account) | Free | Starter |
|---|---|---|---|
| Scans | 1 per day per IP + Turnstile | 5 / month | 60 / month |
| PSI (Lighthouse) data | ✓ | ✓ | ✓ |
| History retention | 24h, then deleted | 30 days | 12 months |
| Comparison | ✗ | ✗ | ✓ |
| PDF export | ✗ | ✗ | ✓ |
| Share links | ✗ | ✗ | ✓ |
| Price (India) | — | — | ₹149/mo or ₹1,199/yr |
| Price (international) | — | — | $3.99/mo or $29.99/yr |

- Quotas reset on the billing anniversary for paid users and on the calendar month for free users.
- A guest scan can be claimed into a new account on sign-up.
- An agency tier is **out of scope for v1**; the entitlement model just needs to allow adding one.
- Add `docs/unit-economics.md`: estimated cost per scan (PSI is free within quota, plus compute and bandwidth), net revenue per subscriber after payment-provider fees and taxes, and the margin at the quota limits.

---

## 9. PAYMENTS

There are two purchase channels, and both feed **one entitlement model** keyed by the Weblume user ID:

```
Google Play Billing ─┐
                     ├─► PaymentProvider interface ─► subscriptions table ─► EntitlementService
Web (global MoR)  ───┘        (verify server-side)
```

### 9a. Web — global, via a Merchant of Record
Web payments must work for **customers worldwide, including India**, and be operable by an India-based solo founder. Use a **Merchant of Record (MoR)**: it is the legal seller, collects and remits VAT, GST, and sales tax in every country, and handles invoices, card and local payment methods (including UPI/RuPay where supported), and refunds.

- **Default:** Paddle Billing. **Alternatives behind the same interface:** Lemon Squeezy, Dodo Payments.
- **Verify before building:** check each candidate's current documentation for (1) seller eligibility for an India-based individual or business, (2) support for buyers in India and recurring payments there (RBI e-mandate rules), and (3) INR pricing support. Record findings and the final choice in `DECISIONS.md`. If the default fails these checks, switch to the alternative that passes.
- Implement: hosted or overlay checkout, customer portal link (manage/cancel), and webhook handling with **signature verification**, idempotency (store event IDs), and out-of-order safety (compare event timestamps and fetch subscription state from the provider API when in doubt).
- **Regional pricing:** use the MoR's localised or country pricing based on the **billing country** the provider determines. Never set prices from client-side IP geolocation. Prices are configured in the provider dashboard and referenced by price ID.
- Implement with **sandbox credentials only**. Document every dashboard step I need to do.

### 9b. Android — Google Play Billing
Google Play policy requires Play Billing for digital subscriptions bought inside the Android app.

- Use the official `in_app_purchase` Flutter plugin (Play Billing Library 7+ under the hood).
- The user must be **logged in before purchasing**. Pass a hashed Weblume user ID as `obfuscatedAccountId`.
- The server verifies every purchase token with the **Google Play Developer API** (`purchases.subscriptionsv2`), then **acknowledges** the purchase. Unacknowledged purchases are auto-refunded after 3 days.
- Handle **Real-time Developer Notifications** (Cloud Pub/Sub push to an authenticated endpoint) for renewals, cancellations, grace period, account hold, pause, revocation, and refunds.
- Prices are set per country in Play Console. Display prices from the Play API in the app, never hard-coded.

### 9c. Cross-platform rules
- An active subscription from either channel grants the same entitlements on web and mobile.
- The mobile app links to the web site only where Play policy permits. The web shows Play-managed subscriptions as "Manage in Google Play".
- If a user has active subscriptions on both channels, detect it and show a warning (don't silently double-charge).
- Model subscription states: `trialing`, `active`, `grace_period`, `on_hold`, `paused`, `canceled` (active until period end), `expired`, `refunded`.
- iOS payments are out of scope until iOS is.
- RevenueCat is an acceptable alternative for unifying channels. Evaluate it in `DECISIONS.md`, but default to direct integration behind our own interface.
- Billing is controlled by `BILLING_ENABLED`. When it's off, everyone gets free-plan entitlements and the pricing UI shows "coming soon".

---

## 10. WEB PAGES AND MOBILE SCREENS

**Web (marketing, SSG, SEO-optimised, with proper meta and OG tags, sitemap, robots):**
Home, Features, How it works, Sample report (a real static report fixture), Pricing (prices from config/provider), Blog (MDX, with 2 seed articles), Contact/Support (form with Turnstile, sent via email provider), `/bot`, Privacy policy, Terms, Refund policy, and Account-deletion info. Legal pages are clearly marked **"DRAFT — requires legal review"** and mention GDPR and India's DPDP Act 2023.

**Web (app, authenticated):** Sign up, Log in, Reset password, Dashboard (recent scans, usage remaining), New scan, Scan progress/results, History, Compare, Account, Subscription, Data export and deletion.

**Mobile (genuine Flutter UI, no WebView for app content):** Onboarding/login, Dashboard, New scan, Scan progress, Report overview, Finding detail, History, Compare (should-have), Account, Subscription (Play Billing), Delete account. Every screen has loading, empty, error, and **offline** states. Cache the last report list locally for offline viewing (read-only).

English only in v1, with all user-facing strings externalised (`next-intl` / Flutter `intl` ARB files) for later localisation.

---

## 11. DESIGN, SECURITY, PRIVACY, COST, OBSERVABILITY

**Design:** clean, confident, technical, approachable. Text wordmark "Weblume" plus a simple geometric mark made in SVG. No unlicensed assets. WCAG 2.2 AA contrast. Severity uses colour **plus** icon and label (never colour alone). Minimal animation. A non-technical owner should understand the top-of-report summary in 10 seconds.

**Security:**
- Validate all input with schemas (`class-validator`/`zod`).
- Rate limit per IP and per user.
- Enforce quotas server-side.
- Use helmet/security headers and a CSP on web.
- CORS restricted to known origins.
- Authorise every report read and write by owner ID on the server.
- Use parameterised queries only.
- Return safe error messages (no stack traces to clients).
- Run a dependency audit in CI.
- Never claim the product is "secure" or "compliant"; describe the measures taken.

**Privacy and retention:**
- `docs/privacy-data-map.md` lists data collected, purposes, processors (Supabase, PSI/Google, MoR, Google Play, email, Sentry), retention, and deletion paths.
- Store only extracted findings and metadata, **not full page HTML**.
- A scheduled job deletes scans past their plan's retention.
- Account deletion removes personal data and scans within 30 days and documents what payment providers keep.

**Cost control:**
- PSI results are cached per normalised URL and strategy for 6 hours.
- PSI, email, Sentry, and analytics are each optional via env flags.
- An admin **kill switch** (env or DB flag) disables guest scans or PSI instantly.
- `docs/costs.md` lists cost drivers, free-tier limits (PSI quota, Supabase limits, hosting), and how to cut each.

**Observability:**
- Structured JSON logs with request IDs. Never log URLs' query strings, tokens, emails, or report contents.
- Basic metrics: scans started/completed/failed by reason, PSI latency and errors, queue depth.
- `/health` and `/ready` endpoints.

**Database:**
- All schema changes go through migrations, never manual edits.
- `docs/runbooks/backup-restore.md` documents Supabase backups plus a `pg_dump` procedure and a tested restore to local.

---

## 12. PHASES AND CHECKPOINTS

Each phase ends with a **checkpoint**: run all checks, update `PROGRESS.md`, commit, report, and **wait for my go-ahead**.

**Phase 1 — Foundation**
Monorepo, pnpm workspaces, CI, design tokens pipeline, README skeleton, `.env.example` files, Supabase local setup and initial schema (users/profiles, scans, findings, subscriptions, usage, share links, webhook events), NestJS skeleton with auth guard and OpenAPI, Next.js with marketing pages and layout, Flutter skeleton with theme from tokens and routing.
✅ *Done when:* `pnpm install && pnpm lint && pnpm typecheck && pnpm test` pass; web builds; API starts and serves `/health` and OpenAPI; migrations apply to local Supabase; `flutter analyze` passes; and CI runs green or is at least verified locally.

**Phase 2 — Audit engine and web results**
Guarded HTTP client and the full SSRF test suite, URL normalisation, queue and worker, own checks and check catalogue with copy, PSI integration (with a fake implementation when unconfigured), report assembly, scan states, web New scan / progress / results / history pages, and the guest scan with Turnstile.
✅ *Done when:* a real public URL produces a stored report via the web UI (with PSI data if a key is provided, an honest "PSI not configured" notice otherwise), all SSRF tests pass, and the failure states are demonstrated by tests.

**Phase 3 — Accounts, entitlements, quotas**
Supabase Auth on web, authorisation tests (user A cannot read user B's scans), plan config, EntitlementService, quotas, retention job, data export, and account deletion.
✅ *Done when:* API tests cover auth, authorisation, quotas, and retention, and the free-plan limits are enforced end to end.

**Phase 4 — Mobile app**
Generated Dart client, all mobile screens, offline cache, and widget tests for the core flows.
✅ *Done when:* `flutter test` passes, a **release APK builds** (`flutter build apk --release`, or the exact blocker is reported), and the iOS setup steps are documented.

**Phase 5 — Payments**
PaymentProvider interface, MoR web integration (sandbox), Play Billing on mobile and server verification, RTDN endpoint, subscription state machine, cross-channel entitlement sync, and the billing-disabled mode.
✅ *Done when:* webhook signature verification, idempotency, and every subscription state transition are covered by tests using recorded and fake payloads, and `docs/payments-setup.md` lists every manual console/dashboard step.

**Phase 6 — Reports+ and launch prep**
PDF export, share links, comparison, accessibility review of web and mobile (automated axe on our own web pages plus a manual checklist), Lighthouse run on our own marketing pages, security self-review against this document, deployment guide, monitoring, troubleshooting, and the manual smoke-test checklist.
✅ *Done when:* the Definition of Done (below) is met, and `docs/PROGRESS.md` ends with a **prioritised list of unfinished items and known limitations**.

---

## 13. TESTING REQUIREMENTS

- **Unit:** URL validation and normalisation, IP blocking, every own check (with HTML fixtures), PSI response mapping (with recorded fixtures), entitlements, quotas, the subscription state machine, and report comparison.
- **API:** auth, authorisation (cross-user access denied), quotas, rate limits, dedupe, error responses, missing API keys, and integration timeouts.
- **Security:** the full SSRF list in section 5, run against a local test server that issues redirects and serves oversized or slow bodies.
- **Web:** Playwright tests for marketing pages rendering, sign-up/login, and the new scan → results flow (against a fake PSI).
- **Mobile:** widget tests for dashboard, new scan validation, progress/error states, and report view.
- **Never** call real paid or quota-limited external APIs in automated tests; use fakes and recorded fixtures.
- `docs/smoke-test.md`: a manual checklist I can run before each release.

---

## 14. DEFINITION OF DONE

- Web and Android app have a coherent, working core flow: sign up → scan a URL → see a real report → view history.
- With a PSI key configured, reports include real Lighthouse data. Without one, they say so honestly.
- Failed scans, partial scans, and missing integrations are handled and explained honestly.
- Auth and private-report authorisation are enforced server-side and tested.
- When billing is enabled, entitlements are enforced server-side from verified provider state only.
- All tests, linters, type checks, and production builds have been run, with results reported (including anything that couldn't run and why).
- Setup, environment variables, deployment, and manual console steps are documented.
- Remaining work and known limitations are listed in priority order.

**Start now:** inspect the workspace, report a concise implementation plan (no more than one screen), then begin Phase 1.
