# Manual smoke test

Run this before each release, against staging first and then production. It takes about 30 minutes. Use a test account, not a real customer. Tick each box, and write down anything odd with the time, so you can find it in the logs and Sentry.

**You need:**

- Two browsers (or one normal window and one private window).
- An Android phone with the release build from the internal track.
- A site you own to scan, plus one that's known to be slow or broken.
- Sandbox payment credentials (see `payments-setup.md`).

## 1. Health and basics

- [ ] `https://api.<domain>/health` and `/ready` both return `{"status":"ok"}`.
- [ ] `https://<domain>/` loads over HTTPS with no console errors, including no "Refused to … Content Security Policy" messages.
- [ ] Response headers come from `_headers`: `curl -sI https://<domain>/` shows `content-security-policy` and `strict-transport-security`, and `curl -sI https://<domain>/r/x` shows `x-robots-tag: noindex` and `referrer-policy: no-referrer`.
- [ ] Deep links survive a reload: open `https://<domain>/scan/<a real scan id>` and `https://<domain>/r/<a real share token>` directly in a new tab. Each shows that report (served by the `_redirects` rewrite), not a 404 or the placeholder page.
- [ ] An unknown path (`/no-such-page`) shows the site's 404 page with a 404 status.
- [ ] Theme switch in the header: it toggles light and dark, the choice survives a reload with no flash of the other theme, and with no choice made the site follows the system setting.
- [ ] `robots.txt` disallows `/r/`, `/scan/`, `/compare`, `/history`, `/dashboard`, `/account`.
- [ ] `sitemap.xml` lists only public pages.
- [ ] Pricing shows the correct prices, and "coming soon" if billing is off.
- [ ] Legal pages load and show the right owner, support email and payment provider.

## 2. Guest scan (signed out)

- [ ] `/scan`: the Turnstile check appears and completes.
- [ ] Scan your site. The waiting screen shows activity (scan beam, elapsed time), and the report appears within about a minute.
- [ ] The report shows Lighthouse scores, or an honest "not available" with the reason under _Audit coverage_.
- [ ] A second guest scan the same day is refused with a clear message.
- [ ] Scanning `http://localhost`, `http://169.254.169.254` or `http://10.0.0.1` is refused (`blocked_destination`).

## 3. Account (web)

- [ ] Sign up with a new email. The confirmation email arrives (check spam) and its link signs you in.
- [ ] The guest scan from step 2 now appears in **History** (claimed).
- [ ] Log out, then log back in. Wrong password shows an error.
- [ ] Forgot password: the email arrives, and the link lets you set a new password.
- [ ] Password rules are enforced by Supabase too: a 9-character password, or one without an uppercase letter or digit, is refused. If leaked-password protection is on, `Password123` is refused as a known leaked password.
- [ ] Repeated wrong passwords from one IP are eventually refused with a "too many requests" error (Supabase rate limits), and a second reset email to the same address within a minute is refused.
- [ ] Optional: Google sign-in works.
- [ ] The dashboard shows Free plan usage, and it goes up after a scan.
- [ ] A failed scan (try a non-existent domain) explains why and offers a retry.

## 4. Starter features

Do this after a sandbox purchase in step 6, or with the `billing` flag on and a sandbox subscription.

- [ ] Report → **Download PDF**. The file opens and is branded, with scores, findings, coverage and the limitations notice. Multi-page reports have page numbers.
- [ ] Report → open a finding from Weblume's own checks (e.g. missing meta description or image alt text). **Code fix** shows code written for this page (its real address, the actual images), and **Copy** puts it on the clipboard.
- [ ] Report → **Share** → Create link (30 days). The link is shown once.
  - [ ] Open it in a private window. The report shows read-only with a "Shared report" banner, and no email or other account data.
  - [ ] View the page source: `<meta name="robots" content="noindex…">` is present.
- [ ] Turn the link off. Reloading the private window shows "This link doesn't work".
- [ ] Scan the same site again, then **Compare with another scan**. New, resolved and still-open findings and score changes make sense.
- [ ] On a Free account, the same report shows the Starter upsell instead of these actions, each finding's **Code fix** shows the Starter pointer instead of code, and `/compare?...` explains the upgrade.

## 5. Android app

- [ ] Upgrading from the previous internal-track build keeps you signed in (the session moves into secure storage on first start).
- [ ] Install from the internal track. Log in with the account from step 3.
- [ ] Force-stop the app and reopen it: you're still signed in.
- [ ] The dashboard shows the same plan, usage and scans as the web.
- [ ] Start a scan. The animated progress screen shows, then the report. Tapping a finding shows its detail.
- [ ] Airplane mode: the cached report opens with an offline banner, and new scans are disabled.
- [ ] Starter account: **Share link** creates a link and copies it to the clipboard. **Compare** works.
- [ ] Starter account: **Download PDF** opens the system "Save to" screen and the saved file opens. **Share PDF** opens the share sheet with the PDF attached.
- [ ] Free account: the report shows the Starter upsell instead of share, compare and PDF.
- [ ] TalkBack: the report's scores and findings are read out meaningfully.
- [ ] Log out clears the data, and you're back at the login screen. Reopening the app stays logged out.
- [ ] If the build has a `SENTRY_DSN`: Sentry shows the release `weblume-android@<version>`, and any event has no user, email or query strings.

## 6. Payments (sandbox)

- [ ] Web: pricing → subscribe monthly. Sandbox checkout completes, and the account shows Starter within about 30 s.
- [ ] Web: Manage subscription opens the provider portal. Cancel there. The account shows "Cancelled — active until …".
- [ ] Android: Upgrade → subscribe with a license-tester account. The purchase completes, and the account shows Starter (Google Play).
- [ ] Android: the web account page shows the Play subscription with "Manage in Google Play".
- [ ] `webhook_events` has no `failed` rows for these purchases.

## 7. Account deletion

- [ ] Web: Account → export data. The JSON file downloads.
- [ ] Delete the account (type DELETE). You're signed out, and logging in again fails.
- [ ] The public deletion page `/legal/account-deletion` loads (Play requires it).

## 8. After the release

- [ ] Sentry (API, web and Android projects, if configured) shows no new issues.
- [ ] `/metrics`: queue depth is near 0, and there's no growth in `internal_error`.
- [ ] Remove or keep the test accounts on purpose.
