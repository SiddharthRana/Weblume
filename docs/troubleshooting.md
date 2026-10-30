# Troubleshooting

## Local development

| Problem                                                                          | Fix                                                                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Web build can't resolve `@weblume/design-tokens/tokens.css` or `@weblume/shared` | Build the packages first: `pnpm --filter "./packages/*" run build`                                        |
| `pnpm install` warns about ignored build scripts for `@scarf/scarf`              | Expected: a telemetry postinstall from swagger-ui that we deliberately don't run                          |
| `pnpm openapi:check` fails after an API change                                   | Run `pnpm openapi && pnpm tokens` and commit the regenerated files (OpenAPI JSON, TS client, Dart client) |
| Web types don't know a new API route                                             | Rebuild the TS client: `pnpm --filter @weblume/api-client-ts run build`                                   |
| API database tests are skipped                                                   | Set `TEST_DATABASE_URL`, after `pnpm db:test-setup`                                                       |
| Flutter: `flutter` not found                                                     | Install Flutter 3.47 stable, or add the SDK's `bin` to `PATH`                                             |
| Android emulator can't reach the local API                                       | Use `http://10.0.2.2:4000`, not `localhost`                                                               |

## API

| Symptom                                                | Cause / fix                                                                                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup fails with `Invalid environment configuration` | The message lists **which** variables are wrong (never their values). Compare with `apps/api/.env.example`                                                                    |
| `/ready` returns 503                                   | Database unreachable: check `DATABASE_URL`, the Supabase project status (free projects pause), and IP restrictions. `/health` stays 200 because it doesn't touch dependencies |
| 401 on every request                                   | `SUPABASE_URL` must match the project that issued the token (issuer `<SUPABASE_URL>/auth/v1`). On legacy HS256 projects, set `SUPABASE_JWT_SECRET`                            |
| `403 account_deleted`                                  | The account requested deletion. Expected                                                                                                                                      |
| Browser shows CORS errors                              | Add the exact web origin (scheme + host, no trailing slash) to `CORS_ORIGINS`                                                                                                 |
| Rate limits hit behind a proxy for everyone            | `TRUST_PROXY_HOPS` is 0, so every client looks like the proxy's IP. Set it to the number of proxies (usually 1)                                                               |
| `429` on scans                                         | Per-IP scan limit (`SCAN_CREATE_RATE_LIMIT_PER_MINUTE`), or the plan quota (`quota_exceeded`, with a reset time in the message)                                               |

## Scans

| Symptom                                                   | Cause / fix                                                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every scan fails with `dns_failure` / `connection_failed` | The worker has no **direct** internet access. It ignores HTTP proxies on purpose (SSRF pinning)                                                                              |
| A legitimate site fails with `blocked_destination`        | It resolves to a private or reserved address, or is listed in `SCAN_BLOCKED_HOSTS` or is one of our own hosts. Working as intended                                           |
| Scans stay `queued`                                       | The worker isn't running: check `WORKER_ENABLED`, the logs for `Scan worker started`, and that the DB connection allows session features (use the session pooler, port 5432) |
| Scans stuck `running`                                     | The process restarted mid-scan. The sweeper marks them failed (free retry) every 5 minutes                                                                                   |
| Reports say Lighthouse data is unavailable                | The reason is shown under _Audit coverage_: `PSI_API_KEY` not set, the `psi` flag off, quota reached, or PSI timed out (60 s)                                                |
| Lighthouse scores differ from pagespeed.web.dev           | Lab results vary between runs. Results are cached for `PSI_CACHE_TTL_HOURS` (6 h)                                                                                            |
| Guest scans return `guest_scans_disabled`                 | In production `TURNSTILE_SECRET_KEY` is required; also set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the web. Or the `guest_scans` flag is off                                     |

## Reports, sharing, PDF

| Symptom                                     | Cause / fix                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `403 upgrade_required`                      | The plan doesn't include comparison / PDF / share links (Starter does). With billing off, everyone is on Free                             |
| `409 report_not_ready`                      | The scan hasn't finished, or failed (failed scans have no report)                                                                         |
| A share link shows "This link doesn't work" | Revoked, expired, or the report reached its retention date. The owner can create a new one                                                |
| Compare refuses with `different_urls`       | Only scans of the same normalised address can be compared                                                                                 |
| PDF characters show as boxes                | The embedded Inter font covers Latin, Greek and Cyrillic; other scripts (e.g. CJK, Devanagari) aren't included yet                        |
| PDF download fails in the browser           | The request needs the signed-in token, so it's fetched by the page, not a plain link. Check the console for a CORS error (`CORS_ORIGINS`) |

## Payments

See also [`payments-setup.md`](payments-setup.md).

| Symptom                                                | Cause / fix                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout button missing / "coming soon"                | `billing` flag off, or `WEB_PAYMENT_PROVIDER=none`, or price IDs missing. Check `GET /v1/billing/config`                                       |
| Webhooks return 401                                    | Wrong `PADDLE_WEBHOOK_SECRET` / `DODO_WEBHOOK_SECRET`, or a proxy modified the body (signatures cover the exact bytes)                         |
| Paid, but still on Free                                | Look in `webhook_events` for the event. `failed` shows the error; the provider retries on 5xx. Check the user id in the provider's custom data |
| Play purchase "belongs to a different Weblume account" | The purchase was made while signed in to another Weblume account. Working as intended                                                          |
| Play purchases refunded after 3 days                   | They weren't acknowledged. Check the service account permissions and the `/verify` / RTDN logs                                                 |
| RTDN pushes rejected                                   | `GOOGLE_PLAY_RTDN_AUDIENCE` / `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT` must match the push subscription's authentication settings exactly            |

## Web

| Symptom                                                   | Cause / fix                                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Accounts aren't configured"                              | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were empty **at build time**. Rebuild |
| Console shows "Refused to load … Content Security Policy" | A new third-party origin. Add it in `apps/web/csp.ts` (only if it's really needed), rebuild               |
| Email links open the wrong site                           | Supabase → Auth → URL configuration: Site URL and redirect URLs                                           |
