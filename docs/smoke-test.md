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
- [ ] `robots.txt` disallows `/r/`, `/scan/`, `/compare`, `/history`, `/dashboard`, `/account`.
- [ ] `sitemap.xml` lists only public pages.
- [ ] Pricing shows the correct prices, and "coming soon" if billing is off.
- [ ] Legal pages load; check whether the DRAFT banner is still intended.

## 2. Guest scan (signed out)

- [ ] `/scan`: the Turnstile check appears and completes.
- [ ] Scan your site. Progress updates, and the report appears within about a minute.
- [ ] The report shows Lighthouse scores, or an honest "not available" with the reason under _Audit coverage_.
- [ ] A second guest scan the same day is refused with a clear message.
- [ ] Scanning `http://localhost`, `http://169.254.169.254` or `http://10.0.0.1` is refused (`blocked_destination`).

## 3. Account (web)

- [ ] Sign up with a new email. The confirmation email arrives (check spam) and its link signs you in.
- [ ] The guest scan from step 2 now appears in **History** (claimed).
- [ ] Log out, then log back in. Wrong password shows an error.
- [ ] Forgot password: the email arrives, and the link lets you set a new password.
- [ ] Optional: Google sign-in works.
- [ ] The dashboard shows Free plan usage, and it goes up after a scan.
- [ ] A failed scan (try a non-existent domain) explains why and offers a retry.

## 4. Starter features

Do this after a sandbox purchase in step 6, or with the `billing` flag on and a sandbox subscription.

- [ ] Report → **Download PDF**. The file opens and is branded, with scores, findings, coverage and the limitations notice. Multi-page reports have page numbers.
- [ ] Report → **Share** → Create link (30 days). The link is shown once.
  - [ ] Open it in a private window. The report shows read-only with a "Shared report" banner, and no email or other account data.
  - [ ] View the page source: `<meta name="robots" content="noindex…">` is present.
- [ ] Turn the link off. Reloading the private window shows "This link doesn't work".
- [ ] Scan the same site again, then **Compare with another scan**. New, resolved and still-open findings and score changes make sense.
- [ ] On a Free account, the same report shows the Starter upsell instead of these actions, and `/compare?...` explains the upgrade.

## 5. Android app

- [ ] Install from the internal track. Log in with the account from step 3.
- [ ] The dashboard shows the same plan, usage and scans as the web.
- [ ] Start a scan. Progress shows, then the report. Tapping a finding shows its detail.
- [ ] Airplane mode: the cached report opens with an offline banner, and new scans are disabled.
- [ ] Starter account: **Share link** creates a link and copies it to the clipboard. **Compare** works.
- [ ] TalkBack: the report's scores and findings are read out meaningfully.
- [ ] Log out clears the data, and you're back at the login screen.

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

- [ ] Sentry shows no new issues (if configured).
- [ ] `/metrics`: queue depth is near 0, and there's no growth in `internal_error`.
- [ ] Remove or keep the test accounts on purpose.
