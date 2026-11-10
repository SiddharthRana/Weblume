# Deployment guide

Nothing has been deployed and no paid resources have been created. This guide covers the manual steps; the parts that could be verified in the build environment are marked as such.

## Recommended low-cost setup

| Part              | Where                                                               | Notes                                                                                                                              |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Database + auth   | **Supabase**                                                        | The free tier pauses projects after a week of inactivity and has no downloadable backups. Use **Pro** for production.              |
| API + scan worker | **One small container**: Fly.io, Render or Railway                  | Built from `apps/api/Dockerfile`. One process runs both the HTTP API and the worker (`WORKER_ENABLED=true`).                       |
| Web               | **Cloudflare Pages**                                                | Static export (`next build` → `apps/web/out`), deployed by CI with `wrangler pages deploy`. The free plan covers a site this size. |
| Email             | Resend or Postmark free tier, connected as Supabase **custom SMTP** | Supabase's built-in sender is rate-limited and for testing only.                                                                   |
| Errors (optional) | Sentry free tier                                                    | `SENTRY_DSN` (API), `NEXT_PUBLIC_SENTRY_DSN` (web) and `--dart-define=SENTRY_DSN` (Android).                                       |
| Android           | Google Play Console                                                 | One-time $25 developer fee.                                                                                                        |

Domains: `weblu.me` for the web app and `api.weblu.me` for the API (dev: `dev.weblu.me` and `api-dev.weblu.me`; see "Dev environment" below). Using the same parent domain keeps CORS simple.

## Order of work

1. **Supabase project**
   - Create the project in the region nearest your users (e.g. Mumbai for India).
   - Link it and apply migrations from the repo root:
     ```bash
     supabase link --project-ref <ref>
     supabase db push
     ```
   - Set up Auth (Site URL, redirect URLs, password policy, leaked-password protection, rate limits, SMTP, optional Google), as described in the [README](../README.md#supabase-auth-setup-manual). Leave CAPTCHA off until both clients send a captcha token (README step 6).
   - `supabase db push` also creates `rate_limits`, the shared rate-limit counters the API uses in production.
   - Keep the `billing` feature flag **off** until payments are set up.
2. **API container**
   - Build and push the image:
     ```bash
     docker build -f apps/api/Dockerfile -t <registry>/weblume-api:<version> .
     ```
     Run this from the repo root. The image runs as a non-root user and has a `HEALTHCHECK` on `/health`.
   - Platform settings:
     - Internal port `4000`.
     - Health check path `/health`, readiness `/ready`.
     - At least **512 MB RAM**. PDF rendering and HTML parsing are in-process.
     - **One instance** to start with. Scaling out works: the queue is pg-boss and the rate-limit counters are in Postgres (`RATE_LIMIT_STORE=postgres`, the production default), so every instance enforces the same limits. Per-instance metrics then need summing.
   - Set the environment from [`apps/api/.env.example`](../apps/api/.env.example). The minimum for production:

     | Variable               | Value                                                                                           |
     | ---------------------- | ----------------------------------------------------------------------------------------------- |
     | `NODE_ENV`             | `production`                                                                                    |
     | `DATABASE_URL`         | Supabase **pooler** connection string, session mode, port 5432. pg-boss needs session features. |
     | `SUPABASE_URL`         | `https://<ref>.supabase.co`                                                                     |
     | `SUPABASE_SECRET_KEY`  | Lets account deletion remove the auth user                                                      |
     | `CORS_ORIGINS`         | `https://weblu.me`                                                                              |
     | `PUBLIC_SITE_URL`      | `https://weblu.me`                                                                              |
     | `TRUST_PROXY_HOPS`     | `1` on Fly.io, Render and Railway (one proxy in front)                                          |
     | `GUEST_HASH_SECRET`    | `openssl rand -hex 32`                                                                          |
     | `MONITOR_LINK_SECRET`  | `openssl rand -hex 32` (signs "pause monitoring" links)                                         |
     | `RESEND_API_KEY`       | Resend key for monitoring digests; with `EMAIL_FROM` on a verified domain                       |
     | `TURNSTILE_SECRET_KEY` | Required for guest scans in production                                                          |
     | `PSI_API_KEY`          | Google Cloud API key restricted to the PageSpeed Insights API                                   |
     | `METRICS_TOKEN`        | Optional. Enables `/metrics`                                                                    |
     | `RATE_LIMIT_STORE`     | Optional. `postgres` (default in production) or `memory` (one instance only)                    |
     | `SENTRY_DSN`           | Optional                                                                                        |

     Payment variables are covered in [`payments-setup.md`](payments-setup.md).

   - Outbound network: the worker must reach the internet **directly**. It deliberately ignores HTTP proxies, because a proxy would bypass the SSRF DNS pinning.
3. **Web (Cloudflare Pages)**
   - Every page renders in the browser and talks to the API, so production builds are a static export: `pnpm --filter "./packages/*" run build && pnpm --filter @weblume/web build` writes `apps/web/out`. Nothing runs server-side.
   - Reports are exported once, as `/scan/_` and `/r/_`; [`apps/web/public/_redirects`](../apps/web/public/_redirects) serves those pages for every real id, and the page reads the id from the address. Links the API and the app already hand out keep working.
   - Response headers (CSP, HSTS, `no-referrer` and `noindex` on `/r/*`) are written to `public/_headers` by `next.config.ts` on every production build. Pages serves `/pricing` from `pricing.html` and unknown paths from `404.html` with a 404 status.
   - Preview the real thing locally (applies `_headers` and `_redirects`): `pnpm --filter @weblume/web build && pnpm --filter @weblume/web start`.
   - Create the project once (no Git connection, so production only changes through the approved workflow):
     ```bash
     pnpm --filter @weblume/web exec wrangler login
     ```
     ```bash
     pnpm --filter @weblume/web exec wrangler pages project create weblume --production-branch main
     ```
   - Add your domain under the project's **Custom domains**, and add it to the API's `CORS_ORIGINS`.
   - Create an API token (My Profile → API Tokens → Create token) with **Account → Cloudflare Pages → Edit**. Copy your account ID from the dashboard sidebar.
   - In GitHub, create a `web` environment (Settings → Environments; add yourself as a required reviewer to get an approval step, and limit it to `main`). The `Deploy website` job in `.github/workflows/ci.yml` runs on pushes to `main` once the repository variable `DEPLOY_WEB` is `true`:

     | Kind     | Name                       | Value                                                                                                                                              |
     | -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
     | secret   | `CLOUDFLARE_API_TOKEN`     | The token                                                                                                                                          |
     | variable | `CLOUDFLARE_ACCOUNT_ID`    | Account ID                                                                                                                                         |
     | variable | `CLOUDFLARE_PAGES_PROJECT` | Project name, if not `weblume`                                                                                                                     |
     | variable | `COMING_SOON`              | `true` until launch day: every page except pricing, contact, the bot page and the legal pages shows a "launching soon" screen. Delete it to launch |
     | variable | `NOINDEX`                  | `true` until launch day (keeps the site out of search results), then delete it                                                                     |
     | variable | `SITE_URL`                 | `https://weblu.me`                                                                                                                                 |
     | variable | `API_URL`                  | `https://api.weblu.me`                                                                                                                             |
     | variable | `SUPABASE_URL`             | `https://<ref>.supabase.co`                                                                                                                        |
     | variable | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (public by design)                                                                                                              |
     | variable | `TURNSTILE_SITE_KEY`       | Turnstile site key (public by design)                                                                                                              |
     | variable | `PADDLE_CLIENT_TOKEN`      | Paddle client-side token (public by design)                                                                                                        |
     | variable | `PADDLE_ENV`               | `sandbox` or `production`                                                                                                                          |
     | variable | `WEB_SENTRY_DSN`           | Optional                                                                                                                                           |
     | variable | `AUTH_GOOGLE_ENABLED`      | `true` once Google sign-in is set up in Supabase                                                                                                   |
     | variable | `SUPPORT_EMAIL`            | Shown on the contact and legal pages                                                                                                               |

   - These become the `NEXT_PUBLIC_*` values from [`apps/web/.env.example`](../apps/web/.env.example), **inlined at build time**: redeploy after changing them. The Content-Security-Policy is built from the same values (API, Supabase, Sentry origins).
   - Check that the CSP allows Turnstile and Paddle in your real configuration. The automated tests run without them: open `/scan` signed out and the Paddle checkout page, and look for "Refused to…" errors in the browser console.
4. **DNS and TLS**
   - Point the domains at the hosts. Cloudflare Pages and the suggested API platforms issue certificates automatically.
   - HSTS (`preload`) is sent by the web app. Only submit to the preload list once every subdomain serves HTTPS.
5. **Android**
   - Build a signed App Bundle, as described in [`apps/mobile/README.md`](../apps/mobile/README.md):
     ```bash
     flutter build appbundle --release --dart-define=API_BASE_URL=https://api.weblu.me --dart-define=SITE_URL=https://weblu.me --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=... --dart-define=APP_VERSION=... --dart-define=SENTRY_DSN=...
     ```
   - The app needs Android 8.0 (API 26) or later (sentry_flutter's minimum). The session is kept in Keystore-backed secure storage; sessions from older builds are migrated on first start.
   - Upload it to an internal testing track first.
   - Play Console requirements:
     - Data safety form, based on [`privacy-data-map.md`](privacy-data-map.md). With `SENTRY_DSN` set, declare crash logs and diagnostics (not linked to the user, not shared).
     - Account deletion URL: `https://weblu.me/legal/account-deletion`.
     - Privacy policy URL.
     - Content rating.
6. **Payments**: follow [`payments-setup.md`](payments-setup.md), sandbox first.
7. **Smoke test**: run [`smoke-test.md`](smoke-test.md) against production, then turn on monitoring ([`monitoring.md`](monitoring.md)).

## Production API (api.weblu.me)

Fly app `weblume-api`, configured by [`fly.toml`](../fly.toml) (Singapore, one 512 MB machine, worker in the same process, Dodo live mode, Google Play billing off until the app is published). Every push to `main` deploys it (job "Deploy API (Fly.io, production)") once it is set up:

1. `fly apps create weblume-api`
2. Set the secrets (values never go in `fly.toml` or chat):
   ```bash
   fly secrets set --app weblume-api --stage DATABASE_URL=... SUPABASE_SECRET_KEY=... GUEST_HASH_SECRET=$(openssl rand -hex 32) MONITOR_LINK_SECRET=$(openssl rand -hex 32) RESEND_API_KEY=... TURNSTILE_SECRET_KEY=... PSI_API_KEY=... SENTRY_DSN=... DODO_API_KEY=... DODO_WEBHOOK_SECRET=... DODO_PRODUCT_STARTER_MONTHLY=... DODO_PRODUCT_STARTER_ANNUAL=...
   ```
   `DATABASE_URL` is the production Supabase **session pooler** string (port 5432).
3. First deploy from the repository root: `fly deploy --config fly.toml --ha=false`, then check `https://weblume-api.fly.dev/ready`.
4. Domain: `fly certs add api.weblu.me --app weblume-api`, then a **DNS-only** (grey cloud) CNAME `api` → `weblume-api.fly.dev` in Cloudflare.
5. CI: `fly tokens create deploy --app weblume-api --expiry 8760h`; create the GitHub environment `api` (deployment branch `main`, optionally a required reviewer) with secret `FLY_API_TOKEN`; set the repository variable `DEPLOY_API=true`.
6. Billing: `update public.feature_flags set enabled = true where key = 'billing';` in the production database once Dodo live is set up.

## Dev environment (dev.weblu.me)

A full second copy for testing before production. It shares nothing with production except the Cloudflare account and the Resend domain, so a broken dev deploy or a test purchase can't touch real users.

| Part     | Production                             | Dev                                                         |
| -------- | -------------------------------------- | ----------------------------------------------------------- |
| Website  | Pages project `weblume` → `weblu.me`   | Pages project `weblume-dev` → `dev.weblu.me`                |
| API      | Fly app `weblume-api` → `api.weblu.me` | Fly app `weblume-api-dev` → `api-dev.weblu.me`              |
| Database | Supabase project (Pro)                 | Separate Supabase project (Free is fine; it pauses idle)    |
| Payments | Dodo live mode                         | Dodo test mode                                              |
| Deploys  | push to `main` (environment `web`)     | push to `dev` (environment `web-dev`)                       |
| Search   | indexed                                | `NEXT_PUBLIC_NOINDEX=true`: robots.txt, header and meta tag |

The API is `api-dev`, not `api.dev`: Cloudflare's free certificate covers one level of subdomain (`*.weblu.me`).

1. **Pages:** create a second project, `weblume-dev`, with production branch `main` (the workflow uploads with `--branch main` to whichever project the environment names). Add the custom domain `dev.weblu.me`.
2. **GitHub:** create an environment `web-dev` (deployment branch `dev`). Give it the same variables as `web` but pointing at dev: `SITE_URL=https://dev.weblu.me`, `API_URL=https://api-dev.weblu.me`, the dev Supabase URL and key, `CLOUDFLARE_PAGES_PROJECT=weblume-dev`, `CLOUDFLARE_ACCOUNT_ID`, and the `CLOUDFLARE_API_TOKEN` secret. Set the repository variable `DEPLOY_WEB_DEV=true`.
3. **API:** deploy the same image as a second Fly app with the dev environment: `CORS_ORIGINS=https://dev.weblu.me`, `PUBLIC_SITE_URL=https://dev.weblu.me`, the dev `DATABASE_URL` and `SUPABASE_URL`, `WEB_PAYMENT_PROVIDER=dodo` with `DODO_ENV=test`, its own `GUEST_HASH_SECRET` and `MONITOR_LINK_SECRET`, and `EMAIL_FROM=Weblume Dev <dev@weblu.me>`. Add `api-dev.weblu.me` as a Fly certificate and a DNS-only CNAME in Cloudflare.
4. **Supabase (dev project):** Site URL `https://dev.weblu.me`; redirect URLs `https://dev.weblu.me/auth/callback`, `https://dev.weblu.me/auth/reset-password` and `weblume://auth-callback`. Apply migrations with `supabase link --project-ref <dev-ref>` then `supabase db push`.
5. **Android:** build a dev APK with `--dart-define=API_BASE_URL=https://api-dev.weblu.me --dart-define=SITE_URL=https://dev.weblu.me` plus the dev Supabase values, and `--dart-define=SENTRY_ENVIRONMENT=dev` if Sentry is set.
6. **API deploys from GitHub:** every push to `dev` runs `flyctl deploy --config fly.dev.toml` after the TypeScript and database checks, then checks `/ready`. Set up once:
   - Create a deploy token: `fly tokens create deploy --app weblume-api-dev --expiry 8760h`.
   - Create a GitHub environment `api-dev` (deployment branch `dev`) with the secret `FLY_API_TOKEN` set to that token.
   - Set the repository variable `DEPLOY_API_DEV=true`.
   - Database migrations aren't run by CI: apply them with `supabase db push` (linked to the dev project) before merging code that needs them.
7. **Android dev builds from GitHub:** every push to `dev` builds the app for the dev environment (job "Build Android app (dev)"); download it from the run's **Artifacts**. For the Google Play bundle, start the workflow by hand (**Actions → CI → Run workflow** on `dev`). See `apps/mobile/README.md` for the upload-key secrets.
8. **Turnstile on sign-up, sign-in and reset:** the website and the app send a Turnstile token when `TURNSTILE_SITE_KEY` is set (website: the environment variable; app: the build setting). After both are deployed, turn on Supabase → Authentication → Bot and Abuse Protection → **Enable CAPTCHA protection**, choose Cloudflare Turnstile and paste the Turnstile secret key. Older app builds without the check can no longer sign in after that.
9. **Flow:** branch from `dev`, merge into `dev` to try it on dev.weblu.me, then merge `dev` into `main` to release.

## Updating

- **Migrations first, then code.** Each migration must be backwards-compatible with the running API version (add columns before using them; drop them a release later).
- **API:** deploy the new image. The platform's health check gates traffic. Running scans are protected: on shutdown pg-boss stops taking jobs, and scans stuck as `running` are marked failed (free retry) by the sweeper.
- **Web:** merge to `main` and approve the `web` deployment.
- **Mobile:** release through Play tracks (internal → closed → production). Old app versions keep working because API changes are additive under `/v1`.

## Rollback

- **API:** redeploy the previous image.
- **Web:** in the Pages project's **Deployments**, open an earlier production deployment and choose **Rollback**.
- **Database:** migrations are forward-only. Write a new migration to undo a change, and test it with `pnpm db:verify`. For data loss, see [`runbooks/backup-restore.md`](runbooks/backup-restore.md).
- **Emergency switches** (feature flags, no deploy needed, take effect within 30 seconds):
  ```sql
  update public.feature_flags set enabled = false where key = 'guest_scans'; -- stop anonymous scans
  update public.feature_flags set enabled = false where key = 'psi';         -- stop PageSpeed calls
  update public.feature_flags set enabled = false where key = 'link_check';  -- stop link checking
  update public.feature_flags set enabled = false where key = 'billing';     -- stop checkout (and paid entitlements)
  ```

## What was verified in the build environment

- The API image builds from `apps/api/Dockerfile`.
  - In the build environment this needed the sandbox's proxy CA injected through a local-only Dockerfile copy; the committed Dockerfile is unchanged.
  - The container starts as user `node`, connects to Postgres, and answers `/health`, `/ready` and `/v1/shared/<token>` (404).
  - Fonts for PDFs are included.
- The web production build, with Lighthouse run against it locally (see [`quality-review.md`](quality-review.md)).
- The static export served by `wrangler pages dev` (Cloudflare's local runtime): headers, the report rewrites, a real scan report against the local API, and the web e2e suite.
- The Postgres rate-limit store against local Supabase Postgres, including two API instances sharing one limit (`apps/api/test/rate-limit-store.e2e.test.ts`).
- An Android release APK with secure session storage and Sentry (no DSN) builds. Not run on a device yet.
- Not verified: any real hosting platform, a real Cloudflare Pages deployment, DNS, TLS, Supabase cloud, Play Console, or a deployed CSP with Turnstile and Paddle keys.
