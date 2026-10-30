# Quality review: accessibility and Lighthouse

Done on 2026-10-30 in the build environment, against local production builds. Automated tools catch only some problems. The manual checks below still need a person with real devices and assistive technology.

## Lighthouse on our own pages

Lighthouse 13.4 ran in headless Chromium against `next start` on the local machine, with the default mobile (throttled) and desktop presets. Performance numbers depend on the machine and network; rerun them against the deployed site.

| Page             | Mobile perf | Desktop perf | Accessibility | Best practices | SEO |
| ---------------- | ----------- | ------------ | ------------- | -------------- | --- |
| `/`              | 96          | 100          | 100           | 100            | 100 |
| `/pricing`       | 95          | 100          | 100           | 96*            | 100 |
| `/features`      | 94          | 100          | 100           | 100            | 100 |
| `/how-it-works`  | 98          | 100          | 100           | 100            | 100 |
| `/sample-report` | 93          | 100          | 100           | 100            | 100 |
| `/blog`          | 99          | 100          | 100           | 100            | 100 |
| `/scan`          | 96          | 100          | 100           | 100            | 100 |

\* The only failing audit was "errors in console": the pricing page fetches `/v1/billing/config`, and no API was running during the measurement. It's not a page defect, but the request does fail quietly when the API is down.

To rerun against the deployed site:

```bash
npx lighthouse@13.4.0 https://<domain>/ --view                 # mobile
npx lighthouse@13.4.0 https://<domain>/ --preset=desktop --view
```

## Automated accessibility tests (run in CI)

**Web:** Playwright plus axe-core with the WCAG 2.0/2.1/2.2 A and AA rule sets. Runs on desktop and mobile viewports, light and dark, and covers:

- Every marketing and legal page.
- Login and signup.
- Scan progress and report.
- Account and pricing.
- Compare page and shared report page (new in Phase 6).

Result: no violations.

**Mobile:** Flutter `meetsGuideline` checks (Android tap-target size, labelled tap targets, text contrast), in light and dark. They cover the dashboard, report and comparison screens. All pass.

**Design tokens:** every text/background pair and severity badge meets WCAG AA contrast (unit tests in `packages/design-tokens`).

## Measures built in

- **Severity:** colour plus icon plus text label, never colour alone (web and mobile).
- **Expandable findings:** native `<details>`/`<summary>` on the web, so they work with keyboard and screen readers without JavaScript.
- **Live regions:** scan progress and status messages use `role="status"`/`aria-live`; errors use `role="alert"`. Flutter uses `liveRegion`.
- **Keyboard navigation:** a skip link, a visible focus ring from design tokens, and touch/click targets of at least 44 px on the web and 48 dp on Android.
- **Comparison score table:** a real `<table>` with caption and row/column headers. On Android, rows read as "Performance: 40 → 61 (+21)".
- **Share links:** the "Turn off" button names which link it turns off for screen readers.
- **Motion:** reduced motion is respected: no essential animation, and only a single pulse dot.

## Manual checklist (not yet done; needs a person)

### Web

- [ ] Keyboard only: complete sign-up → scan → report → expand findings → share → compare → log out, with focus always visible and in a logical order.
- [ ] Screen reader (NVDA + Firefox, or VoiceOver + Safari): headings outline makes sense; scores are announced with their band; progress updates are announced once, not repeatedly.
- [ ] 200% and 400% zoom (reflow at 320 CSS px): no lost content or horizontal scrolling on the report and compare pages.
- [ ] Windows High Contrast / forced colours: severity badges and focus rings are still visible.
- [ ] Error messages are announced and associated with their fields (signup, scan URL).

### Android

- [ ] TalkBack: the report, finding detail, compare screen and share sheet are all reachable, labelled and in order.
- [ ] Font size at maximum (Settings → Display size and text): no clipped text on the report, compare or subscription screens.
- [ ] Switch Access or keyboard: the share sheet can be opened and closed.
- [ ] Dark theme and high-contrast text.

### Content

- [ ] A non-technical reader understands the report summary in under 10 seconds. Test with 3 to 5 people, which is a product goal of the brief.
- [ ] Link text makes sense out of context ("Learn more" links include the finding name for screen readers).
