# Progress

**Current phase:** 2 — Audit engine and web results ✅ complete, awaiting go-ahead for Phase 3.
**Last updated:** 2026-10-30

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

## Next: Phase 3 — Accounts, entitlements, quotas

Supabase Auth on web (sign-up, login, reset, Google), claiming guest scans into an account, `EntitlementService` (replacing the hard-coded free plan), account history across devices, retention job, data export, account deletion, authorisation tests.

## Manual setup you'll need

- **PageSpeed Insights API key** (free): Google Cloud console → enable "PageSpeed Insights API" → create an API key restricted to that API → `PSI_API_KEY`.
- **Cloudflare Turnstile** (free): create a widget → site key to `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret to `TURNSTILE_SECRET_KEY`.
- **`GUEST_HASH_SECRET`** for production: `openssl rand -hex 32`.
- Supabase project (Phase 3), Android upload keystore (Phase 4).
