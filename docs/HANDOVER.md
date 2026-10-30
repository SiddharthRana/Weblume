# Handover: real-device testing

Paste this file, or point the new chat at it, to continue in a fresh conversation. It's self-contained. Last updated 2026-10-30.

## 1. Where things stand

- **Repo:** `siddharthrana/weblume`. **Default branch: `main`** (all work is merged; CI green on commit `9e3dc12`, including the Android release APK).
- **Working branch** used so far: `claude/practical-gates-8p8fxp` (same commit as `main`). Start new work from `main` on a new branch.
- **Status:** all 6 build phases are complete, and the Linear-style redesign is done on web and Android.
  - **Nothing is deployed.** No real Supabase cloud project, payment provider, Google Play listing or PSI key has been used yet.
  - Every external service has only been tested against fakes.
- **Read first:**
  - `docs/BUILD_PROMPT.md`: the product spec and the working rules.
  - `docs/PROGRESS.md`: what's verified, and the prioritised remaining work.
  - `docs/DECISIONS.md`: why things are built this way.
  - `README.md`: setup and every environment variable.

### Working rules (from the build prompt; keep following them)

- Never claim something works unless it was verified in that session; say what wasn't tested.
- Never commit or print secrets. Use sandbox/test credentials only.
- Don't spend money, create paid resources or deploy publicly without the owner's go-ahead.
- Keep `docs/PROGRESS.md` and `docs/DECISIONS.md` current. Commit with clear messages.
- Don't open pull requests unless asked.

## 2. The system in one minute

| Part              | Path                                                                  | Stack                                                                                            |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| API + scan worker | `apps/api`                                                            | NestJS 12 (SWC), Drizzle over Postgres, pg-boss queue, Supabase JWT auth                         |
| Web               | `apps/web`                                                            | Next.js 16, React 19, Tailwind 4                                                                 |
| Android app       | `apps/mobile`                                                         | Flutter 3.47 / Dart 3.13, Riverpod 3, go_router, dio, supabase_flutter (PKCE), in_app_purchase   |
| Shared            | `packages/shared`, `packages/design-tokens`, `packages/api-client-ts` | Plans, URL rules, check copy, comparison logic; design tokens → CSS/TS/Dart; generated TS client |
| Database          | `supabase/migrations`                                                 | Postgres + RLS (schema source of truth)                                                          |

The app's Dart API client (`apps/mobile/lib/api/generated/`) and `lib/theme/tokens.g.dart` are **generated**. Regenerate with `pnpm openapi && pnpm tokens` and never hand-edit them. Don't run `dart format` over the whole `lib/` folder (it reformats generated files); format only non-generated files, as in `apps/mobile/README.md`.

## 3. Run everything locally for a physical Android phone

The phone and computer must be on the same Wi-Fi. Find the computer's LAN IP (e.g. `192.168.1.20`; called `LAN_IP` below). The emulator alias `10.0.2.2` doesn't work on a real phone.

1. **Install and build the shared packages:**
   ```bash
   corepack enable
   pnpm install
   pnpm --filter "./packages/*" run build
   ```
2. **Local Supabase:**
   - Start it, then reset the database (applies migrations and seed):
     ```bash
     supabase start
     ```
     ```bash
     supabase db reset
     ```
   - Ports: API `54321`, database `54322`, Studio `54323`, test email inbox (Mailpit/Inbucket) `54324`. Confirmation and reset emails land in that inbox: open `http://LAN_IP:54324`.
   - `weblume://auth-callback` is already an allowed redirect in `supabase/config.toml`. For a cloud project, add it under Authentication → URL configuration.
   - Email links in the inbox may point at `127.0.0.1`, which on the phone means the phone itself. If so, open the link with `127.0.0.1` replaced by `LAN_IP`, or test sign-up with confirmation turned off locally (`[auth.email] enable_confirmations = false`).
3. **API** (`apps/api/.env`, from `.env.example`):
   - `DATABASE_URL`: the DB URL printed by `supabase start`.
   - `SUPABASE_URL=http://127.0.0.1:54321`: the API runs on the computer, and local Supabase stamps tokens with its configured issuer (normally `http://127.0.0.1:54321/auth/v1`), not the address the phone used. If every request returns 401, decode a token's `iss` claim (e.g. on jwt.io) and set `SUPABASE_URL` to match.
   - `CORS_ORIGINS=http://LAN_IP:3000` (only needed for the web app).
   - `PUBLIC_SITE_URL=http://LAN_IP:3000`.
   - Optional `PSI_API_KEY` for real Lighthouse scores; without it, reports honestly say Lighthouse is unavailable.
   - Run it, listening on all interfaces (port 4000):
     ```bash
     pnpm dev:api
     ```
   - Check it from the phone's browser: `http://LAN_IP:4000/health`.
   - The scan worker needs **direct internet access** (it ignores HTTP proxies on purpose).
4. **App on the phone:** enable USB debugging, plug it in, then:
   ```bash
   cd apps/mobile
   ```
   ```bash
   flutter run --dart-define=API_BASE_URL=http://LAN_IP:4000 --dart-define=SITE_URL=http://LAN_IP:3000 --dart-define=SUPABASE_URL=http://LAN_IP:54321 --dart-define=SUPABASE_PUBLISHABLE_KEY=<anon/publishable key from supabase start>
   ```
   - Release-like build: replace `flutter run` with `flutter run --release` (debug-signed unless a keystore is set up; see `apps/mobile/README.md`).
   - **Plain HTTP:** debug and profile builds allow cleartext HTTP (`android/app/src/{debug,profile}/AndroidManifest.xml`), so `flutter run` and `flutter run --profile` can reach the LAN API. **Release builds are HTTPS-only.** To test a release build against your computer, put the API and Supabase behind HTTPS (e.g. a `cloudflared` or `ngrok` tunnel) and use those URLs.
5. **Web** (optional, for share links and PDFs): in `apps/web/.env.local`, set `NEXT_PUBLIC_API_URL=http://LAN_IP:4000`, `NEXT_PUBLIC_SUPABASE_URL=http://LAN_IP:54321` and the publishable key. Then run:
   ```bash
   pnpm dev:web
   ```

### Turning on Starter features without payments (local only)

Comparison, share links and PDF need the Starter plan. Billing is off by default, so in Supabase Studio's SQL editor (`http://LAN_IP:54323`), for your test user:

```sql
update public.feature_flags set enabled = true where key = 'billing';
insert into public.subscriptions (user_id, provider, provider_subscription_id, product_id, plan_id, status,
  current_period_start, current_period_end, last_event_at)
select id, 'paddle', 'sub_local_test', 'pri_local', 'starter', 'active', now(), now() + interval '30 days', now()
from auth.users where email = 'YOUR_TEST_EMAIL';
```

Flags are cached for about 30 seconds. Undo it with `delete from public.subscriptions where provider_subscription_id = 'sub_local_test';`.

**Google Play purchases can't be tested this way.** They need the app uploaded to a Play Console testing track, the `weblume_starter` subscription, license testers, a service account and Pub/Sub (`docs/payments-setup.md` §4). On a sideloaded build the Subscription screen correctly says Google Play Billing isn't available.

## 4. What to test on the device

Work through **§5 of `docs/smoke-test.md`**, plus the following:

- **Sign-in:** sign up, then open the confirmation email link on the phone (deep link `weblume://auth-callback`). Log in and out, use forgot password, and check that the reset link opens the new-password screen.
- **Scans:** start a scan; watch progress; open the report, then a finding's detail. Retry a failed scan (e.g. `no-such-domain-xyz.com`). Try a blocked address (`http://192.168.1.1`), which should be refused.
- **Starter features:** with the SQL above, check Share link (copies to the clipboard; open it in the phone's browser) and Compare (needs two finished scans of the same address).
- **Offline:** open a report, turn on airplane mode, and reopen it. It should load from cache with an offline banner, and new scans should be disabled.
- **Look and feel:**
  - Light and dark (system setting).
  - Largest font size and display size: check for clipped text, especially on the report score row, severity tiles, dashboard hero and subscription cards.
  - Small phones (≤ 360 dp width) and tablets (a navigation rail appears ≥ 840 dp wide).
  - Animation smoothness on a low-end device.
  - With **Settings → Accessibility → Remove animations** on, everything should appear instantly.
- **TalkBack:** scores read as "Performance: 61 out of 100, Needs work"; severity tiles read as "High: 1"; and all buttons have labels.
- **Back and predictive-back** behaviour, rotation, and leaving the app during a scan, then returning.
- **Account deletion:** typing DELETE removes the account and signs you out.

### Things the screenshots couldn't show (check them on the device)

- The real fonts for the "→" in compare score rows and the monospace evidence text: the test renderer showed boxes; the device should not.
- Gradient buttons and glows: banding or shadow clipping on real screens.
- Whether `FadeSlideIn` entrance animations feel smooth, or too slow on long lists.

## 5. Where the Android UI lives

- **Theme:** `lib/theme/app_theme.dart`.
  - `brandGradient()`.
  - Gradient `FilledButton`s via `backgroundBuilder`.
  - Chip, navigation and floating-button themes.
  - Fade-forwards page transitions.
- **Colours** come from `packages/design-tokens/tokens.json`. Change them there, then run `pnpm tokens`.
- **Shared components:** `lib/shared/widgets/surface.dart`, with `WlCard` (with `gradientBorder` and `accent`), `GradientPanel`, `SectionTitle`, `Eyebrow`, `GradientAvatar` and `FadeSlideIn`.
- **Screens:** `lib/features/*`. The report is in `features/scan/report_view.dart`, and the dashboard is in `features/dashboard/dashboard_screen.dart`.
- **Tests:** `apps/mobile/test/` (86 tests, including tap-target, label and contrast guidelines). Fakes are in `test/support/fakes.dart`. Run:
  ```bash
  flutter analyze
  ```
  ```bash
  flutter test
  ```

## 6. Checks before every push

From the repo root, with Postgres available for the database tests. In the cloud environment, restart it with `pg_ctlcluster 16 main start` and run `pnpm db:test-setup` first.

```bash
pnpm format:check && pnpm lint && pnpm typecheck
```

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/weblume_test pnpm test
```

```bash
pnpm openapi:check
```

```bash
pnpm --filter @weblume/web build:e2e && pnpm --filter @weblume/web test:e2e
```

```bash
cd apps/mobile && flutter analyze && flutter test
```

Results at handover: API 305, shared 86, design tokens 42, TS client 2, web Playwright 189 (5 skipped), Flutter 86. All passing; CI green on `main`.

## 7. Known limitations / open items (see `docs/PROGRESS.md` for the full list)

- **Payments:**
  - Provider not chosen yet (Paddle vs Dodo; India eligibility unconfirmed).
  - The Dodo adapter is unverified against the live API.
  - Paddle's $0.50 fixed fee is heavy on ₹149/month (`docs/unit-economics.md`).
- **Real PageSpeed Insights responses** have never been seen; the mapper was tested on a hand-built fixture.
- **Android:**
  - The session is in app-private SharedPreferences (not Keystore-encrypted; backups are off).
  - No crash reporting in the app.
  - PDFs are web-only.
- **Web:** the CSP allows inline scripts, and it hasn't been checked with real Turnstile or Paddle keys.
- **Legal pages** are DRAFT and need review.
- **Manual accessibility checks** (screen readers, zoom) haven't been done (`docs/quality-review.md`).

## 8. Suggested first message for the new chat

> I'm continuing Weblume (repo siddharthrana/weblume, branch main). Read docs/HANDOVER.md first, then docs/PROGRESS.md. I'm about to test the Android app on a real phone against a local Supabase + API on my computer. Help me set it up, then I'll report what I find; fix issues on a new branch off main, keep the tests passing, and update PROGRESS.md.
