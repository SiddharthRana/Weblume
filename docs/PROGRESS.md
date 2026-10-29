# Progress

**Current phase:** 1 — Foundation ✅ complete, awaiting go-ahead for Phase 2.
**Last updated:** 2026-10-29

## Phase 1 — Foundation

### Done (verified in this environment)

| Area           | What                                                                                                                                                                                                                                                             | Verified by                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Monorepo       | pnpm workspaces, shared TS config, Prettier, ESLint 10 flat config, `.editorconfig`, `.nvmrc`                                                                                                                                                                    | `pnpm lint`, `pnpm format:check`                                                                                        |
| Design tokens  | `tokens.json` → CSS vars, TS module, Dart constants; `--check` mode for stale Dart output                                                                                                                                                                        | 36 WCAG AA contrast tests (light + dark)                                                                                |
| Shared package | Plans/entitlements config, severities, scan states, report sources                                                                                                                                                                                               | 7 unit tests                                                                                                            |
| Database       | Initial migration: profiles, scans, findings, subscriptions, share links, webhook events, feature flags; enums; RLS; triggers                                                                                                                                    | `pnpm db:verify` on PostgreSQL 16: migrations apply, RLS isolation, no direct writes, cascade deletes                   |
| API            | NestJS 12: env validation (zod), Supabase JWT guard (JWKS + HS256), `@Public()` routes, `/health`, `/ready`, `GET /v1/plans`, `GET /v1/me`, helmet, CORS allow-list, per-IP rate limit, 100 kb body limit, pino logs without headers or query strings, OpenAPI   | 24 tests; built and ran against local Postgres (`/ready` 200, `/v1/me` 401 without token, CORS rejects unknown origins) |
| API client     | `@weblume/api-client-ts` generated from `openapi.json` (openapi-typescript + openapi-fetch) with token middleware                                                                                                                                                | 2 tests; `pnpm openapi:check`                                                                                           |
| Web            | Next.js 16: Home, Features, How it works, Sample report (fixture), Pricing (from plan config), Blog (MDX, 2 posts), Contact, `/bot`, Privacy/Terms/Refund/Account-deletion drafts, 404, sitemap, robots, security headers, dark mode, mobile nav                 | Production build; 88 Playwright tests (desktop + mobile + dark-mode axe): 0 WCAG 2.2 AA violations                      |
| Mobile         | Flutter 3.47: Material 3 theme from tokens (light/dark), severity colour extension, go_router shell (bottom bar / rail), Riverpod, gen-l10n, placeholder screens with honest "coming soon" states, Android app ID + release signing config + INTERNET permission | `flutter analyze` clean; 8 widget tests incl. tap-target, label and contrast guidelines                                 |
| CI             | GitHub Actions: TS lint/typecheck/test/build, generated-file check, Playwright e2e, `pnpm audit`; DB migrations + RLS on Postgres 17; Flutter format/analyze/test + Android release APK build                                                                    | Workflow written; **not yet run on GitHub**                                                                             |
| Docs           | README, DECISIONS, this file, mobile README, backup runbook                                                                                                                                                                                                      | —                                                                                                                       |

### Not verified / blocked in this environment

- **Android APK build:** `dl.google.com` is blocked by this environment's network policy, so the Android SDK couldn't be installed. The CI `flutter` job builds the release APK on GitHub's runners (which include the SDK). This needs confirming on the first CI run.
- **`supabase start`:** Docker isn't available here. Migrations were verified on plain PostgreSQL 16 with an `auth` stub instead. `supabase/config.toml` is untested.
- **CI workflow:** written but not yet run on GitHub.
- **Live Supabase JWT verification:** tested with locally generated ES256/HS256 keys in the Supabase token format, not against a real Supabase project.

## Next: Phase 2 — Audit engine and web results

Guarded HTTP client + SSRF test suite, URL normalisation, pg-boss queue + worker, own checks + check catalogue copy, PSI integration (fake when unconfigured), report assembly, scan states, web new-scan/progress/results/history pages, guest scan with Turnstile.

## Manual setup you'll need eventually (not needed yet)

- Supabase project (free tier is fine for development).
- Google Cloud API key for PageSpeed Insights (Phase 2; free quota).
- Cloudflare Turnstile site/secret keys (Phase 2; free).
- Android upload keystore → `apps/mobile/android/key.properties` (Phase 4).
