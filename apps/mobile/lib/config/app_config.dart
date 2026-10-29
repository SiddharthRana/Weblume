/// Build-time configuration, supplied with `--dart-define` (see apps/mobile/README.md).
abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Android emulator alias for the host machine's localhost.
    defaultValue: 'http://10.0.2.2:4000',
  );

  static const siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'http://10.0.2.2:3000');

  static const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '0.1.0');
}
