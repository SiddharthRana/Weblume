// GENERATED FILE — do not edit. Source: apps/api/openapi.json (run `pnpm openapi`).
// ignore_for_file: type=lint, unused_import

enum EntitlementsQuotaPeriod {
  day('day'),
  calendarMonth('calendar_month'),
  billingPeriod('billing_period'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const EntitlementsQuotaPeriod(this.value);
  final String value;

  static EntitlementsQuotaPeriod fromJson(Object? json) =>
      EntitlementsQuotaPeriod.values.firstWhere((e) => e.value == json, orElse: () => EntitlementsQuotaPeriod.unknown);
}

enum DisplayPriceCurrency {
  iNR('INR'),
  uSD('USD'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const DisplayPriceCurrency(this.value);
  final String value;

  static DisplayPriceCurrency fromJson(Object? json) =>
      DisplayPriceCurrency.values.firstWhere((e) => e.value == json, orElse: () => DisplayPriceCurrency.unknown);
}

enum PlanId {
  guest('guest'),
  free('free'),
  starter('starter'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const PlanId(this.value);
  final String value;

  static PlanId fromJson(Object? json) =>
      PlanId.values.firstWhere((e) => e.value == json, orElse: () => PlanId.unknown);
}

enum ScanSummaryStatus {
  queued('queued'),
  running('running'),
  completed('completed'),
  partial('partial'),
  failed('failed'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const ScanSummaryStatus(this.value);
  final String value;

  static ScanSummaryStatus fromJson(Object? json) =>
      ScanSummaryStatus.values.firstWhere((e) => e.value == json, orElse: () => ScanSummaryStatus.unknown);
}

enum ScanSummaryFailureCode {
  invalidUrl('invalid_url'),
  blockedDestination('blocked_destination'),
  dnsFailure('dns_failure'),
  connectionFailed('connection_failed'),
  tlsError('tls_error'),
  timeout('timeout'),
  tooManyRedirects('too_many_redirects'),
  responseTooLarge('response_too_large'),
  notHtml('not_html'),
  httpError('http_error'),
  internalError('internal_error'),
  scanTimeout('scan_timeout'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const ScanSummaryFailureCode(this.value);
  final String value;

  static ScanSummaryFailureCode fromJson(Object? json) =>
      ScanSummaryFailureCode.values.firstWhere((e) => e.value == json, orElse: () => ScanSummaryFailureCode.unknown);
}

enum SourceStatusStatus {
  ok('ok'),
  skipped('skipped'),
  failed('failed'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const SourceStatusStatus(this.value);
  final String value;

  static SourceStatusStatus fromJson(Object? json) =>
      SourceStatusStatus.values.firstWhere((e) => e.value == json, orElse: () => SourceStatusStatus.unknown);
}

enum SourceStatusReason {
  notConfigured('not_configured'),
  disabled('disabled'),
  notApplicable('not_applicable'),
  timeout('timeout'),
  quotaExceeded('quota_exceeded'),
  upstreamError('upstream_error'),
  blocked('blocked'),
  invalidResponse('invalid_response'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const SourceStatusReason(this.value);
  final String value;

  static SourceStatusReason fromJson(Object? json) =>
      SourceStatusReason.values.firstWhere((e) => e.value == json, orElse: () => SourceStatusReason.unknown);
}

enum CodeSnippetLanguage {
  html('html'),
  xml('xml'),
  nginx('nginx'),
  apache('apache'),
  text('text'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const CodeSnippetLanguage(this.value);
  final String value;

  static CodeSnippetLanguage fromJson(Object? json) =>
      CodeSnippetLanguage.values.firstWhere((e) => e.value == json, orElse: () => CodeSnippetLanguage.unknown);
}

enum FindingCategory {
  performance('performance'),
  seo('seo'),
  accessibility('accessibility'),
  technical('technical'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const FindingCategory(this.value);
  final String value;

  static FindingCategory fromJson(Object? json) =>
      FindingCategory.values.firstWhere((e) => e.value == json, orElse: () => FindingCategory.unknown);
}

enum FindingSeverity {
  critical('critical'),
  high('high'),
  medium('medium'),
  low('low'),
  info('info'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const FindingSeverity(this.value);
  final String value;

  static FindingSeverity fromJson(Object? json) =>
      FindingSeverity.values.firstWhere((e) => e.value == json, orElse: () => FindingSeverity.unknown);
}

enum FindingKind {
  measured('measured'),
  detected('detected'),
  recommendation('recommendation'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const FindingKind(this.value);
  final String value;

  static FindingKind fromJson(Object? json) =>
      FindingKind.values.firstWhere((e) => e.value == json, orElse: () => FindingKind.unknown);
}

enum FindingSource {
  pageFetch('page_fetch'),
  psiMobile('psi_mobile'),
  psiDesktop('psi_desktop'),
  linkCheck('link_check'),
  robotsSitemap('robots_sitemap'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const FindingSource(this.value);
  final String value;

  static FindingSource fromJson(Object? json) =>
      FindingSource.values.firstWhere((e) => e.value == json, orElse: () => FindingSource.unknown);
}

enum AccountPlanSource {
  default_('default'),
  subscription('subscription'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const AccountPlanSource(this.value);
  final String value;

  static AccountPlanSource fromJson(Object? json) =>
      AccountPlanSource.values.firstWhere((e) => e.value == json, orElse: () => AccountPlanSource.unknown);
}

enum AccountSubscriptionStatus {
  trialing('trialing'),
  active('active'),
  gracePeriod('grace_period'),
  onHold('on_hold'),
  paused('paused'),
  canceled('canceled'),
  expired('expired'),
  refunded('refunded'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const AccountSubscriptionStatus(this.value);
  final String value;

  static AccountSubscriptionStatus fromJson(Object? json) =>
      AccountSubscriptionStatus.values.firstWhere((e) => e.value == json, orElse: () => AccountSubscriptionStatus.unknown);
}

enum DeleteAccountResponseStatus {
  deleted('deleted'),
  pending('pending'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const DeleteAccountResponseStatus(this.value);
  final String value;

  static DeleteAccountResponseStatus fromJson(Object? json) =>
      DeleteAccountResponseStatus.values.firstWhere((e) => e.value == json, orElse: () => DeleteAccountResponseStatus.unknown);
}

enum WebBillingProvider {
  none('none'),
  paddle('paddle'),
  dodo('dodo'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const WebBillingProvider(this.value);
  final String value;

  static WebBillingProvider fromJson(Object? json) =>
      WebBillingProvider.values.firstWhere((e) => e.value == json, orElse: () => WebBillingProvider.unknown);
}

enum WebBillingInterval {
  monthly('monthly'),
  annual('annual'),
  /// A value this app version doesn't know yet.
  unknown('unknown');

  const WebBillingInterval(this.value);
  final String value;

  static WebBillingInterval fromJson(Object? json) =>
      WebBillingInterval.values.firstWhere((e) => e.value == json, orElse: () => WebBillingInterval.unknown);
}

class Health {
  const Health({
    required this.status,
  });

  final String status;

  factory Health.fromJson(Map<String, dynamic> json) => Health(
      status: json['status'] as String,
      );

  Map<String, dynamic> toJson() => {
      'status': status,
      };
}

class Entitlements {
  const Entitlements({
    required this.scansPerPeriod,
    required this.quotaPeriod,
    required this.retentionDays,
    required this.lighthouseData,
    required this.comparison,
    required this.pdfExport,
    required this.codeFixes,
    required this.shareLinks,
  });

  final int scansPerPeriod;
  final EntitlementsQuotaPeriod quotaPeriod;
  final int retentionDays;
  final bool lighthouseData;
  final bool comparison;
  final bool pdfExport;
  final bool codeFixes;
  final bool shareLinks;

  factory Entitlements.fromJson(Map<String, dynamic> json) => Entitlements(
      scansPerPeriod: (json['scansPerPeriod'] as num).toInt(),
      quotaPeriod: EntitlementsQuotaPeriod.fromJson(json['quotaPeriod']),
      retentionDays: (json['retentionDays'] as num).toInt(),
      lighthouseData: json['lighthouseData'] as bool,
      comparison: json['comparison'] as bool,
      pdfExport: json['pdfExport'] as bool,
      codeFixes: json['codeFixes'] as bool,
      shareLinks: json['shareLinks'] as bool,
      );

  Map<String, dynamic> toJson() => {
      'scansPerPeriod': scansPerPeriod,
      'quotaPeriod': quotaPeriod.value,
      'retentionDays': retentionDays,
      'lighthouseData': lighthouseData,
      'comparison': comparison,
      'pdfExport': pdfExport,
      'codeFixes': codeFixes,
      'shareLinks': shareLinks,
      };
}

class DisplayPrice {
  const DisplayPrice({
    required this.currency,
    required this.monthly,
    required this.annual,
  });

  final DisplayPriceCurrency currency;
  /// Monthly price in minor units (paise/cents)
  final int monthly;
  /// Annual price in minor units (paise/cents)
  final int annual;

  factory DisplayPrice.fromJson(Map<String, dynamic> json) => DisplayPrice(
      currency: DisplayPriceCurrency.fromJson(json['currency']),
      monthly: (json['monthly'] as num).toInt(),
      annual: (json['annual'] as num).toInt(),
      );

  Map<String, dynamic> toJson() => {
      'currency': currency.value,
      'monthly': monthly,
      'annual': annual,
      };
}

class Plan {
  const Plan({
    required this.id,
    required this.name,
    required this.paid,
    required this.entitlements,
    this.displayPrices,
  });

  final PlanId id;
  final String name;
  final bool paid;
  final Entitlements entitlements;
  /// Indicative prices only; the charged amount comes from the payment provider.
  final List<DisplayPrice>? displayPrices;

  factory Plan.fromJson(Map<String, dynamic> json) => Plan(
      id: PlanId.fromJson(json['id']),
      name: json['name'] as String,
      paid: json['paid'] as bool,
      entitlements: Entitlements.fromJson(json['entitlements'] as Map<String, dynamic>),
      displayPrices: json['displayPrices'] == null ? null : (json['displayPrices'] as List<dynamic>).map((e) => DisplayPrice.fromJson(e as Map<String, dynamic>)).toList(),
      );

  Map<String, dynamic> toJson() => {
      'id': id.value,
      'name': name,
      'paid': paid,
      'entitlements': entitlements.toJson(),
      if (displayPrices != null) 'displayPrices': displayPrices!.map((e) => e.toJson()).toList(),
      };
}

class CreateScanBody {
  const CreateScanBody({
    required this.url,
    this.turnstileToken,
  });

  final String url;
  /// Cloudflare Turnstile token. Required for guest (signed-out) scans.
  final String? turnstileToken;

  factory CreateScanBody.fromJson(Map<String, dynamic> json) => CreateScanBody(
      url: json['url'] as String,
      turnstileToken: json['turnstileToken'] == null ? null : json['turnstileToken'] as String,
      );

  Map<String, dynamic> toJson() => {
      'url': url,
      if (turnstileToken != null) 'turnstileToken': turnstileToken!,
      };
}

class SeverityCounts {
  const SeverityCounts({
    this.critical,
    this.high,
    this.medium,
    this.low,
    this.info,
  });

  final int? critical;
  final int? high;
  final int? medium;
  final int? low;
  final int? info;

  factory SeverityCounts.fromJson(Map<String, dynamic> json) => SeverityCounts(
      critical: json['critical'] == null ? null : (json['critical'] as num).toInt(),
      high: json['high'] == null ? null : (json['high'] as num).toInt(),
      medium: json['medium'] == null ? null : (json['medium'] as num).toInt(),
      low: json['low'] == null ? null : (json['low'] as num).toInt(),
      info: json['info'] == null ? null : (json['info'] as num).toInt(),
      );

  Map<String, dynamic> toJson() => {
      if (critical != null) 'critical': critical!,
      if (high != null) 'high': high!,
      if (medium != null) 'medium': medium!,
      if (low != null) 'low': low!,
      if (info != null) 'info': info!,
      };
}

class ScanSummary {
  const ScanSummary({
    required this.id,
    required this.targetUrl,
    required this.normalizedUrl,
    required this.finalUrl,
    required this.status,
    required this.failureCode,
    required this.failureMessage,
    required this.severityCounts,
    required this.createdAt,
    required this.completedAt,
  });

  final String id;
  final String targetUrl;
  final String normalizedUrl;
  final String? finalUrl;
  final ScanSummaryStatus status;
  final ScanSummaryFailureCode? failureCode;
  final String? failureMessage;
  final SeverityCounts severityCounts;
  final DateTime createdAt;
  final DateTime? completedAt;

  factory ScanSummary.fromJson(Map<String, dynamic> json) => ScanSummary(
      id: json['id'] as String,
      targetUrl: json['targetUrl'] as String,
      normalizedUrl: json['normalizedUrl'] as String,
      finalUrl: json['finalUrl'] == null ? null : json['finalUrl'] as String,
      status: ScanSummaryStatus.fromJson(json['status']),
      failureCode: json['failureCode'] == null ? null : ScanSummaryFailureCode.fromJson(json['failureCode']),
      failureMessage: json['failureMessage'] == null ? null : json['failureMessage'] as String,
      severityCounts: SeverityCounts.fromJson(json['severityCounts'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] == null ? null : DateTime.parse(json['completedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
      'id': id,
      'targetUrl': targetUrl,
      'normalizedUrl': normalizedUrl,
      'finalUrl': finalUrl == null ? null : finalUrl!,
      'status': status.value,
      'failureCode': failureCode == null ? null : failureCode!.value,
      'failureMessage': failureMessage == null ? null : failureMessage!,
      'severityCounts': severityCounts.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt == null ? null : completedAt!.toIso8601String(),
      };
}

class CreateScanResponse {
  const CreateScanResponse({
    required this.scan,
    this.scanToken,
    required this.deduplicated,
  });

  final ScanSummary scan;
  /// Guest scans only: secret required to view the scan (send as X-Scan-Token). Shown once.
  final String? scanToken;
  /// True when an identical recent scan was returned instead of starting a new one
  final bool deduplicated;

  factory CreateScanResponse.fromJson(Map<String, dynamic> json) => CreateScanResponse(
      scan: ScanSummary.fromJson(json['scan'] as Map<String, dynamic>),
      scanToken: json['scanToken'] == null ? null : json['scanToken'] as String,
      deduplicated: json['deduplicated'] as bool,
      );

  Map<String, dynamic> toJson() => {
      'scan': scan.toJson(),
      if (scanToken != null) 'scanToken': scanToken!,
      'deduplicated': deduplicated,
      };
}

class ApiErrorBody {
  const ApiErrorBody({
    required this.statusCode,
    required this.code,
    required this.message,
  });

  final int statusCode;
  final String code;
  final String message;

  factory ApiErrorBody.fromJson(Map<String, dynamic> json) => ApiErrorBody(
      statusCode: (json['statusCode'] as num).toInt(),
      code: json['code'] as String,
      message: json['message'] as String,
      );

  Map<String, dynamic> toJson() => {
      'statusCode': statusCode,
      'code': code,
      'message': message,
      };
}

class ScanListResponse {
  const ScanListResponse({
    required this.items,
    required this.nextCursor,
  });

  final List<ScanSummary> items;
  final DateTime? nextCursor;

  factory ScanListResponse.fromJson(Map<String, dynamic> json) => ScanListResponse(
      items: (json['items'] as List<dynamic>).map((e) => ScanSummary.fromJson(e as Map<String, dynamic>)).toList(),
      nextCursor: json['nextCursor'] == null ? null : DateTime.parse(json['nextCursor'] as String),
      );

  Map<String, dynamic> toJson() => {
      'items': items.map((e) => e.toJson()).toList(),
      'nextCursor': nextCursor == null ? null : nextCursor!.toIso8601String(),
      };
}

class SourceStatus {
  const SourceStatus({
    required this.status,
    this.reason,
  });

  final SourceStatusStatus status;
  final SourceStatusReason? reason;

  factory SourceStatus.fromJson(Map<String, dynamic> json) => SourceStatus(
      status: SourceStatusStatus.fromJson(json['status']),
      reason: json['reason'] == null ? null : SourceStatusReason.fromJson(json['reason']),
      );

  Map<String, dynamic> toJson() => {
      'status': status.value,
      if (reason != null) 'reason': reason!.value,
      };
}

class ScanSources {
  const ScanSources({
    this.pageFetch,
    this.psiMobile,
    this.psiDesktop,
    this.linkCheck,
    this.robotsSitemap,
  });

  final SourceStatus? pageFetch;
  final SourceStatus? psiMobile;
  final SourceStatus? psiDesktop;
  final SourceStatus? linkCheck;
  final SourceStatus? robotsSitemap;

  factory ScanSources.fromJson(Map<String, dynamic> json) => ScanSources(
      pageFetch: json['page_fetch'] == null ? null : SourceStatus.fromJson(json['page_fetch'] as Map<String, dynamic>),
      psiMobile: json['psi_mobile'] == null ? null : SourceStatus.fromJson(json['psi_mobile'] as Map<String, dynamic>),
      psiDesktop: json['psi_desktop'] == null ? null : SourceStatus.fromJson(json['psi_desktop'] as Map<String, dynamic>),
      linkCheck: json['link_check'] == null ? null : SourceStatus.fromJson(json['link_check'] as Map<String, dynamic>),
      robotsSitemap: json['robots_sitemap'] == null ? null : SourceStatus.fromJson(json['robots_sitemap'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      if (pageFetch != null) 'page_fetch': pageFetch!.toJson(),
      if (psiMobile != null) 'psi_mobile': psiMobile!.toJson(),
      if (psiDesktop != null) 'psi_desktop': psiDesktop!.toJson(),
      if (linkCheck != null) 'link_check': linkCheck!.toJson(),
      if (robotsSitemap != null) 'robots_sitemap': robotsSitemap!.toJson(),
      };
}

class LighthouseScores {
  const LighthouseScores({
    required this.performance,
    required this.accessibility,
    required this.seo,
    required this.bestPractices,
  });

  final int? performance;
  final int? accessibility;
  final int? seo;
  final int? bestPractices;

  factory LighthouseScores.fromJson(Map<String, dynamic> json) => LighthouseScores(
      performance: json['performance'] == null ? null : (json['performance'] as num).toInt(),
      accessibility: json['accessibility'] == null ? null : (json['accessibility'] as num).toInt(),
      seo: json['seo'] == null ? null : (json['seo'] as num).toInt(),
      bestPractices: json['bestPractices'] == null ? null : (json['bestPractices'] as num).toInt(),
      );

  Map<String, dynamic> toJson() => {
      'performance': performance == null ? null : performance!,
      'accessibility': accessibility == null ? null : accessibility!,
      'seo': seo == null ? null : seo!,
      'bestPractices': bestPractices == null ? null : bestPractices!,
      };
}

class LighthouseMetrics {
  const LighthouseMetrics({
    this.firstContentfulPaint,
    this.largestContentfulPaint,
    this.totalBlockingTime,
    this.cumulativeLayoutShift,
    this.speedIndex,
  });

  /// Milliseconds
  final double? firstContentfulPaint;
  /// Milliseconds
  final double? largestContentfulPaint;
  /// Milliseconds
  final double? totalBlockingTime;
  /// Unitless
  final double? cumulativeLayoutShift;
  /// Milliseconds
  final double? speedIndex;

  factory LighthouseMetrics.fromJson(Map<String, dynamic> json) => LighthouseMetrics(
      firstContentfulPaint: json['firstContentfulPaint'] == null ? null : (json['firstContentfulPaint'] as num).toDouble(),
      largestContentfulPaint: json['largestContentfulPaint'] == null ? null : (json['largestContentfulPaint'] as num).toDouble(),
      totalBlockingTime: json['totalBlockingTime'] == null ? null : (json['totalBlockingTime'] as num).toDouble(),
      cumulativeLayoutShift: json['cumulativeLayoutShift'] == null ? null : (json['cumulativeLayoutShift'] as num).toDouble(),
      speedIndex: json['speedIndex'] == null ? null : (json['speedIndex'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
      if (firstContentfulPaint != null) 'firstContentfulPaint': firstContentfulPaint!,
      if (largestContentfulPaint != null) 'largestContentfulPaint': largestContentfulPaint!,
      if (totalBlockingTime != null) 'totalBlockingTime': totalBlockingTime!,
      if (cumulativeLayoutShift != null) 'cumulativeLayoutShift': cumulativeLayoutShift!,
      if (speedIndex != null) 'speedIndex': speedIndex!,
      };
}

class LighthouseResult {
  const LighthouseResult({
    required this.scores,
    required this.metrics,
    this.lighthouseVersion,
    required this.fetchedAt,
  });

  final LighthouseScores scores;
  final LighthouseMetrics metrics;
  final String? lighthouseVersion;
  final DateTime fetchedAt;

  factory LighthouseResult.fromJson(Map<String, dynamic> json) => LighthouseResult(
      scores: LighthouseScores.fromJson(json['scores'] as Map<String, dynamic>),
      metrics: LighthouseMetrics.fromJson(json['metrics'] as Map<String, dynamic>),
      lighthouseVersion: json['lighthouseVersion'] == null ? null : json['lighthouseVersion'] as String,
      fetchedAt: DateTime.parse(json['fetchedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
      'scores': scores.toJson(),
      'metrics': metrics.toJson(),
      if (lighthouseVersion != null) 'lighthouseVersion': lighthouseVersion!,
      'fetchedAt': fetchedAt.toIso8601String(),
      };
}

class LighthouseByStrategy {
  const LighthouseByStrategy({
    this.mobile,
    this.desktop,
  });

  final LighthouseResult? mobile;
  final LighthouseResult? desktop;

  factory LighthouseByStrategy.fromJson(Map<String, dynamic> json) => LighthouseByStrategy(
      mobile: json['mobile'] == null ? null : LighthouseResult.fromJson(json['mobile'] as Map<String, dynamic>),
      desktop: json['desktop'] == null ? null : LighthouseResult.fromJson(json['desktop'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      if (mobile != null) 'mobile': mobile!.toJson(),
      if (desktop != null) 'desktop': desktop!.toJson(),
      };
}

class CodeSnippet {
  const CodeSnippet({
    required this.label,
    required this.language,
    required this.code,
  });

  /// Where the code goes, e.g. "In the page’s <head>" or "nginx"
  final String label;
  final CodeSnippetLanguage language;
  final String code;

  factory CodeSnippet.fromJson(Map<String, dynamic> json) => CodeSnippet(
      label: json['label'] as String,
      language: CodeSnippetLanguage.fromJson(json['language']),
      code: json['code'] as String,
      );

  Map<String, dynamic> toJson() => {
      'label': label,
      'language': language.value,
      'code': code,
      };
}

class CodeFix {
  const CodeFix({
    required this.snippets,
    this.note,
  });

  final List<CodeSnippet> snippets;
  final String? note;

  factory CodeFix.fromJson(Map<String, dynamic> json) => CodeFix(
      snippets: (json['snippets'] as List<dynamic>).map((e) => CodeSnippet.fromJson(e as Map<String, dynamic>)).toList(),
      note: json['note'] == null ? null : json['note'] as String,
      );

  Map<String, dynamic> toJson() => {
      'snippets': snippets.map((e) => e.toJson()).toList(),
      if (note != null) 'note': note!,
      };
}

class Finding {
  const Finding({
    required this.id,
    required this.checkId,
    required this.category,
    required this.severity,
    required this.kind,
    required this.source,
    required this.title,
    required this.whatItMeans,
    required this.whyItMatters,
    required this.howToFix,
    this.learnMoreUrl,
    required this.details,
    required this.codeFixAvailable,
    this.codeFix,
  });

  final String id;
  /// Stable check identifier, e.g. seo.title.missing or lighthouse.<audit-id>
  final String checkId;
  final FindingCategory category;
  final FindingSeverity severity;
  final FindingKind kind;
  final FindingSource source;
  final String title;
  final String whatItMeans;
  final String whyItMatters;
  final List<String> howToFix;
  final String? learnMoreUrl;
  final Map<String, dynamic> details;
  /// Whether a code fix exists for this finding, even if this plan doesn’t include it
  final bool codeFixAvailable;
  /// Only on plans with code fixes
  final CodeFix? codeFix;

  factory Finding.fromJson(Map<String, dynamic> json) => Finding(
      id: json['id'] as String,
      checkId: json['checkId'] as String,
      category: FindingCategory.fromJson(json['category']),
      severity: FindingSeverity.fromJson(json['severity']),
      kind: FindingKind.fromJson(json['kind']),
      source: FindingSource.fromJson(json['source']),
      title: json['title'] as String,
      whatItMeans: json['whatItMeans'] as String,
      whyItMatters: json['whyItMatters'] as String,
      howToFix: (json['howToFix'] as List<dynamic>).map((e) => e as String).toList(),
      learnMoreUrl: json['learnMoreUrl'] == null ? null : json['learnMoreUrl'] as String,
      details: Map<String, dynamic>.from(json['details'] as Map),
      codeFixAvailable: json['codeFixAvailable'] as bool,
      codeFix: json['codeFix'] == null ? null : CodeFix.fromJson(json['codeFix'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      'id': id,
      'checkId': checkId,
      'category': category.value,
      'severity': severity.value,
      'kind': kind.value,
      'source': source.value,
      'title': title,
      'whatItMeans': whatItMeans,
      'whyItMatters': whyItMatters,
      'howToFix': howToFix.map((e) => e).toList(),
      if (learnMoreUrl != null) 'learnMoreUrl': learnMoreUrl!,
      'details': details,
      'codeFixAvailable': codeFixAvailable,
      if (codeFix != null) 'codeFix': codeFix!.toJson(),
      };
}

class ScanReport {
  const ScanReport({
    required this.id,
    required this.targetUrl,
    required this.normalizedUrl,
    required this.finalUrl,
    required this.status,
    required this.failureCode,
    required this.failureMessage,
    required this.severityCounts,
    required this.createdAt,
    required this.completedAt,
    required this.sources,
    required this.lighthouse,
    required this.passedChecks,
    required this.findings,
    required this.expiresAt,
  });

  final String id;
  final String targetUrl;
  final String normalizedUrl;
  final String? finalUrl;
  final ScanSummaryStatus status;
  final ScanSummaryFailureCode? failureCode;
  final String? failureMessage;
  final SeverityCounts severityCounts;
  final DateTime createdAt;
  final DateTime? completedAt;
  /// Outcome of each data source
  final ScanSources sources;
  /// Lighthouse results from Google PageSpeed Insights; null when unavailable
  final LighthouseByStrategy? lighthouse;
  final List<String> passedChecks;
  final List<Finding> findings;
  final DateTime expiresAt;

  factory ScanReport.fromJson(Map<String, dynamic> json) => ScanReport(
      id: json['id'] as String,
      targetUrl: json['targetUrl'] as String,
      normalizedUrl: json['normalizedUrl'] as String,
      finalUrl: json['finalUrl'] == null ? null : json['finalUrl'] as String,
      status: ScanSummaryStatus.fromJson(json['status']),
      failureCode: json['failureCode'] == null ? null : ScanSummaryFailureCode.fromJson(json['failureCode']),
      failureMessage: json['failureMessage'] == null ? null : json['failureMessage'] as String,
      severityCounts: SeverityCounts.fromJson(json['severityCounts'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] == null ? null : DateTime.parse(json['completedAt'] as String),
      sources: ScanSources.fromJson(json['sources'] as Map<String, dynamic>),
      lighthouse: json['lighthouse'] == null ? null : LighthouseByStrategy.fromJson(json['lighthouse'] as Map<String, dynamic>),
      passedChecks: (json['passedChecks'] as List<dynamic>).map((e) => e as String).toList(),
      findings: (json['findings'] as List<dynamic>).map((e) => Finding.fromJson(e as Map<String, dynamic>)).toList(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      );

  Map<String, dynamic> toJson() => {
      'id': id,
      'targetUrl': targetUrl,
      'normalizedUrl': normalizedUrl,
      'finalUrl': finalUrl == null ? null : finalUrl!,
      'status': status.value,
      'failureCode': failureCode == null ? null : failureCode!.value,
      'failureMessage': failureMessage == null ? null : failureMessage!,
      'severityCounts': severityCounts.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt == null ? null : completedAt!.toIso8601String(),
      'sources': sources.toJson(),
      'lighthouse': lighthouse == null ? null : lighthouse!.toJson(),
      'passedChecks': passedChecks.map((e) => e).toList(),
      'findings': findings.map((e) => e.toJson()).toList(),
      'expiresAt': expiresAt.toIso8601String(),
      };
}

class AccountPlan {
  const AccountPlan({
    required this.id,
    required this.name,
    required this.paid,
    required this.source,
  });

  final PlanId id;
  final String name;
  final bool paid;
  final AccountPlanSource source;

  factory AccountPlan.fromJson(Map<String, dynamic> json) => AccountPlan(
      id: PlanId.fromJson(json['id']),
      name: json['name'] as String,
      paid: json['paid'] as bool,
      source: AccountPlanSource.fromJson(json['source']),
      );

  Map<String, dynamic> toJson() => {
      'id': id.value,
      'name': name,
      'paid': paid,
      'source': source.value,
      };
}

class Usage {
  const Usage({
    required this.used,
    required this.limit,
    required this.periodStart,
    required this.resetsAt,
  });

  final int used;
  final int limit;
  final DateTime periodStart;
  final DateTime resetsAt;

  factory Usage.fromJson(Map<String, dynamic> json) => Usage(
      used: (json['used'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      periodStart: DateTime.parse(json['periodStart'] as String),
      resetsAt: DateTime.parse(json['resetsAt'] as String),
      );

  Map<String, dynamic> toJson() => {
      'used': used,
      'limit': limit,
      'periodStart': periodStart.toIso8601String(),
      'resetsAt': resetsAt.toIso8601String(),
      };
}

class AccountSubscription {
  const AccountSubscription({
    required this.provider,
    required this.planId,
    required this.status,
    required this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
  });

  final String provider;
  final PlanId planId;
  final AccountSubscriptionStatus status;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;

  factory AccountSubscription.fromJson(Map<String, dynamic> json) => AccountSubscription(
      provider: json['provider'] as String,
      planId: PlanId.fromJson(json['planId']),
      status: AccountSubscriptionStatus.fromJson(json['status']),
      currentPeriodEnd: json['currentPeriodEnd'] == null ? null : DateTime.parse(json['currentPeriodEnd'] as String),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] as bool,
      );

  Map<String, dynamic> toJson() => {
      'provider': provider,
      'planId': planId.value,
      'status': status.value,
      'currentPeriodEnd': currentPeriodEnd == null ? null : currentPeriodEnd!.toIso8601String(),
      'cancelAtPeriodEnd': cancelAtPeriodEnd,
      };
}

class Account {
  const Account({
    required this.id,
    this.email,
    required this.displayName,
    required this.createdAt,
    required this.plan,
    required this.entitlements,
    required this.usage,
    required this.subscriptions,
  });

  final String id;
  final String? email;
  final String? displayName;
  final DateTime createdAt;
  final AccountPlan plan;
  final Entitlements entitlements;
  final Usage usage;
  final List<AccountSubscription> subscriptions;

  factory Account.fromJson(Map<String, dynamic> json) => Account(
      id: json['id'] as String,
      email: json['email'] == null ? null : json['email'] as String,
      displayName: json['displayName'] == null ? null : json['displayName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      plan: AccountPlan.fromJson(json['plan'] as Map<String, dynamic>),
      entitlements: Entitlements.fromJson(json['entitlements'] as Map<String, dynamic>),
      usage: Usage.fromJson(json['usage'] as Map<String, dynamic>),
      subscriptions: (json['subscriptions'] as List<dynamic>).map((e) => AccountSubscription.fromJson(e as Map<String, dynamic>)).toList(),
      );

  Map<String, dynamic> toJson() => {
      'id': id,
      if (email != null) 'email': email!,
      'displayName': displayName == null ? null : displayName!,
      'createdAt': createdAt.toIso8601String(),
      'plan': plan.toJson(),
      'entitlements': entitlements.toJson(),
      'usage': usage.toJson(),
      'subscriptions': subscriptions.map((e) => e.toJson()).toList(),
      };
}

class UpdateAccountBody {
  const UpdateAccountBody({
    this.displayName,
  });

  final String? displayName;

  factory UpdateAccountBody.fromJson(Map<String, dynamic> json) => UpdateAccountBody(
      displayName: json['displayName'] == null ? null : json['displayName'] as String,
      );

  Map<String, dynamic> toJson() => {
      if (displayName != null) 'displayName': displayName!,
      };
}

class DeleteAccountBody {
  const DeleteAccountBody({
    required this.confirm,
  });

  /// Must be exactly "DELETE"
  final String confirm;

  factory DeleteAccountBody.fromJson(Map<String, dynamic> json) => DeleteAccountBody(
      confirm: json['confirm'] as String,
      );

  Map<String, dynamic> toJson() => {
      'confirm': confirm,
      };
}

class DeleteAccountResponse {
  const DeleteAccountResponse({
    required this.status,
  });

  /// pending: app data is deleted; the sign-in record will be removed shortly
  final DeleteAccountResponseStatus status;

  factory DeleteAccountResponse.fromJson(Map<String, dynamic> json) => DeleteAccountResponse(
      status: DeleteAccountResponseStatus.fromJson(json['status']),
      );

  Map<String, dynamic> toJson() => {
      'status': status.value,
      };
}

class WebBilling {
  const WebBilling({
    required this.provider,
    required this.available,
    required this.intervals,
  });

  final WebBillingProvider provider;
  final bool available;
  final List<WebBillingInterval> intervals;

  factory WebBilling.fromJson(Map<String, dynamic> json) => WebBilling(
      provider: WebBillingProvider.fromJson(json['provider']),
      available: json['available'] as bool,
      intervals: (json['intervals'] as List<dynamic>).map((e) => WebBillingInterval.fromJson(e)).toList(),
      );

  Map<String, dynamic> toJson() => {
      'provider': provider.value,
      'available': available,
      'intervals': intervals.map((e) => e.value).toList(),
      };
}

class PlayBilling {
  const PlayBilling({
    required this.available,
    required this.packageName,
    required this.subscriptionId,
  });

  final bool available;
  final String packageName;
  final String subscriptionId;

  factory PlayBilling.fromJson(Map<String, dynamic> json) => PlayBilling(
      available: json['available'] as bool,
      packageName: json['packageName'] as String,
      subscriptionId: json['subscriptionId'] as String,
      );

  Map<String, dynamic> toJson() => {
      'available': available,
      'packageName': packageName,
      'subscriptionId': subscriptionId,
      };
}

class BillingConfig {
  const BillingConfig({
    required this.enabled,
    required this.web,
    required this.googlePlay,
  });

  /// Paid plans switched on (billing feature flag)
  final bool enabled;
  final WebBilling web;
  final PlayBilling googlePlay;

  factory BillingConfig.fromJson(Map<String, dynamic> json) => BillingConfig(
      enabled: json['enabled'] as bool,
      web: WebBilling.fromJson(json['web'] as Map<String, dynamic>),
      googlePlay: PlayBilling.fromJson(json['googlePlay'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      'enabled': enabled,
      'web': web.toJson(),
      'googlePlay': googlePlay.toJson(),
      };
}

class CheckoutBody {
  const CheckoutBody({
    required this.interval,
  });

  final WebBillingInterval interval;

  factory CheckoutBody.fromJson(Map<String, dynamic> json) => CheckoutBody(
      interval: WebBillingInterval.fromJson(json['interval']),
      );

  Map<String, dynamic> toJson() => {
      'interval': interval.value,
      };
}

class Url {
  const Url({
    required this.url,
  });

  final String url;

  factory Url.fromJson(Map<String, dynamic> json) => Url(
      url: json['url'] as String,
      );

  Map<String, dynamic> toJson() => {
      'url': url,
      };
}

class AccountRef {
  const AccountRef({
    required this.accountRef,
  });

  /// Pass as obfuscatedAccountId (applicationUserName) when purchasing
  final String accountRef;

  factory AccountRef.fromJson(Map<String, dynamic> json) => AccountRef(
      accountRef: json['accountRef'] as String,
      );

  Map<String, dynamic> toJson() => {
      'accountRef': accountRef,
      };
}

class PlayVerifyBody {
  const PlayVerifyBody({
    required this.purchaseToken,
  });

  /// Google Play purchase token
  final String purchaseToken;

  factory PlayVerifyBody.fromJson(Map<String, dynamic> json) => PlayVerifyBody(
      purchaseToken: json['purchaseToken'] as String,
      );

  Map<String, dynamic> toJson() => {
      'purchaseToken': purchaseToken,
      };
}

class PlayVerifyResponse {
  const PlayVerifyResponse({
    required this.planId,
    required this.status,
    required this.duplicateSubscription,
  });

  final String planId;
  final String status;
  /// True when another channel already has an active subscription (warn the user)
  final bool duplicateSubscription;

  factory PlayVerifyResponse.fromJson(Map<String, dynamic> json) => PlayVerifyResponse(
      planId: json['planId'] as String,
      status: json['status'] as String,
      duplicateSubscription: json['duplicateSubscription'] as bool,
      );

  Map<String, dynamic> toJson() => {
      'planId': planId,
      'status': status,
      'duplicateSubscription': duplicateSubscription,
      };
}

class ScoreDelta {
  const ScoreDelta({
    required this.before,
    required this.after,
    required this.delta,
  });

  final int? before;
  final int? after;
  /// after − before
  final int? delta;

  factory ScoreDelta.fromJson(Map<String, dynamic> json) => ScoreDelta(
      before: json['before'] == null ? null : (json['before'] as num).toInt(),
      after: json['after'] == null ? null : (json['after'] as num).toInt(),
      delta: json['delta'] == null ? null : (json['delta'] as num).toInt(),
      );

  Map<String, dynamic> toJson() => {
      'before': before == null ? null : before!,
      'after': after == null ? null : after!,
      'delta': delta == null ? null : delta!,
      };
}

class ScoreDeltas {
  const ScoreDeltas({
    required this.performance,
    required this.accessibility,
    required this.seo,
    required this.bestPractices,
  });

  final ScoreDelta performance;
  final ScoreDelta accessibility;
  final ScoreDelta seo;
  final ScoreDelta bestPractices;

  factory ScoreDeltas.fromJson(Map<String, dynamic> json) => ScoreDeltas(
      performance: ScoreDelta.fromJson(json['performance'] as Map<String, dynamic>),
      accessibility: ScoreDelta.fromJson(json['accessibility'] as Map<String, dynamic>),
      seo: ScoreDelta.fromJson(json['seo'] as Map<String, dynamic>),
      bestPractices: ScoreDelta.fromJson(json['bestPractices'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      'performance': performance.toJson(),
      'accessibility': accessibility.toJson(),
      'seo': seo.toJson(),
      'bestPractices': bestPractices.toJson(),
      };
}

class ScoreComparison {
  const ScoreComparison({
    this.mobile,
    this.desktop,
  });

  final ScoreDeltas? mobile;
  final ScoreDeltas? desktop;

  factory ScoreComparison.fromJson(Map<String, dynamic> json) => ScoreComparison(
      mobile: json['mobile'] == null ? null : ScoreDeltas.fromJson(json['mobile'] as Map<String, dynamic>),
      desktop: json['desktop'] == null ? null : ScoreDeltas.fromJson(json['desktop'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      if (mobile != null) 'mobile': mobile!.toJson(),
      if (desktop != null) 'desktop': desktop!.toJson(),
      };
}

class UnchangedFinding {
  const UnchangedFinding({
    required this.finding,
    this.previousSeverity,
  });

  /// As it appears in the newer scan
  final Finding finding;
  /// Set when the severity changed
  final FindingSeverity? previousSeverity;

  factory UnchangedFinding.fromJson(Map<String, dynamic> json) => UnchangedFinding(
      finding: Finding.fromJson(json['finding'] as Map<String, dynamic>),
      previousSeverity: json['previousSeverity'] == null ? null : FindingSeverity.fromJson(json['previousSeverity']),
      );

  Map<String, dynamic> toJson() => {
      'finding': finding.toJson(),
      if (previousSeverity != null) 'previousSeverity': previousSeverity!.value,
      };
}

class ReportComparison {
  const ReportComparison({
    required this.base,
    required this.target,
    required this.scores,
    required this.newFindings,
    required this.resolvedFindings,
    required this.unchangedFindings,
    required this.notComparable,
    required this.severityDelta,
  });

  /// The older scan
  final ScanSummary base;
  /// The newer scan
  final ScanSummary target;
  final ScoreComparison scores;
  final List<Finding> newFindings;
  final List<Finding> resolvedFindings;
  final List<UnchangedFinding> unchangedFindings;
  /// Findings whose data source did not run in one of the scans, so they are neither new nor resolved
  final List<Finding> notComparable;
  /// Newer minus older, per severity
  final SeverityCounts severityDelta;

  factory ReportComparison.fromJson(Map<String, dynamic> json) => ReportComparison(
      base: ScanSummary.fromJson(json['base'] as Map<String, dynamic>),
      target: ScanSummary.fromJson(json['target'] as Map<String, dynamic>),
      scores: ScoreComparison.fromJson(json['scores'] as Map<String, dynamic>),
      newFindings: (json['newFindings'] as List<dynamic>).map((e) => Finding.fromJson(e as Map<String, dynamic>)).toList(),
      resolvedFindings: (json['resolvedFindings'] as List<dynamic>).map((e) => Finding.fromJson(e as Map<String, dynamic>)).toList(),
      unchangedFindings: (json['unchangedFindings'] as List<dynamic>).map((e) => UnchangedFinding.fromJson(e as Map<String, dynamic>)).toList(),
      notComparable: (json['notComparable'] as List<dynamic>).map((e) => Finding.fromJson(e as Map<String, dynamic>)).toList(),
      severityDelta: SeverityCounts.fromJson(json['severityDelta'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
      'base': base.toJson(),
      'target': target.toJson(),
      'scores': scores.toJson(),
      'newFindings': newFindings.map((e) => e.toJson()).toList(),
      'resolvedFindings': resolvedFindings.map((e) => e.toJson()).toList(),
      'unchangedFindings': unchangedFindings.map((e) => e.toJson()).toList(),
      'notComparable': notComparable.map((e) => e.toJson()).toList(),
      'severityDelta': severityDelta.toJson(),
      };
}

class CreateShareBody {
  const CreateShareBody({
    this.expiresInDays,
  });

  /// Days until the link stops working. It also stops when the scan is deleted.
  final int? expiresInDays;

  factory CreateShareBody.fromJson(Map<String, dynamic> json) => CreateShareBody(
      expiresInDays: json['expiresInDays'] == null ? null : (json['expiresInDays'] as num).toInt(),
      );

  Map<String, dynamic> toJson() => {
      if (expiresInDays != null) 'expiresInDays': expiresInDays!,
      };
}

class ShareLink {
  const ShareLink({
    required this.id,
    required this.scanId,
    required this.createdAt,
    required this.expiresAt,
    required this.revokedAt,
    required this.active,
  });

  final String id;
  final String scanId;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final DateTime? revokedAt;
  /// False once revoked or expired
  final bool active;

  factory ShareLink.fromJson(Map<String, dynamic> json) => ShareLink(
      id: json['id'] as String,
      scanId: json['scanId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      expiresAt: json['expiresAt'] == null ? null : DateTime.parse(json['expiresAt'] as String),
      revokedAt: json['revokedAt'] == null ? null : DateTime.parse(json['revokedAt'] as String),
      active: json['active'] as bool,
      );

  Map<String, dynamic> toJson() => {
      'id': id,
      'scanId': scanId,
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt == null ? null : expiresAt!.toIso8601String(),
      'revokedAt': revokedAt == null ? null : revokedAt!.toIso8601String(),
      'active': active,
      };
}

class CreateShareResponse {
  const CreateShareResponse({
    required this.share,
    required this.token,
    required this.url,
  });

  final ShareLink share;
  /// Secret for the share URL (/r/<token>). Shown once: only a hash is stored, so it cannot be retrieved later.
  final String token;
  /// Full share URL on the public site
  final String url;

  factory CreateShareResponse.fromJson(Map<String, dynamic> json) => CreateShareResponse(
      share: ShareLink.fromJson(json['share'] as Map<String, dynamic>),
      token: json['token'] as String,
      url: json['url'] as String,
      );

  Map<String, dynamic> toJson() => {
      'share': share.toJson(),
      'token': token,
      'url': url,
      };
}

class ShareListResponse {
  const ShareListResponse({
    required this.items,
  });

  final List<ShareLink> items;

  factory ShareListResponse.fromJson(Map<String, dynamic> json) => ShareListResponse(
      items: (json['items'] as List<dynamic>).map((e) => ShareLink.fromJson(e as Map<String, dynamic>)).toList(),
      );

  Map<String, dynamic> toJson() => {
      'items': items.map((e) => e.toJson()).toList(),
      };
}

class SharedReport {
  const SharedReport({
    required this.report,
    required this.shareExpiresAt,
  });

  final ScanReport report;
  final DateTime? shareExpiresAt;

  factory SharedReport.fromJson(Map<String, dynamic> json) => SharedReport(
      report: ScanReport.fromJson(json['report'] as Map<String, dynamic>),
      shareExpiresAt: json['shareExpiresAt'] == null ? null : DateTime.parse(json['shareExpiresAt'] as String),
      );

  Map<String, dynamic> toJson() => {
      'report': report.toJson(),
      'shareExpiresAt': shareExpiresAt == null ? null : shareExpiresAt!.toIso8601String(),
      };
}
