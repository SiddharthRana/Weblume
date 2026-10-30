# Monitoring

Everything here is optional, and the app runs without it. Start with the free options.

## Health endpoints

| Endpoint      | Meaning                                       | Use for                                    |
| ------------- | --------------------------------------------- | ------------------------------------------ |
| `GET /health` | The process is up; doesn't touch dependencies | Container liveness / platform health check |
| `GET /ready`  | The database is reachable (503 if not)        | Readiness, uptime monitor                  |

**Uptime:** point a free uptime monitor at `https://api.<domain>/ready` and `https://<domain>/`. Examples are UptimeRobot, Better Stack and Cronitor; all have free tiers. Alert by email or push.

## Logs

The API writes one JSON line per request with these fields:

- `req.id`: echoes a valid `X-Request-Id`, otherwise generates a UUID.
- `req.method`
- `req.path`: query strings are dropped and share tokens masked as `/v1/shared/[token]`.
- `res.statusCode`
- `responseTime`

Headers, bodies, emails, scanned URLs' query strings and report contents are never logged. Scan crashes log only the error type.

Useful searches in your host's log viewer:

- `"statusCode":5`: server errors.
- `crashed`: scan worker crashes (`Scan <id> crashed: <ErrorType>`).
- `Marked * stuck scan(s) as failed`: the sweeper found scans stuck as `running`, usually after a restart.
- `webhook`: payment webhook problems.

## Error reporting (Sentry)

- **API:** set `SENTRY_DSN`. Only unexpected errors (5xx and scan-worker crashes) are sent.
  - Each event is tagged with the route **pattern** (e.g. `/v1/scans/:id`) and method.
  - Before sending, events are stripped of: user identity, IPs, cookies, auth and forwarding headers, request bodies, query strings and share tokens (`apps/api/src/observability/error-reporter.ts`).
  - Worker crashes are sent without the error message, because it can contain the scanned URL.
- **Web:** set `NEXT_PUBLIC_SENTRY_DSN`. The SDK is loaded only when the variable is set.
  - Sends no user identity, cookies, headers or query strings.
  - Masks `/r/<token>`.
  - Drops console and UI-click breadcrumbs.
- **Mobile:** not integrated yet (see the unfinished items in `PROGRESS.md`).

Suggested Sentry alerts: a new issue, and more than 10 events in 5 minutes.

## Metrics

Set `METRICS_TOKEN` (24+ characters) to enable `GET /metrics`, in Prometheus text format, with header `Authorization: Bearer <token>`. Scrape it with Grafana Cloud's free tier, a Prometheus agent, or just `curl` it.

**Database-wide (all instances):**

| Metric                                   | Meaning                                       |
| ---------------------------------------- | --------------------------------------------- |
| `weblume_scan_queue_depth`               | Scans waiting to start                        |
| `weblume_scans_running`                  | Scans in progress                             |
| `weblume_scans_last_24h{status}`         | Scans created in the last 24 h by status      |
| `weblume_scan_failures_last_24h{reason}` | Failed scans in the last 24 h by failure code |
| `weblume_webhook_failures_last_24h`      | Payment webhooks that failed processing       |

**Per instance (reset on restart):**

| Metric                                            | Meaning                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `weblume_scans_started_total{requester}`          | Scans queued (user / guest)                                                                  |
| `weblume_scans_finished_total{status,reason}`     | Scans finished, by status and failure reason                                                 |
| `weblume_scan_duration_ms_sum` / `_count`         | Scan run time (average = sum ÷ count)                                                        |
| `weblume_psi_requests_total{strategy,result}`     | PageSpeed Insights calls by outcome (`ok`, `timeout`, `quota_exceeded`, `upstream_error`, …) |
| `weblume_psi_latency_ms_sum` / `_count{strategy}` | PSI call duration                                                                            |
| `weblume_psi_cache_hits_total{strategy}`          | PSI results served from the 6-hour cache                                                     |

## What to alert on

| Signal                                                       | Threshold (starting point) | Likely cause / action                                                                                                 |
| ------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/ready` failing                                             | 2 checks in a row          | Database down or credentials changed. See [`troubleshooting.md`](troubleshooting.md)                                  |
| `weblume_scan_queue_depth`                                   | > 20 for 10 min            | Worker stopped or overloaded. Check logs; raise `SCAN_GLOBAL_CONCURRENCY` or add an instance                          |
| `weblume_scan_failures_last_24h{reason="internal_error"}`    | > 5                        | A bug; check Sentry and logs                                                                                          |
| `weblume_psi_requests_total{result="quota_exceeded"}` rising | Any                        | PSI daily quota reached. Reports still work without Lighthouse; ask Google for more quota, or turn off the `psi` flag |
| `weblume_webhook_failures_last_24h`                          | > 0                        | Payment events not applied. See [`troubleshooting.md`](troubleshooting.md#payments)                                   |
| Sentry new issue                                             | Any                        | Triage                                                                                                                |

## SQL checks (Supabase SQL editor)

```sql
-- Scans by status today
select status, count(*) from public.scans where created_at > now() - interval '1 day' group by 1;
-- Most common failure reasons this week
select failure_code, count(*) from public.scans where status = 'failed'
  and created_at > now() - interval '7 days' group by 1 order by 2 desc;
-- Failed payment webhooks (payload is purged after 30 days)
select provider, event_type, error, received_at from public.webhook_events
  where status = 'failed' order by received_at desc limit 20;
-- Active paid subscriptions by channel
select provider, status, count(*) from public.subscriptions group by 1, 2;
```
