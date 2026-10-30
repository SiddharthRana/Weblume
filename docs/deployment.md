# Deployment guide

Nothing has been deployed and no paid resources have been created. This guide covers the manual steps; the parts that could be verified in the build environment are marked as such.

## Recommended low-cost setup

| Part              | Where                                                                            | Notes                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Database + auth   | **Supabase**                                                                     | The free tier pauses projects after a week of inactivity and has no downloadable backups. Use **Pro** for production.                           |
| API + scan worker | **One small container**: Fly.io, Render or Railway                               | Built from `apps/api/Dockerfile`. One process runs both the HTTP API and the worker (`WORKER_ENABLED=true`).                                    |
| Web               | **Vercel Pro** (simplest for Next.js) or **Cloudflare** via the OpenNext adapter | Vercel Hobby forbids commercial use. Cloudflare Pages alone doesn't run the Next.js server; it needs `@opennextjs/cloudflare` (not set up yet). |
| Email             | Resend or Postmark free tier, connected as Supabase **custom SMTP**              | Supabase's built-in sender is rate-limited and for testing only.                                                                                |
| Errors (optional) | Sentry free tier                                                                 | `SENTRY_DSN` (API) and `NEXT_PUBLIC_SENTRY_DSN` (web).                                                                                          |
| Android           | Google Play Console                                                              | One-time $25 developer fee.                                                                                                                     |

Domains: for example, `weblume.app` for the web app and `api.weblume.app` for the API. Using the same parent domain keeps CORS simple.

## Order of work

1. **Supabase project**
   - Create the project in the region nearest your users (e.g. Mumbai for India).
   - Link it and apply migrations from the repo root:
     ```bash
     supabase link --project-ref <ref>
     supabase db push
     ```
   - Set up Auth (Site URL, redirect URLs, SMTP, optional Google), as described in the [README](../README.md#supabase-auth-setup-manual).
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
     - **One instance** to start with. Scaling out works, because the queue is pg-boss in Postgres, but per-instance metrics then need summing.
   - Set the environment from [`apps/api/.env.example`](../apps/api/.env.example). The minimum for production:

     | Variable               | Value                                                                                           |
     | ---------------------- | ----------------------------------------------------------------------------------------------- |
     | `NODE_ENV`             | `production`                                                                                    |
     | `DATABASE_URL`         | Supabase **pooler** connection string, session mode, port 5432. pg-boss needs session features. |
     | `SUPABASE_URL`         | `https://<ref>.supabase.co`                                                                     |
     | `SUPABASE_SECRET_KEY`  | Lets account deletion remove the auth user                                                      |
     | `CORS_ORIGINS`         | `https://weblume.app`                                                                           |
     | `PUBLIC_SITE_URL`      | `https://weblume.app`                                                                           |
     | `TRUST_PROXY_HOPS`     | `1` on Fly.io, Render and Railway (one proxy in front)                                          |
     | `GUEST_HASH_SECRET`    | `openssl rand -hex 32`                                                                          |
     | `TURNSTILE_SECRET_KEY` | Required for guest scans in production                                                          |
     | `PSI_API_KEY`          | Google Cloud API key restricted to the PageSpeed Insights API                                   |
     | `METRICS_TOKEN`        | Optional. Enables `/metrics`                                                                    |
     | `SENTRY_DSN`           | Optional                                                                                        |

     Payment variables are covered in [`payments-setup.md`](payments-setup.md).

   - Outbound network: the worker must reach the internet **directly**. It deliberately ignores HTTP proxies, because a proxy would bypass the SSRF DNS pinning.
3. **Web**
   - Import the repo with **root directory** `apps/web`. Install with `pnpm install --frozen-lockfile` at the repo root, and build with `pnpm --filter "./packages/*" run build && pnpm --filter @weblume/web build`.
   - Set the `NEXT_PUBLIC_*` variables from [`apps/web/.env.example`](../apps/web/.env.example). These are **inlined at build time**: rebuild after changing them. The Content-Security-Policy is built from the same values (API, Supabase, Sentry origins).
   - Check that the CSP allows Turnstile and Paddle in your real configuration. The automated tests run without them: open `/scan` signed out and the Paddle checkout page, and look for "Refused to…" errors in the browser console.
4. **DNS and TLS**
   - Point the domains at the hosts. All the suggested platforms issue certificates automatically.
   - HSTS (`preload`) is sent by the web app. Only submit to the preload list once every subdomain serves HTTPS.
5. **Android**
   - Build a signed App Bundle, as described in [`apps/mobile/README.md`](../apps/mobile/README.md):
     ```bash
     flutter build appbundle --release --dart-define=API_BASE_URL=https://api.weblume.app --dart-define=SITE_URL=https://weblume.app --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=...
     ```
   - Upload it to an internal testing track first.
   - Play Console requirements:
     - Data safety form, based on [`privacy-data-map.md`](privacy-data-map.md).
     - Account deletion URL: `https://weblume.app/legal/account-deletion`.
     - Privacy policy URL.
     - Content rating.
6. **Payments**: follow [`payments-setup.md`](payments-setup.md), sandbox first.
7. **Smoke test**: run [`smoke-test.md`](smoke-test.md) against production, then turn on monitoring ([`monitoring.md`](monitoring.md)).

## Updating

- **Migrations first, then code.** Each migration must be backwards-compatible with the running API version (add columns before using them; drop them a release later).
- **API:** deploy the new image. The platform's health check gates traffic. Running scans are protected: on shutdown pg-boss stops taking jobs, and scans stuck as `running` are marked failed (free retry) by the sweeper.
- **Web:** a normal redeploy.
- **Mobile:** release through Play tracks (internal → closed → production). Old app versions keep working because API changes are additive under `/v1`.

## Rollback

- **API / web:** redeploy the previous image or deployment.
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
- Not verified: any real hosting platform, DNS, TLS, Supabase cloud, Play Console, or a deployed CSP with Turnstile and Paddle keys.
