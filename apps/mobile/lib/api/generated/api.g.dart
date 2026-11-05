// GENERATED FILE — do not edit. Source: apps/api/openapi.json (run `pnpm openapi`).
// ignore_for_file: type=lint, unused_import

import 'package:dio/dio.dart';

import 'models.g.dart';

/// Error returned by the Weblume API (or a network failure, with [statusCode] null).
class ApiException implements Exception {
  ApiException({this.statusCode, this.code, required this.message, this.body});

  final int? statusCode;
  /// Stable machine-readable code from the API, e.g. `quota_exceeded`.
  final String? code;
  final String message;
  final Map<String, dynamic>? body;

  bool get isNetworkError => statusCode == null;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      final map = Map<String, dynamic>.from(data);
      final msg = map['message'];
      return ApiException(
        statusCode: e.response?.statusCode,
        code: map['code'] as String?,
        message: msg is List ? msg.join(' ') : (msg as String? ?? 'Request failed'),
        body: map,
      );
    }
    return ApiException(statusCode: e.response?.statusCode, message: e.message ?? 'Network error');
  }

  @override
  String toString() => 'ApiException($statusCode, $code, $message)';
}

/// Typed Weblume API client. Configure auth (Authorization header) on the [Dio] instance.
class WeblumeApi {
  WeblumeApi(this._dio);

  final Dio _dio;

  Future<T> _call<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Health> healthHealth() => _call(() async {
        final res = await _dio.request<Object?>(
          '/health',
          options: Options(method: 'GET'),
          
          
        );
        return Health.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Health> healthReady() => _call(() async {
        final res = await _dio.request<Object?>(
          '/ready',
          options: Options(method: 'GET'),
          
          
        );
        return Health.fromJson(res.data as Map<String, dynamic>);
      });

  Future<List<Plan>> plansList() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/plans',
          options: Options(method: 'GET'),
          
          
        );
        return (res.data as List<dynamic>).map((e) => Plan.fromJson(e as Map<String, dynamic>)).toList();
      });

  Future<CreateScanResponse> scansCreate({required CreateScanBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return CreateScanResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ScanListResponse> scansList({String? q, int? limit, String? before}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans',
          options: Options(method: 'GET'),
          queryParameters: {if (q != null) 'q': q, if (limit != null) 'limit': limit, if (before != null) 'before': before},
          
        );
        return ScanListResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ScanReport> scansGet({required String id, String? scanToken}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}',
          options: Options(method: 'GET', headers: {if (scanToken != null) 'x-scan-token': scanToken}),
          
          
        );
        return ScanReport.fromJson(res.data as Map<String, dynamic>);
      });

  Future<CreateScanResponse> scansRetry({required String id, String? scanToken}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}/retry',
          options: Options(method: 'POST', headers: {if (scanToken != null) 'x-scan-token': scanToken}),
          
          
        );
        return CreateScanResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ScanSummary> scansClaim({required String id, required String scanToken}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}/claim',
          options: Options(method: 'POST', headers: {'x-scan-token': scanToken}),
          
          
        );
        return ScanSummary.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Account> accountMe() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/me',
          options: Options(method: 'GET'),
          
          
        );
        return Account.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Account> accountUpdate({required UpdateAccountBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/me',
          options: Options(method: 'PATCH'),
          
          data: body.toJson(),
        );
        return Account.fromJson(res.data as Map<String, dynamic>);
      });

  Future<DeleteAccountResponse> accountDelete({required DeleteAccountBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/me',
          options: Options(method: 'DELETE'),
          
          data: body.toJson(),
        );
        return DeleteAccountResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Map<String, dynamic>> accountExport() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/me/export',
          options: Options(method: 'GET'),
          
          
        );
        return res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      });

  Future<BillingConfig> billingConfig() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/config',
          options: Options(method: 'GET'),
          
          
        );
        return BillingConfig.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Url> billingCheckout({required CheckoutBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/checkout',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return Url.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Url> billingPortal() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/portal',
          options: Options(method: 'POST'),
          
          
        );
        return Url.fromJson(res.data as Map<String, dynamic>);
      });

  Future<AccountRef> billingAccountRef() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/google-play/account-ref',
          options: Options(method: 'GET'),
          
          
        );
        return AccountRef.fromJson(res.data as Map<String, dynamic>);
      });

  Future<PlayVerifyResponse> billingVerify({required PlayVerifyBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/google-play/verify',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return PlayVerifyResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ApiErrorBody> billingRtdn() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/google-play/rtdn',
          options: Options(method: 'POST'),
          
          
        );
        return ApiErrorBody.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Map<String, dynamic>> billingWebhook({required String provider}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/billing/webhooks/${Uri.encodeComponent(provider)}',
          options: Options(method: 'POST'),
          
          
        );
        return res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      });

  Future<ReportComparison> reportsCompare({required String base, required String target}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/compare',
          options: Options(method: 'GET'),
          queryParameters: {'base': base, 'target': target},
          
        );
        return ReportComparison.fromJson(res.data as Map<String, dynamic>);
      });

  Future<List<int>> reportsPdf({required String id}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}/report.pdf',
          options: Options(method: 'GET', responseType: ResponseType.bytes),
          
          
        );
        return res.data as List<int>;
      });

  Future<CreateShareResponse> reportsCreateShare({required String id, required CreateShareBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}/shares',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return CreateShareResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ShareListResponse> reportsListShares({required String id}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/scans/${Uri.encodeComponent(id)}/shares',
          options: Options(method: 'GET'),
          
          
        );
        return ShareListResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<ShareLink> reportsRevokeShare({required String shareId}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/shares/${Uri.encodeComponent(shareId)}',
          options: Options(method: 'DELETE'),
          
          
        );
        return ShareLink.fromJson(res.data as Map<String, dynamic>);
      });

  Future<SharedReport> reportsViewShared({required String token}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/shared/${Uri.encodeComponent(token)}',
          options: Options(method: 'GET'),
          
          
        );
        return SharedReport.fromJson(res.data as Map<String, dynamic>);
      });

  Future<MonitorListResponse> monitorsList() => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/monitors',
          options: Options(method: 'GET'),
          
          
        );
        return MonitorListResponse.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Monitor> monitorsCreate({required CreateMonitorBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/monitors',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return Monitor.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Monitor> monitorsUpdate({required String id, required UpdateMonitorBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/monitors/${Uri.encodeComponent(id)}',
          options: Options(method: 'PATCH'),
          
          data: body.toJson(),
        );
        return Monitor.fromJson(res.data as Map<String, dynamic>);
      });

  Future<Map<String, dynamic>> monitorsRemove({required String id}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/monitors/${Uri.encodeComponent(id)}',
          options: Options(method: 'DELETE'),
          
          
        );
        return res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      });

  Future<PauseMonitorResponse> monitorsPause({required PauseMonitorBody body}) => _call(() async {
        final res = await _dio.request<Object?>(
          '/v1/monitors/pause',
          options: Options(method: 'POST'),
          
          data: body.toJson(),
        );
        return PauseMonitorResponse.fromJson(res.data as Map<String, dynamic>);
      });
}
