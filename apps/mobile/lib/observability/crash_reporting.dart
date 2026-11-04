import 'dart:async';

import 'package:sentry_flutter/sentry_flutter.dart';

import '../config/app_config.dart';

/// Starts the app with Sentry crash reporting when `SENTRY_DSN` is set, or just runs it.
Future<void> runWithCrashReporting(FutureOr<void> Function() appRunner, {String dsn = AppConfig.sentryDsn}) async {
  if (dsn.isEmpty) {
    await appRunner();
    return;
  }
  await SentryFlutter.init((options) => configureSentry(options, dsn), appRunner: appRunner);
}

void configureSentry(SentryFlutterOptions options, String dsn) {
  options
    ..dsn = dsn
    ..environment = AppConfig.sentryEnvironment
    ..release = 'weblume-android@${AppConfig.appVersion}'
    // Collect nothing personal; beforeSend scrubs again in case a default changes.
    ..sendDefaultPii = false
    ..attachScreenshot = false
    ..attachViewHierarchy = false
    // Debug prints can contain addresses or emails; they aren't needed to read a crash.
    ..enablePrintBreadcrumbs = false
    // Errors only: no performance tracing, to stay within the free tier.
    ..tracesSampleRate = 0
    ..enableAutoPerformanceTracing = false
    ..beforeSend = ((event, _) => scrubEvent(event))
    ..beforeBreadcrumb = ((crumb, _) => crumb == null ? null : scrubBreadcrumb(crumb));
}

final _email = RegExp(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}');
final _jwt = RegExp(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+');
final _bearer = RegExp(r'Bearer\s+\S+', caseSensitive: false);
final _query = RegExp(r'\?[^\s"]*');

/// Masks emails, tokens, query strings (scanned addresses, auth codes) and share-link tokens in free text.
String scrubText(String text) => maskPath(
  text
      .replaceAll(_jwt, '[token]')
      .replaceAll(_bearer, 'Bearer [token]')
      .replaceAll(_email, '[email]')
      .replaceAll(_query, ''),
);

String maskPath(String url) =>
    url.replaceAll(RegExp(r'/shared/[^/\s"]+'), '/shared/[token]').replaceAll(RegExp(r'/r/[^/\s"]+'), '/r/[token]');

/// Removes personal data before a crash report leaves the device, matching the API's rules:
/// no user identity, request details, query strings, emails or tokens.
SentryEvent scrubEvent(SentryEvent event) {
  event.user = null;
  event.request = null;
  final message = event.message;
  if (message != null) {
    message.formatted = scrubText(message.formatted);
    message.params = null;
  }
  for (final e in event.exceptions ?? const <SentryException>[]) {
    if (e.value != null) e.value = scrubText(e.value!);
  }
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb).toList();
  return event;
}

Breadcrumb scrubBreadcrumb(Breadcrumb crumb) {
  if (crumb.message != null) crumb.message = scrubText(crumb.message!);
  final data = crumb.data;
  if (data != null) {
    crumb.data = {for (final MapEntry(:key, :value) in data.entries) key: value is String ? scrubText(value) : value};
  }
  return crumb;
}
