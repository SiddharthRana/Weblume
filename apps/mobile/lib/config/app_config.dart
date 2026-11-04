/// Build-time configuration, supplied with `--dart-define` (see apps/mobile/README.md).
abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Android emulator alias for the host machine's localhost.
    defaultValue: 'http://10.0.2.2:4000',
  );

  static const siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'http://10.0.2.2:3000');

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabasePublishableKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// Deep link Supabase redirects to after email confirmation / password reset.
  static const authRedirectUrl = 'weblume://auth-callback';

  static const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '0.1.0');

  /// Sentry crash reporting. Empty (the default) turns it off.
  static const sentryDsn = String.fromEnvironment('SENTRY_DSN');
  static const sentryEnvironment = String.fromEnvironment('SENTRY_ENVIRONMENT', defaultValue: 'production');

  static bool get authConfigured => supabaseUrl.isNotEmpty && supabasePublishableKey.isNotEmpty;
}
