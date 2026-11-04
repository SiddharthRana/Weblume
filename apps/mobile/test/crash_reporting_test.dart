import 'package:flutter_test/flutter_test.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:weblume/observability/crash_reporting.dart';

void main() {
  test('without a DSN the app just runs, with no Sentry', () async {
    var ran = false;
    await runWithCrashReporting(() => ran = true, dsn: '');
    expect(ran, isTrue);
    expect(Sentry.isEnabled, isFalse);
  });

  test('configures Sentry to collect nothing personal', () {
    final options = SentryFlutterOptions();
    configureSentry(options, 'https://key@o0.ingest.sentry.io/0');
    expect(options.dsn, 'https://key@o0.ingest.sentry.io/0');
    expect(options.sendDefaultPii, isFalse);
    expect(options.attachScreenshot, isFalse);
    expect(options.attachViewHierarchy, isFalse);
    expect(options.enablePrintBreadcrumbs, isFalse);
    expect(options.tracesSampleRate, 0);
    expect(options.beforeSend, isNotNull);
    expect(options.beforeBreadcrumb, isNotNull);
  });

  test('scrubText masks emails, tokens, query strings and share links', () {
    expect(scrubText('Invalid login for ana@example.com'), 'Invalid login for [email]');
    expect(scrubText('jwt eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl here'), 'jwt [token] here');
    expect(scrubText('Authorization: Bearer abc.def'), 'Authorization: Bearer [token]');
    expect(
      scrubText('GET https://api.weblume.app/v1/scans?url=https://shop.example.com failed'),
      'GET https://api.weblume.app/v1/scans failed',
    );
    expect(scrubText('weblume://auth-callback?code=secret'), 'weblume://auth-callback');
    expect(scrubText('https://weblume.app/r/Ab12Cd34 opened'), 'https://weblume.app/r/[token] opened');
    expect(scrubText('/v1/shared/Ab12Cd34/report'), '/v1/shared/[token]/report');
  });

  test('scrubEvent drops identity and request, and masks messages, exceptions and breadcrumbs', () {
    final event = SentryEvent(
      user: SentryUser(id: 'u1', email: 'ana@example.com', ipAddress: '1.2.3.4'),
      request: SentryRequest(url: 'https://api.weblume.app/v1/me', queryString: 'a=b', cookies: 'sb=1'),
      message: SentryMessage('Failed for ana@example.com', params: ['ana@example.com']),
      exceptions: [SentryException(type: 'DioException', value: 'GET https://x.test/v1/scans?url=secret 500')],
      breadcrumbs: [
        Breadcrumb(message: 'opened /r/tok123', data: {'url': 'https://x.test/a?token=1', 'status': 500}),
      ],
    );

    final out = scrubEvent(event);
    expect(out.user, isNull);
    expect(out.request, isNull);
    expect(out.message!.formatted, 'Failed for [email]');
    expect(out.message!.params, isNull);
    expect(out.exceptions!.single.value, 'GET https://x.test/v1/scans 500');
    expect(out.breadcrumbs!.single.message, 'opened /r/[token]');
    expect(out.breadcrumbs!.single.data, {'url': 'https://x.test/a', 'status': 500});
  });
}
