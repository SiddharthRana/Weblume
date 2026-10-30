import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';
import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/data/local_cache.dart';
import 'package:weblume/data/weblume_repository.dart';

import 'support/fakes.dart';

void main() {
  late Dio dio;
  late DioAdapter adapter;
  late WeblumeApi api;

  setUp(() {
    SharedPreferencesAsyncPlatform.instance = InMemorySharedPreferencesAsync.empty();
    dio = Dio(BaseOptions(baseUrl: 'http://api.test'));
    adapter = DioAdapter(dio: dio);
    api = WeblumeApi(dio);
  });

  group('generated models', () {
    test('decode a full report and survive a JSON round trip', () {
      final r = ScanReport.fromJson(reportJson('s1'));
      expect(r.status, ScanSummaryStatus.completed);
      expect(r.lighthouse!.mobile!.scores.performance, 61);
      expect(r.lighthouse!.mobile!.metrics.largestContentfulPaint, closeTo(3200.5, 0.01));
      expect(r.sources.psiMobile!.status, SourceStatusStatus.ok);
      expect(r.findings.first.severity, FindingSeverity.high);
      expect(r.findings.first.details['count'], 1);
      expect(r.createdAt, DateTime.utc(2026, 10, 29, 10));
      final again = ScanReport.fromJson(r.toJson());
      expect(again.toJson(), r.toJson());
    });

    test('map unknown enum values to unknown instead of crashing', () {
      final json = reportJson('s1')..['status'] = 'archived';
      (json['findings'] as List).first['severity'] = 'catastrophic';
      final r = ScanReport.fromJson(json);
      expect(r.status, ScanSummaryStatus.unknown);
      expect(r.findings.first.severity, FindingSeverity.unknown);
    });

    test('treat missing optional fields as null', () {
      final r = ScanReport.fromJson(reportJson('s1', lighthouse: false));
      expect(r.lighthouse, isNull);
      expect(r.sources.psiMobile!.reason, SourceStatusReason.quotaExceeded);
    });
  });

  group('generated client', () {
    test('sends query parameters and decodes the response', () async {
      adapter.onGet(
        '/v1/scans',
        (s) => s.reply(200, {
          'items': [summaryJson('a')],
          'nextCursor': '2026-10-29T10:00:00.000Z',
        }),
        queryParameters: {'q': 'shop', 'limit': 5},
      );
      final res = await api.scansList(q: 'shop', limit: 5);
      expect(res.items.single.id, 'a');
      expect(res.nextCursor, DateTime.utc(2026, 10, 29, 10));
    });

    test('sends JSON bodies', () async {
      adapter.onPost(
        '/v1/scans',
        (s) => s.reply(202, {'scan': summaryJson('n', status: 'queued'), 'deduplicated': false}),
        data: {'url': 'https://example.com/'},
      );
      final res = await api.scansCreate(body: const CreateScanBody(url: 'https://example.com/'));
      expect(res.scan.status, ScanSummaryStatus.queued);
    });

    test('turns API errors into ApiException with code and message', () async {
      adapter.onPost(
        '/v1/scans',
        (s) => s.reply(429, {'statusCode': 429, 'code': 'quota_exceeded', 'message': 'No scans left.'}),
        data: {'url': 'https://example.com/'},
      );
      expect(
        () => api.scansCreate(body: const CreateScanBody(url: 'https://example.com/')),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'quota_exceeded')
              .having((e) => e.statusCode, 'status', 429),
        ),
      );
    });

    test('joins validation message arrays', () async {
      adapter.onPatch(
        '/v1/me',
        (s) => s.reply(400, {
          'statusCode': 400,
          'message': ['a', 'b'],
        }),
        data: {'displayName': 'x'},
      );
      expect(
        () => api.accountUpdate(body: const UpdateAccountBody(displayName: 'x')),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'a b')),
      );
    });

    test('marks connection failures as network errors', () async {
      adapter.onGet(
        '/v1/me',
        (s) => s.throws(0, DioException.connectionError(requestOptions: RequestOptions(), reason: 'offline')),
      );
      expect(() => api.accountMe(), throwsA(isA<ApiException>().having((e) => e.isNetworkError, 'network', true)));
    });
  });

  group('repository offline fallback', () {
    late WeblumeRepository repo;
    setUp(() => repo = WeblumeRepository(api, LocalCache(SharedPreferencesAsync())));

    test('serves the cached report when offline', () async {
      adapter.onGet('/v1/scans/s1', (s) => s.reply(200, reportJson('s1')));
      expect((await repo.report('s1')).fromCache, isFalse);
      adapter.onGet(
        '/v1/scans/s1',
        (s) => s.throws(0, DioException.connectionError(requestOptions: RequestOptions(), reason: 'x')),
      );
      final cached = await repo.report('s1');
      expect(cached.fromCache, isTrue);
      expect(cached.data.findings, hasLength(2));
    });

    test('doesn’t cache scans that are still running', () async {
      adapter.onGet('/v1/scans/s2', (s) => s.reply(200, reportJson('s2', status: 'running')));
      await repo.report('s2');
      adapter.onGet(
        '/v1/scans/s2',
        (s) => s.throws(0, DioException.connectionError(requestOptions: RequestOptions(), reason: 'x')),
      );
      expect(() => repo.report('s2'), throwsA(isA<ApiException>()));
    });

    test('rethrows non-network errors instead of using the cache', () async {
      adapter.onGet('/v1/me', (s) => s.reply(200, fakeAccount().toJson()));
      await repo.account();
      adapter.onGet(
        '/v1/me',
        (s) => s.reply(403, {'statusCode': 403, 'code': 'account_deleted', 'message': 'Deleted.'}),
      );
      expect(() => repo.account(), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'account_deleted')));
    });

    test('clears the cache when the account is deleted', () async {
      adapter.onGet('/v1/me', (s) => s.reply(200, fakeAccount().toJson()));
      await repo.account();
      adapter.onDelete('/v1/me', (s) => s.reply(200, {'status': 'deleted'}), data: {'confirm': 'DELETE'});
      await repo.deleteAccount();
      adapter.onGet(
        '/v1/me',
        (s) => s.throws(0, DioException.connectionError(requestOptions: RequestOptions(), reason: 'x')),
      );
      expect(() => repo.account(), throwsA(isA<ApiException>()));
    });

    test('keeps only the most recent reports', () async {
      final cache = LocalCache(SharedPreferencesAsync());
      for (var i = 0; i < LocalCache.maxReports + 3; i++) {
        await cache.writeReport('r$i', {'i': i});
      }
      expect(await cache.read('report.r0'), isNull);
      expect(await cache.read('report.r${LocalCache.maxReports + 2}'), isNotNull);
    });
  });
}
