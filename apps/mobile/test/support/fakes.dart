import 'dart:async';
import 'dart:typed_data';

import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/auth/auth_repository.dart';
import 'package:weblume/billing/billing_gateway.dart';
import 'package:weblume/data/weblume_repository.dart';

class FakeAuth implements AuthRepository {
  FakeAuth({this.configured = true, bool signedIn = false}) : _user = signedIn ? _asha : null;

  static const _asha = AppUser(id: 'u1', email: 'asha@example.com');

  @override
  final bool configured;
  AppUser? _user;
  final _events = StreamController<AuthEvent>.broadcast();
  final calls = <String>[];
  AuthFailure? signInError;
  bool signUpNeedsConfirmation = true;

  @override
  AppUser? get currentUser => _user;
  @override
  String? get accessToken => _user == null ? null : 'token';
  @override
  Stream<AuthEvent> get events => _events.stream;

  void emit(AuthEvent e) => _events.add(e);

  @override
  Future<void> signIn({required String email, required String password}) async {
    calls.add('signIn:$email');
    if (signInError != null) throw signInError!;
    _user = _asha;
    emit(AuthEvent.signedIn);
  }

  @override
  Future<bool> signUp({required String email, required String password}) async {
    calls.add('signUp:$email');
    return !signUpNeedsConfirmation;
  }

  @override
  Future<void> sendPasswordReset(String email) async => calls.add('reset:$email');

  @override
  Future<void> updatePassword(String password) async => calls.add('updatePassword');

  @override
  Future<void> signOut() async {
    calls.add('signOut');
    _user = null;
    emit(AuthEvent.signedOut);
  }
}

Account fakeAccount({int used = 2, int limit = 5, String? name}) => Account.fromJson({
  'id': 'u1',
  'email': 'asha@example.com',
  'displayName': name,
  'createdAt': '2026-10-01T00:00:00.000Z',
  'plan': {'id': 'free', 'name': 'Free', 'paid': false, 'source': 'default'},
  'entitlements': {
    'scansPerPeriod': limit,
    'quotaPeriod': 'calendar_month',
    'retentionDays': 30,
    'lighthouseData': true,
    'comparison': false,
    'pdfExport': false,
    'codeFixes': false,
    'shareLinks': false,
    'monitoredSites': 1,
    'monitorFrequency': 'weekly',
  },
  'usage': {
    'used': used,
    'limit': limit,
    'periodStart': '2026-10-01T00:00:00.000Z',
    'resetsAt': '2026-11-01T00:00:00.000Z',
  },
  'subscriptions': <Object>[],
});

Map<String, dynamic> summaryJson(String id, {String status = 'completed', String url = 'https://example.com/'}) => {
  'id': id,
  'targetUrl': url,
  'normalizedUrl': url,
  'finalUrl': url,
  'status': status,
  'failureCode': status == 'failed' ? 'dns_failure' : null,
  'failureMessage': status == 'failed' ? 'We couldn’t find that website. Check the address for typos.' : null,
  'severityCounts': {'high': 1, 'medium': 1},
  'createdAt': '2026-10-29T10:00:00.000Z',
  'completedAt': status == 'queued' || status == 'running' ? null : '2026-10-29T10:01:00.000Z',
};

Map<String, dynamic> reportJson(String id, {String status = 'completed', bool lighthouse = true}) => {
  ...summaryJson(id, status: status),
  'sources': {
    'page_fetch': {'status': 'ok'},
    'psi_mobile': lighthouse ? {'status': 'ok'} : {'status': 'failed', 'reason': 'quota_exceeded'},
    'psi_desktop': lighthouse ? {'status': 'ok'} : {'status': 'failed', 'reason': 'timeout'},
    'link_check': {'status': 'ok'},
    'robots_sitemap': {'status': 'ok'},
  },
  'lighthouse': lighthouse
      ? {
          'mobile': {
            'scores': {'performance': 61, 'accessibility': 88, 'seo': 92, 'bestPractices': 100},
            'metrics': {'largestContentfulPaint': 3200.5},
            'fetchedAt': '2026-10-29T10:00:30.000Z',
          },
        }
      : null,
  'passedChecks': ['seo.title.missing'],
  'expiresAt': '2026-11-28T10:00:00.000Z',
  'findings': status == 'failed' || status == 'queued' || status == 'running'
      ? <Object>[]
      : [
          {
            'id': 'f1',
            'checkId': 'tech.links.broken',
            'category': 'technical',
            'severity': 'high',
            'kind': 'detected',
            'source': 'link_check',
            'title': 'Some links on this page are broken',
            'whatItMeans': 'Some links point to pages that returned an error.',
            'whyItMatters': 'Visitors who click them hit a dead end.',
            'howToFix': ['Update each listed link to the correct address, or remove it.'],
            'details': {
              'count': 1,
              'broken': [
                {'url': 'https://example.com/old', 'status': 404},
              ],
            },
            'codeFixAvailable': false,
          },
          {
            'id': 'f2',
            'checkId': 'seo.meta_description.missing',
            'category': 'seo',
            'severity': 'medium',
            'kind': 'detected',
            'source': 'page_fetch',
            'title': 'Page has no meta description',
            'whatItMeans': 'The meta description is the short summary search engines may show.',
            'whyItMatters': 'Without one, search engines pick text from the page themselves.',
            'howToFix': ['Add a meta description tag.'],
            'learnMoreUrl': 'https://developers.google.com/search/docs/appearance/snippet',
            'details': <String, dynamic>{},
            'codeFixAvailable': true,
          },
        ],
};

/// Scriptable repository: queue responses per call; errors are thrown when the value is an Exception.
class FakeRepository implements WeblumeRepository {
  Object accountResult = Loaded(fakeAccount());
  Object scansResult = Loaded(ScanListResponse.fromJson({'items': <Object>[], 'nextCursor': null}));
  final Map<String, List<Object>> reports = {};
  Object createResult = CreateScanResponse.fromJson({
    'scan': summaryJson('s1', status: 'queued'),
    'deduplicated': false,
  });
  Object retryResult = CreateScanResponse.fromJson({
    'scan': summaryJson('s2', status: 'queued'),
    'deduplicated': false,
  });
  Object deleteResult = DeleteAccountResponse.fromJson({'status': 'deleted'});
  Object monitorsResult = Loaded(
    MonitorListResponse.fromJson({'items': <Object>[], 'limit': 1, 'fastestFrequency': 'weekly'}),
  );
  final calls = <String>[];

  T _ret<T>(Object v) => v is Exception ? throw v : v as T;

  @override
  Future<Loaded<Account>> account() async => _ret(accountResult);

  @override
  Future<Loaded<ScanListResponse>> scans({String? q, String? before, int limit = 20}) async {
    calls.add('scans:q=${q ?? ''}:before=${before ?? ''}');
    return _ret(scansResult);
  }

  @override
  Future<Loaded<ScanReport>> report(String id) async {
    calls.add('report:$id');
    final queue = reports[id] ?? (throw ApiException(statusCode: 404, code: 'not_found', message: 'Scan not found.'));
    final next = queue.length > 1 ? queue.removeAt(0) : queue.first;
    return _ret(next);
  }

  @override
  Future<Loaded<MonitorListResponse>> monitors() async {
    calls.add('monitors');
    return _ret(monitorsResult);
  }

  @override
  Future<CreateScanResponse> createScan(String url) async {
    calls.add('create:$url');
    return _ret(createResult);
  }

  @override
  Future<CreateScanResponse> retryScan(String id) async {
    calls.add('retry:$id');
    return _ret(retryResult);
  }

  @override
  Future<Account> updateDisplayName(String? name) async {
    calls.add('name:$name');
    return Account.fromJson({...(_ret<Loaded<Account>>(accountResult)).data.toJson(), 'displayName': name});
  }

  @override
  Future<DeleteAccountResponse> deleteAccount() async {
    calls.add('delete');
    return _ret(deleteResult);
  }

  @override
  Future<void> clearCache() async => calls.add('clearCache');

  Object billingConfigResult = fakeBillingConfig();
  Object verifyResult = PlayVerifyResponse.fromJson({
    'planId': 'starter',
    'status': 'active',
    'duplicateSubscription': false,
  });

  @override
  Future<BillingConfig> billingConfig() async => _ret(billingConfigResult);

  @override
  Future<List<Plan>> plans() async => [
    Plan.fromJson({
      'id': 'starter',
      'name': 'Starter',
      'paid': true,
      'entitlements': {
        'scansPerPeriod': 60,
        'quotaPeriod': 'billing_period',
        'retentionDays': 365,
        'lighthouseData': true,
        'comparison': true,
        'pdfExport': true,
        'codeFixes': true,
        'shareLinks': true,
        'monitoredSites': 5,
        'monitorFrequency': 'daily',
      },
    }),
  ];

  @override
  Future<String> playAccountRef() async {
    calls.add('accountRef');
    return 'ref-123';
  }

  @override
  Future<PlayVerifyResponse> verifyPlayPurchase(String purchaseToken) async {
    calls.add('verify:$purchaseToken');
    return _ret(verifyResult);
  }

  Object? compareResult;
  final shareLinks = <ShareLink>[];
  Object? createShareError;

  @override
  Future<ReportComparison> compare(String base, String target) async {
    calls.add('compare:$base:$target');
    return _ret(compareResult ?? comparisonJson(base, target));
  }

  @override
  Future<CreateShareResponse> createShare(String scanId, int expiresInDays) async {
    calls.add('share:$scanId:$expiresInDays');
    if (createShareError != null) _ret<void>(createShareError!);
    final link = ShareLink.fromJson({
      'id': 'sh${shareLinks.length + 1}',
      'scanId': scanId,
      'createdAt': '2026-10-30T10:00:00.000Z',
      'expiresAt': '2026-11-29T10:00:00.000Z',
      'revokedAt': null,
      'active': true,
    });
    shareLinks.add(link);
    return CreateShareResponse(share: link, token: 'tok', url: 'https://weblume.test/r/tok');
  }

  @override
  Future<List<ShareLink>> shares(String scanId) async => List.of(shareLinks);

  @override
  Future<Uint8List> reportPdf(String scanId) async {
    calls.add('pdf:$scanId');
    return Uint8List.fromList('%PDF-1.7'.codeUnits);
  }

  @override
  Future<void> revokeShare(String shareId) async {
    calls.add('revoke:$shareId');
    shareLinks.removeWhere((l) => l.id == shareId);
  }
}

Account starterAccount() => Account.fromJson({
  ...fakeAccount().toJson(),
  'plan': {'id': 'starter', 'name': 'Starter', 'paid': true, 'source': 'subscription'},
  'entitlements': {
    'scansPerPeriod': 60,
    'quotaPeriod': 'billing_period',
    'retentionDays': 365,
    'lighthouseData': true,
    'comparison': true,
    'pdfExport': true,
    'codeFixes': true,
    'shareLinks': true,
    'monitoredSites': 5,
    'monitorFrequency': 'daily',
  },
});

ReportComparison comparisonJson(String base, String target) {
  final r = reportJson(target);
  final findings = (r['findings'] as List).cast<Map<String, dynamic>>();
  Map<String, dynamic> delta(int? b, int? a) => {
    'before': b,
    'after': a,
    'delta': a != null && b != null ? a - b : null,
  };
  return ReportComparison.fromJson({
    'base': {...summaryJson(base), 'createdAt': '2026-10-20T10:00:00.000Z'},
    'target': summaryJson(target),
    'scores': {
      'mobile': {
        'performance': delta(40, 61),
        'accessibility': delta(88, 88),
        'seo': delta(null, 92),
        'bestPractices': delta(100, 100),
      },
    },
    'newFindings': [findings[0]],
    'resolvedFindings': [
      {...findings[1], 'id': 'old1', 'title': 'Page title is missing', 'checkId': 'seo.title.missing'},
    ],
    'unchangedFindings': [
      {'finding': findings[1], 'previousSeverity': 'high'},
    ],
    'notComparable': <Object>[],
    'severityDelta': {'high': 1},
  });
}

BillingConfig fakeBillingConfig({bool enabled = true, bool play = true}) => BillingConfig.fromJson({
  'enabled': enabled,
  'web': {
    'provider': 'paddle',
    'available': enabled,
    'intervals': ['monthly', 'annual'],
  },
  'googlePlay': {'available': enabled && play, 'packageName': 'com.weblume.app', 'subscriptionId': 'weblume_starter'},
});

Map<String, dynamic> subscriptionJson({String provider = 'google_play', String status = 'active'}) => {
  'provider': provider,
  'planId': 'starter',
  'status': status,
  'currentPeriodEnd': DateTime.now().add(const Duration(days: 20)).toUtc().toIso8601String(),
  'cancelAtPeriodEnd': false,
};

Account accountWithSubs(List<Map<String, dynamic>> subs) => Account.fromJson({
  ...fakeAccount().toJson(),
  'subscriptions': subs,
  'plan': {'id': 'starter', 'name': 'Starter', 'paid': true, 'source': 'subscription'},
});

class FakeBillingGateway implements BillingGateway {
  bool available = true;
  List<StoreOffer> offers = const [
    StoreOffer(basePlanId: 'monthly', interval: StoreInterval.monthly, price: '₹149.00'),
    StoreOffer(basePlanId: 'annual', interval: StoreInterval.annual, price: '₹1,199.00'),
  ];
  final _updates = StreamController<StorePurchaseUpdate>.broadcast();
  final bought = <String>[];
  final completed = <String?>[];
  int restores = 0;

  void emit(StorePurchaseUpdate u) => _updates.add(u);

  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<List<StoreOffer>> loadOffers(String productId) async => offers;
  @override
  Future<void> buy(StoreOffer offer, {required String accountRef}) async =>
      bought.add('${offer.basePlanId}:$accountRef');
  @override
  Stream<StorePurchaseUpdate> get purchases => _updates.stream;
  @override
  Future<void> complete(StorePurchaseUpdate update) async => completed.add(update.purchaseToken);
  @override
  Future<void> restore() async => restores++;
}

Loaded<ScanReport> loadedReport(
  String id, {
  String status = 'completed',
  bool lighthouse = true,
  bool fromCache = false,
}) => Loaded(
  ScanReport.fromJson(reportJson(id, status: status, lighthouse: lighthouse)),
  fromCache: fromCache,
);

Map<String, dynamic> monitorJson(
  String id, {
  String url = 'https://example.com/',
  String frequency = 'weekly',
  bool enabled = true,
  String? skip,
  Map<String, dynamic>? lastScan,
}) => {
  'id': id,
  'targetUrl': url,
  'normalizedUrl': url,
  'frequency': frequency,
  'alert': 'any_change',
  'enabled': enabled,
  'nextRunAt': '2026-11-05T10:00:00.000Z',
  'lastRunAt': null,
  'lastDigestAt': null,
  'lastSkipReason': skip,
  'lastScan': lastScan,
  'createdAt': '2026-10-29T10:00:00.000Z',
};
