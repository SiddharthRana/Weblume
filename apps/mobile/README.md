# Weblume mobile (Flutter)

Android-first Flutter app. iOS is structurally supported but not in scope yet (no iOS billing).

- Flutter 3.47 stable / Dart 3.13, Material 3
- State: Riverpod 3 · Routing: go_router · HTTP: dio · i18n: `flutter gen-l10n` (ARB in `lib/l10n`)

## Structure

```
lib/
  main.dart, app.dart      Entry point and MaterialApp.router
  config/                  Build-time config (--dart-define)
  router/                  go_router routes + shell
  theme/
    tokens.g.dart          GENERATED from packages/design-tokens/tokens.json — don't edit
    app_theme.dart         Light/dark ThemeData + SeverityColors extension
  features/<feature>/      Screens and feature logic (dashboard, scan, history, account)
  shared/widgets/          Reusable widgets (shell, empty state, severity badge, logo)
  l10n/                    app_en.arb (+ generated localizations)
```

## Run

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000 --dart-define=SITE_URL=http://10.0.2.2:3000
```

`10.0.2.2` is the Android emulator's alias for your computer's `localhost`. On a physical device, use your machine's LAN IP.

## Check

```bash
dart format --set-exit-if-changed $(find lib test -name '*.dart' ! -name '*.g.dart' ! -name 'app_localizations*')
flutter analyze
flutter test
```

After changing `packages/design-tokens/tokens.json`, run `pnpm tokens` from the repo root and commit the regenerated `lib/theme/tokens.g.dart`.

## Android release build

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.your-domain.com
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.your-domain.com   # for Google Play
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
