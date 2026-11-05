# Weblume mobile (Flutter)

Android-first Flutter app. iOS is structurally supported but not in scope yet (no iOS billing).

- Flutter 3.47 stable / Dart 3.13, Material 3
- State: Riverpod 3 · Routing: go_router · HTTP: dio · Auth: supabase_flutter (PKCE) · i18n: `flutter gen-l10n` (ARB in `lib/l10n`)
- Screens: log in, sign up, forgot/reset password, dashboard (plan, usage, recent scans), new scan, scan progress, report, finding detail, history (search, pagination), account (profile, plan/usage, legal links, log out, delete account)
- Offline: the last account, scan list and up to 20 finished reports are cached (read-only) and shown with an offline banner; the cache is cleared on log-out and account deletion
- The app requires an account to scan: the guest bot check (Turnstile) is web-only

## Structure

```
lib/
  main.dart, app.dart      Entry point (Supabase init) and MaterialApp.router
  api/generated/           GENERATED Dart API client from apps/api/openapi.json (`pnpm openapi`) — don't edit
  auth/                    AuthRepository interface + Supabase implementation
  data/                    WeblumeRepository (API + offline cache), Riverpod providers
  config/                  Build-time config (--dart-define)
  router/                  go_router routes, auth redirects, shell
  utils/                   URL validation (shares test cases with packages/shared)
  theme/
    tokens.g.dart          GENERATED from packages/design-tokens/tokens.json — don't edit
    app_theme.dart         Light/dark ThemeData + SeverityColors extension
  features/<feature>/      Screens and feature logic (dashboard, scan, history, account)
  shared/widgets/          Reusable widgets (shell, empty state, severity badge, logo)
  l10n/                    app_en.arb (+ generated localizations)
```

## Configuration (`--dart-define`)

| Key | Description |
| --- | --- |
| `API_BASE_URL` | Weblume API (default `http://10.0.2.2:4000`, the emulator's host) |
| `SITE_URL` | Website, for legal links and data export |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Supabase project. Without them the app shows "Accounts aren't configured" |
| `APP_VERSION` | Shown in Account, and the Sentry release (`weblume-android@<version>`) |
| `SENTRY_DSN` | Sentry project DSN for crash reports. Empty (the default) turns crash reporting off entirely |
| `SENTRY_ENVIRONMENT` | Sentry environment tag (default `production`; use `staging` for staging builds) |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key. Shows the security check on sign-up, sign-in and password reset (needed once Supabase CAPTCHA is on). Empty turns it off. The check runs in a web view loaded as `SITE_URL`, which must be one of the widget's hostnames |
| `AUTH_GOOGLE_ENABLED` | `true` shows "Continue with Google" on log in and sign up. Needs the Google provider on in Supabase, with `weblume://auth-callback` in its redirect URLs. Default `false` |

**Dev builds from CI:** every push to `dev` builds an APK (and, with an upload key, an App Bundle) pointed at the dev environment; download it from the run's **Artifacts**. It uses the `web-dev` environment's variables. Add the repository secrets `ANDROID_KEYSTORE_BASE64` (`base64 -i weblume-upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` to sign with your upload key; without them it uses a throwaway key and each new build must be installed after uninstalling the old one.

In Supabase → Authentication → URL configuration, add **`weblume://auth-callback`** to the redirect URLs. Email confirmation and password-reset links open the app through this deep link (registered in `AndroidManifest.xml` and `Info.plist`).

## Session storage

The Supabase session (access and refresh tokens) and the PKCE code verifier are stored with `flutter_secure_storage`, which encrypts them with a key held in the Android Keystore (`lib/auth/secure_session_storage.dart`). Earlier builds kept the session in plain SharedPreferences; on first start after the upgrade it is moved into secure storage and the plain copy deleted, so nobody is signed out. App backup is off (`allowBackup="false"`), and if the Keystore key can't decrypt the data (for example after a device restore), it is wiped and the user signs in again.

## Crash reporting (Sentry)

Build with `--dart-define=SENTRY_DSN=<dsn>` to send crashes and unhandled errors to Sentry (create a Flutter project in Sentry and copy its DSN). Without it, Sentry is never initialised. Reports follow the same rules as the API (`lib/observability/crash_reporting.dart`):

- no user identity, IP, request details, screenshots or view hierarchy (`sendDefaultPii` off);
- emails, JWTs and bearer tokens in messages, exceptions and breadcrumbs are masked, query strings (scanned addresses, auth codes) are removed, and share-link tokens in `/r/` and `/shared/` paths are masked;
- no print breadcrumbs and no performance tracing (free tier).

Release builds are obfuscated only if you pass `--obfuscate --split-debug-info=build/symbols`; then upload the symbols with `sentry-cli debug-files upload build/symbols` so stack traces stay readable. Note Sentry in the Play data safety form (crash logs, not linked to the user).

## Run

```bash
flutter pub get
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:4000 \
  --dart-define=SITE_URL=http://10.0.2.2:3000 \
  --dart-define=SUPABASE_URL=http://10.0.2.2:54321 \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`10.0.2.2` is the Android emulator's alias for your computer's `localhost`. On a physical device, use your machine's LAN IP.

## Check

```bash
dart format --set-exit-if-changed $(find lib test -name '*.dart' ! -name '*.g.dart' ! -name 'app_localizations*')
flutter analyze
flutter test
```

After changing `packages/design-tokens/tokens.json`, run `pnpm tokens` from the repo root and commit the regenerated `lib/theme/tokens.g.dart`. After changing the API, run `pnpm openapi` to regenerate `lib/api/generated/`. CI fails if either is stale.

Tests: secure session storage and its migration, crash-report scrubbing, generated client and repository (dio mock adapter, in-memory preferences), shared URL cases, router redirects, auth flows, scan flow (validation → polling → report → finding detail), failures/partial/offline, history, account (name, deletion, log out), and Flutter accessibility guidelines in light and dark.

## Android release build

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.your-domain.com
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.your-domain.com \
  --dart-define=SENTRY_DSN=<dsn>   # for Google Play
```

Without a keystore, release builds are signed with the debug key (fine locally; **not** accepted by Play). To sign for Play:

1. Create an upload keystore (keep it and its passwords safe, outside the repo):
   `keytool -genkey -v -keystore ~/weblume-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
2. Create `android/key.properties` (git-ignored):
   ```
   storeFile=/absolute/path/to/weblume-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
3. Enrol in Play App Signing when creating the app in Play Console.

Application ID: `com.weblume.app` (permanent once published).

## iOS (later)

Bundle ID is `com.weblume.app`. Building requires macOS with Xcode, CocoaPods and an Apple Developer account. Run `flutter build ios`, then set the team and signing in Xcode (`ios/Runner.xcworkspace`). iOS in-app purchases are out of scope until iOS is.
