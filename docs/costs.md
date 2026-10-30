# Costs

Running costs, free-tier limits, and how to cut each one. Prices are approximate, from public pricing pages as remembered on 2026-10-30, and **couldn't be checked live from the build environment**. Confirm each before you rely on it.

## Fixed monthly costs (production, small scale)

| Item            | Option                                                    | Approx. cost                                   | Notes                                                                                                                                                           |
| --------------- | --------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database + auth | Supabase Pro                                              | $25 / month                                    | Free tier: 500 MB database and generous MAU, but it **pauses after ~1 week of inactivity** and has no downloadable backups, so it's not suitable for production |
| API + worker    | Fly.io shared-cpu 512 MB / Render Starter / Railway Hobby | ~$4–7 / month                                  | One container runs the API and worker                                                                                                                           |
| Web             | Vercel Pro                                                | $20 / member / month                           | Vercel Hobby forbids commercial use. Cloudflare (with the OpenNext adapter) can be cheaper but needs setup                                                      |
| Email           | Resend / Postmark free tiers                              | $0 at low volume                               | Resend free: ~3,000 emails/month, 100/day                                                                                                                       |
| Errors          | Sentry Developer                                          | $0                                             | ~5,000 errors/month                                                                                                                                             |
| Uptime          | UptimeRobot / Better Stack free                           | $0                                             |                                                                                                                                                                 |
| Domain          | —                                                         | ~$1 / month                                    |                                                                                                                                                                 |
| Google Play     | Developer account                                         | $25 once                                       |                                                                                                                                                                 |
| **Total**       |                                                           | **≈ $50–55 / month** (≈ ₹4,300–4,700 at ₹85/$) |                                                                                                                                                                 |

## Usage-based drivers

| Driver                     | Per scan                                                                              | Free limit                                                                                                                             | How to cut it                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **PageSpeed Insights API** | 2 calls (mobile + desktop), each up to 60 s                                           | Free, quota-limited: by default about **25,000 queries/day** per Google Cloud project (check the console) ⇒ ~12,500 uncached scans/day | 6-hour cache per URL + strategy (`PSI_CACHE_TTL_HOURS`); `psi` kill switch; ask Google for more quota |
| Outbound bandwidth         | Page ≤ 5 MB + ≤ 50 link checks (HEAD/small GET) + robots/sitemap. Typically < 3 MB    | Hosts include some egress                                                                                                              | `SCAN_PAGE_MAX_BYTES`, `link_check` flag                                                              |
| Worker CPU / RAM           | HTML parsing and checks take milliseconds; most of a scan's 20–60 s is waiting on PSI | 3 concurrent scans per worker (`SCAN_GLOBAL_CONCURRENCY`)                                                                              | Raise concurrency before adding instances                                                             |
| Database storage           | ~5–30 KB per scan (findings + Lighthouse summary; **no page HTML**)                   | Supabase Pro: 8 GB included                                                                                                            | Retention job: guest 24 h, Free 30 days, Starter 12 months                                            |
| PDF generation             | Well under a second per report in tests, in memory                                    | —                                                                                                                                      | Rate-limited (10/min per IP)                                                                          |
| Email                      | Sign-up and password reset only                                                       | Provider free tier                                                                                                                     | —                                                                                                     |
| Payment fees               | % per transaction; see [`unit-economics.md`](unit-economics.md)                       | —                                                                                                                                      | Prefer annual plans (one fixed fee per year)                                                          |

## Capacity of one small worker

With 3 concurrent scans at ~40 s each, one worker finishes ~270 scans/hour (~6,500/day). The default PSI quota allows ~12,500 uncached scans/day, so one worker hits its own limit first. Raise `SCAN_GLOBAL_CONCURRENCY` (most of a scan is waiting on PSI) or add a second instance before the PSI quota becomes the limit. Long before either, a growing `weblume_scan_queue_depth` shows when you need to.

## Kill switches (no deploy needed)

```sql
update public.feature_flags set enabled = false where key = 'guest_scans'; -- stop anonymous scans
update public.feature_flags set enabled = false where key = 'psi';         -- stop PSI calls (reports say so)
update public.feature_flags set enabled = false where key = 'link_check';  -- stop link checking
```

## Cost alarms to set up

- Google Cloud: a budget alert on the project (PSI itself is free, but other APIs in the project might not be).
- Supabase: usage email alerts (database size, egress).
- Hosting: a spend limit or alert where supported (Fly.io and Vercel both have them).
