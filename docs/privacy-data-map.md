# Privacy data map

What Weblume stores, why, where, for how long, and how it's deleted. Keep this in sync with the code and the privacy policy (`apps/web/src/app/legal/privacy`). **Not legal advice** — have it reviewed together with the policy.

## Data we store

| Data                                                                                              | Where                                       | Purpose                                                  | Retention                                                                                  | Deleted by                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Email, password hash, sign-in identities                                                          | Supabase Auth (`auth.users`)                | Accounts and sign-in                                     | Until account deletion                                                                     | Account deletion → Supabase admin API                           |
| Display name                                                                                      | `profiles`                                  | Personalisation                                          | Until account deletion                                                                     | Cleared immediately on deletion; row removed with the auth user |
| Submitted URL, final URL, scan status                                                             | `scans`                                     | Running and showing reports                              | Plan retention: guest 24 h, free 30 days, starter 12 months (set when the scan is created) | Hourly retention job; account deletion                          |
| Findings (check results and evidence such as offending URLs/attributes; **never full page HTML**) | `findings`                                  | The report                                               | Same as the scan (cascade)                                                                 | With the scan                                                   |
| Lighthouse scores and failing-audit summaries                                                     | `scans.lighthouse`, `findings`, `psi_cache` | Reports; avoiding repeat PSI calls                       | Cache: TTL (6 h) plus 24 h, then purged                                                    | Hourly retention job                                            |
| Monitored sites: address, frequency, what to email, last run and digest times                     | `scheduled_scans`                           | Scheduled re-scans and change digests                    | Until the user removes the site or deletes the account                                     | Dashboard (stop monitoring); account deletion                   |
| Guest identifier: HMAC-SHA256 of the IP with a server secret                                      | `scans.guest_key_hash`                      | Guest quota (1 scan/day), abuse prevention               | With the scan                                                                              | With the scan                                                   |
| Guest scan token (SHA-256 hash only)                                                              | `scans.claim_token_hash`                    | Lets a guest view their report; claiming into an account | With the scan; cleared when claimed                                                        | With the scan / on claim                                        |
| Subscription state (provider IDs, plan, status, period dates)                                     | `subscriptions`                             | Entitlements                                             | Until account deletion                                                                     | Cascade with the auth user                                      |
| Payment webhook payloads                                                                          | `webhook_events.payload`                    | Auditing and replaying provider events                   | Payload removed after 30 days; event ID/type kept for idempotency                          | Hourly retention job                                            |
| Share links: SHA-256 hash of the token, scan, creator, expiry, revocation time                    | `share_links`                               | Read-only sharing of a report (Starter)                  | Same as the scan (kept after expiry/revocation so the owner sees the history)              | With the scan (cascade); account deletion                       |
| PDF reports                                                                                       | Not stored: generated on request            | Download                                                 | —                                                                                          | —                                                               |
| Request logs (method, path with share tokens masked, status, timing, request id)                  | Hosting provider logs                       | Operations                                               | Per hosting provider settings                                                              | —                                                               |
| Metrics (counts only: scans by status/reason, PSI calls, queue depth)                             | API memory + aggregate queries              | Operations                                               | Not stored by us (scraper's own retention)                                                 | —                                                               |

**Not stored:** raw IP addresses, full page HTML, passwords (Supabase stores only hashes), card details (handled by payment providers), auth headers or query strings in logs.

Browser storage (per device): a list of recent scan IDs and guest scan tokens (`localStorage`, key `weblume.scans.v1`), and the Supabase session.

Android app storage (per device): the Supabase session and a read-only cache of the account, first history page and up to 20 reports (`SharedPreferences`). Cleared on log-out and account deletion, and **excluded from Android cloud backups and device-to-device transfer**.

**Shared reports:** anyone holding a share link can see that report (URL, findings, scores, scan date). No account data (email, name, other reports) is included. Links expire (default 30 days), can be turned off at any time, and stop working when the report is deleted.

## External services that receive data

| Service                             | Receives                                                                                                                                         | When                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Supabase                            | Account data, all database contents                                                                                                              | Always (database + auth host)                                                 |
| Google PageSpeed Insights           | The submitted URL                                                                                                                                | Each scan not served from cache, if `PSI_API_KEY` is set                      |
| Scanned website                     | Requests from WeblumeBot (no user data)                                                                                                          | Each scan                                                                     |
| Cloudflare Turnstile                | Bot-check token + visitor IP                                                                                                                     | Guest scans, if configured                                                    |
| Resend (if configured)              | Account email address, the monitored site's address and the change digest                                                                        | Emailing monitoring digests                                                   |
| Email provider (via Supabase SMTP)  | Email address                                                                                                                                    | Sign-up confirmation, password reset                                          |
| Sentry (optional error tracking)    | Error type, stack trace, route pattern, browser/OS. **Scrubbed** of user identity, IPs, cookies, headers, bodies, query strings and share tokens | Only for unexpected errors, if `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` is set |
| Merchant of Record (Paddle or Dodo) | Email, billing country/address, payment details (entered on their checkout, never seen by us), our user id as custom data                        | Web purchases; they keep records as legally required                          |
| Google Play                         | Purchase made by the Google account; an opaque HMAC account reference (not the user id or email)                                                 | Android purchases                                                             |
| Recipients of share links           | The shared report only                                                                                                                           | When the owner shares the link                                                |

## Account deletion

`DELETE /v1/me` with `{"confirm":"DELETE"}` (web: Account settings → Delete account):

1. In one transaction: deletes the user's scans (with findings), share links and monitored sites, clears the display name, and sets `deletion_requested_at`. From this moment the API refuses the account (`403 account_deleted`), even with a still-valid session token.
2. Deletes the Supabase Auth user via the admin API (`SUPABASE_SECRET_KEY`), which cascades to `profiles` and `subscriptions`.
3. If step 2 can't run (no key configured, or an error), the hourly retention job retries until it succeeds. Without a key, remove the user in the Supabase dashboard (Authentication → Users).

Payment providers keep the transaction records they're legally required to keep. Google Play subscriptions must be cancelled in Google Play.

## Data export

`GET /v1/me/export` (web: Account settings → Download my data) returns a JSON file with the account, plan, usage, subscriptions and every saved report with its findings.
