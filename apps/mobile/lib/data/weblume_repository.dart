import '../api/generated/api.g.dart';
import '../api/generated/models.g.dart';
import 'local_cache.dart';

/// A value plus whether it came from the offline cache (the network was unreachable).
class Loaded<T> {
  const Loaded(this.data, {this.fromCache = false});
  final T data;
  final bool fromCache;
}

/// The app's single gateway to the Weblume API. Reads fall back to the local cache when offline;
/// writes never do (they need the server).
class WeblumeRepository {
  WeblumeRepository(this._api, this._cache);

  final WeblumeApi _api;
  final LocalCache _cache;

  Future<Loaded<T>> _cached<T>(
    String key,
    Future<T> Function() fetch,
    Map<String, dynamic> Function(T) toJson,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    try {
      final value = await fetch();
      await _cache.write(key, toJson(value));
      return Loaded(value);
    } on ApiException catch (e) {
      if (!e.isNetworkError) rethrow;
      final hit = await _cache.read(key);
      if (hit == null) rethrow;
      return Loaded(fromJson(hit), fromCache: true);
    }
  }

  Future<Loaded<Account>> account() => _cached('account', _api.accountMe, (a) => a.toJson(), Account.fromJson);

  /// First page (no search) is cached for offline use; other pages/searches need the network.
  Future<Loaded<ScanListResponse>> scans({String? q, String? before, int limit = 20}) {
    Future<ScanListResponse> fetch() => _api.scansList(q: q, before: before, limit: limit);
    if ((q != null && q.isNotEmpty) || before != null) return fetch().then(Loaded.new);
    return _cached('scans.$limit', fetch, (r) => r.toJson(), ScanListResponse.fromJson);
  }

  Future<Loaded<ScanReport>> report(String id) async {
    try {
      final r = await _api.scansGet(id: id);
      if (r.status != ScanSummaryStatus.queued && r.status != ScanSummaryStatus.running) {
        await _cache.writeReport(id, r.toJson());
      }
      return Loaded(r);
    } on ApiException catch (e) {
      if (!e.isNetworkError) rethrow;
      final hit = await _cache.read('report.$id');
      if (hit == null) rethrow;
      return Loaded(ScanReport.fromJson(hit), fromCache: true);
    }
  }

  Future<CreateScanResponse> createScan(String url) => _api.scansCreate(body: CreateScanBody(url: url));

  Future<CreateScanResponse> retryScan(String id) => _api.scansRetry(id: id);

  Future<Account> updateDisplayName(String? name) async {
    final a = await _api.accountUpdate(body: UpdateAccountBody(displayName: name));
    await _cache.write('account', a.toJson());
    return a;
  }

  Future<DeleteAccountResponse> deleteAccount() async {
    final res = await _api.accountDelete(body: const DeleteAccountBody(confirm: 'DELETE'));
    await _cache.clear();
    return res;
  }

  Future<void> clearCache() => _cache.clear();

  Future<BillingConfig> billingConfig() => _api.billingConfig();

  Future<List<Plan>> plans() => _api.plansList();

  /// Opaque id passed to Google Play as the obfuscated account id.
  Future<String> playAccountRef() async => (await _api.billingAccountRef()).accountRef;

  /// Server-side verification (and acknowledgement) of a Google Play purchase.
  Future<PlayVerifyResponse> verifyPlayPurchase(String purchaseToken) =>
      _api.billingVerify(body: PlayVerifyBody(purchaseToken: purchaseToken));
}
