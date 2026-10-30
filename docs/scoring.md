# Scoring and severity rules

Weblume shows numbers only when they come from a defined source. This page is the reference for what every score, severity and status in a report means.

## Scores

- **Category scores are Lighthouse scores from Google PageSpeed Insights (PSI)**, shown separately for mobile and desktop: Performance, Accessibility, SEO and Best practices, each 0–100 (Lighthouse's 0–1 score × 100, rounded).
- Score bands follow Lighthouse: 90–100 good, 50–89 needs work, 0–49 poor.
- **If PSI doesn't return a result** (not configured, quota exceeded, timeout, error), **no score is shown**. The report says why under _Audit coverage_. We never estimate or substitute a score.
- **There is no overall "Weblume score" in v1.**
- Weblume's own checks produce findings and pass/fail counts, not numeric scores.

## Kinds of finding

| Kind               | Meaning                                          | Examples                               |
| ------------------ | ------------------------------------------------ | -------------------------------------- |
| **Measured**       | A lab measurement from Lighthouse                | Largest Contentful Paint: 4.8 s        |
| **Detected**       | An automated check found a specific problem      | Missing meta description; broken links |
| **Recommendation** | General advice (reserved; not used by v1 checks) | —                                      |

## Severity — Weblume's own checks

Each check has a fixed severity in the check catalogue (`packages/shared/src/checks/catalog.ts`). Every check ID, its severity and its copy are listed there. As a rule of thumb:

- **Critical:** reserved for issues that make the site unusable or unsafe for most visitors (no v1 check uses it yet).
- **High:** likely to cause real harm to visitors or search visibility, e.g. no page title, `noindex`, robots.txt blocking the page, no HTTPS, broken links.
- **Medium:** a clear problem worth fixing soon, e.g. missing meta description, no H1, missing alt text, no `lang`, mixed content, no viewport.
- **Low:** a best-practice gap, e.g. title/description length, multiple H1s, skipped heading levels, missing HSTS, long redirect chains.
- **Info:** worth knowing; often no action needed, e.g. no favicon, canonical pointing elsewhere, links not checked.

## Severity — Lighthouse findings

A Lighthouse audit becomes a finding when it is scored (`binary`, `numeric` or `metricSavings` display modes) and its score is **below 0.9**. Informative, manual and not-applicable audits are ignored.

| Lighthouse category                                   | Rule                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Performance metrics (FCP, LCP, TBT, CLS, Speed Index) | score < 0.5 → **high**, otherwise **medium** (kind: measured)          |
| Other performance audits / insights                   | score < 0.5 → **medium**, otherwise **low**                            |
| Accessibility                                         | by Lighthouse weight: 10 → **high**, 7 → **medium**, otherwise **low** |
| SEO                                                   | **medium**                                                             |
| Best practices                                        | **low**                                                                |

- Findings come from the **mobile** run (Google indexes mobile-first). Desktop is used only if the mobile run failed. Scores are shown for both.
- Audits that duplicate one of our own checks (title, meta description, `lang`, image alt, viewport, crawlability, canonical, robots.txt, HTTPS, HTTP status) are skipped, so each issue appears once, with Weblume's curated explanation.
- An audit that appears in more than one Lighthouse category is reported once.

## Scan status

| Status      | Meaning                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `completed` | Every enabled source ran. Sources that are _not configured_ or _turned off_ are listed as such and don't make a scan partial.  |
| `partial`   | The page was audited, but at least one source failed (e.g. PSI timed out). Everything shown is real; missing parts are listed. |
| `failed`    | No report: the page couldn't be audited (e.g. DNS failure, blocked destination, HTTP error, not HTML).                         |

## Quota and failures

- Failures caused by **the scanned site or address** (DNS, connection, TLS, HTTP error, not HTML, too large, too many redirects, blocked destination) count toward quota.
- Failures caused by **Weblume or an integration** (`internal_error`, `scan_timeout`) don't, and retrying them is free.

## Limits per scan (defaults; configurable)

| Limit                     | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| Total scan time           | 90 s                                                             |
| Page fetch timeout        | 10 s                                                             |
| Page size                 | 5 MB                                                             |
| Redirects                 | 5, each hop re-validated                                         |
| Links checked             | first 50 unique http(s) links, ≤ 5 concurrent per host, 5 s each |
| robots.txt / sitemap size | 512 KB / 1 MB                                                    |
| PSI timeout               | 60 s per strategy; results cached 6 h per URL + strategy         |
