import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/auth/auth_repository.dart';
import 'package:weblume/data/auth_interceptor.dart';

import 'support/fakes.dart';

/// Hands out [token], and [refreshed] once the API has rejected it.
class _TokenAuth extends FakeAuth {
  String token = 'old';
  String? refreshed = 'new';
  AuthFailure? failure;
  int refreshes = 0;

  @override
  Future<String?> accessToken() async {
    if (failure != null) throw failure!;
    return token;
  }

  @override
  Future<String?> refreshAccessToken() async {
    refreshes++;
    if (refreshed != null) token = refreshed!;
    return refreshed;
  }
}

/// Accepts only `Bearer new` and records the tokens it saw.
class _Api implements HttpClientAdapter {
  final seen = <String?>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final auth = options.headers['Authorization'] as String?;
    seen.add(auth);
    final ok = auth == 'Bearer new';
    return ResponseBody.fromString(
      jsonEncode(ok ? {'ok': true} : {'code': 'unauthorized', 'message': 'Unauthorized'}),
      ok ? 200 : 401,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late _TokenAuth auth;
  late _Api api;
  late Dio dio;

  setUp(() {
    auth = _TokenAuth();
    api = _Api();
    dio = Dio(BaseOptions(baseUrl: 'http://api.test'))..httpClientAdapter = api;
    dio.interceptors.add(AuthInterceptor(auth, dio));
  });

  test('a rejected token is refreshed once and the request sent again', () async {
    final res = await dio.get<dynamic>('/v1/me');
    expect(res.statusCode, 200);
    expect(api.seen, ['Bearer old', 'Bearer new']);
    expect(auth.refreshes, 1);
  });

  test('a fresh token goes straight through', () async {
    auth.token = 'new';
    await dio.get<dynamic>('/v1/me');
    expect(api.seen, ['Bearer new']);
    expect(auth.refreshes, 0);
  });

  test('gives up after one retry when the new token is rejected too', () async {
    auth.refreshed = 'still-bad';
    await expectLater(
      dio.get<dynamic>('/v1/me'),
      throwsA(isA<DioException>().having((e) => e.response?.statusCode, 'status', 401)),
    );
    expect(api.seen, ['Bearer old', 'Bearer still-bad']);
  });

  test('passes the 401 on when there is no session to refresh', () async {
    auth.refreshed = null;
    await expectLater(dio.get<dynamic>('/v1/me'), throwsA(isA<DioException>()));
    expect(api.seen, ['Bearer old']);
  });

  test('an expired token that cannot be refreshed is a connection error, not a sign-out', () async {
    auth.failure = AuthFailure('offline');
    await expectLater(
      dio.get<dynamic>('/v1/me'),
      throwsA(isA<DioException>().having((e) => e.type, 'type', DioExceptionType.connectionError)),
    );
    expect(api.seen, isEmpty);
  });
}
