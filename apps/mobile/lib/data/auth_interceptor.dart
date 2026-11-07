import 'package:dio/dio.dart';

import '../auth/auth_repository.dart';

/// Signs API requests with the person's access token.
///
/// The token is refreshed first when it has expired, which it has when Android reopens the app after
/// closing it in the background: without this, those first requests were rejected and the screens
/// said the session had expired. If the API still rejects a token, it's refreshed once and the
/// request sent again.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._auth, this._dio);

  final AuthRepository _auth;
  final Dio _dio;

  static const _retried = 'authRetried';

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    try {
      final token = await _auth.accessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    } on AuthFailure catch (e) {
      // Couldn't refresh (usually no connection yet): a network error, so reads fall back to the cache.
      handler.reject(DioException.connectionError(requestOptions: options, reason: e.message));
    }
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401 || options.extra[_retried] == true) return handler.next(err);
    final token = await _auth.refreshAccessToken();
    if (token == null) return handler.next(err);
    options
      ..extra[_retried] = true
      ..headers['Authorization'] = 'Bearer $token';
    try {
      handler.resolve(await _dio.fetch<dynamic>(options));
    } on DioException catch (e) {
      handler.next(e);
    }
  }
}
