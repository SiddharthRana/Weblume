import '../api/generated/api.g.dart';
import '../api/generated/models.g.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../utils/url_validation.dart';

/// Maps API enums and errors to localised, user-facing text.
extension Labels on AppLocalizations {
  String category(FindingCategory c) => switch (c) {
    FindingCategory.performance => categoryPerformance,
    FindingCategory.seo => categorySeo,
    FindingCategory.accessibility => categoryAccessibility,
    FindingCategory.technical || FindingCategory.unknown => categoryTechnical,
  };

  String scanStatus(ScanSummaryStatus s) => switch (s) {
    ScanSummaryStatus.queued => statusQueued,
    ScanSummaryStatus.running => statusRunning,
    ScanSummaryStatus.completed => statusCompleted,
    ScanSummaryStatus.partial => statusPartial,
    ScanSummaryStatus.failed || ScanSummaryStatus.unknown => statusFailed,
  };

  String frequency(EntitlementsMonitorFrequency f) => switch (f) {
    EntitlementsMonitorFrequency.daily => frequencyDaily,
    EntitlementsMonitorFrequency.monthly => frequencyMonthly,
    _ => frequencyWeekly,
  };

  String alert(MonitorAlert a) => switch (a) {
    MonitorAlert.newFindings => alertNewFindings,
    MonitorAlert.scoreDrop => alertScoreDrop,
    MonitorAlert.none => alertNone,
    _ => alertAnyChange,
  };

  String? monitorSkip(String? reason) => switch (reason) {
    'plan' => monitoringSkipPlan,
    'plan_limit' => monitoringSkipLimit,
    'previous_run_active' => monitoringSkipBusy,
    _ => null,
  };

  String kind(FindingKind k) => switch (k) {
    FindingKind.measured => kindMeasured,
    FindingKind.recommendation => kindRecommendation,
    _ => kindDetected,
  };

  String sourceStatus(SourceStatus s) {
    if (s.status == SourceStatusStatus.ok) return sourceOk;
    return switch (s.reason) {
      SourceStatusReason.notConfigured => sourceNotConfigured,
      SourceStatusReason.disabled => sourceDisabled,
      SourceStatusReason.timeout => sourceTimeout,
      SourceStatusReason.quotaExceeded => sourceQuota,
      SourceStatusReason.upstreamError => sourceUpstream,
      _ => sourceUnavailable,
    };
  }

  String urlProblem(UrlProblem p) => switch (p) {
    UrlProblem.empty => urlErrorEmpty,
    UrlProblem.tooLong => urlErrorTooLong,
    UrlProblem.invalid => urlErrorInvalid,
    UrlProblem.unsupportedScheme => urlErrorScheme,
    UrlProblem.credentialsNotAllowed => urlErrorCredentials,
    UrlProblem.portNotAllowed => urlErrorPort,
    UrlProblem.invalidHost => urlErrorHost,
  };

  /// API error → message. API messages are already written for users; network errors get our copy.
  String apiError(Object error) {
    if (error is ApiException) {
      if (error.isNetworkError) return errorNetwork;
      if (error.statusCode == 401) return errorSessionExpired;
      if (error.code != null) return error.message;
    }
    return errorGeneric;
  }
}

Severity severityOf(FindingSeverity s) => switch (s) {
  FindingSeverity.critical => Severity.critical,
  FindingSeverity.high => Severity.high,
  FindingSeverity.medium => Severity.medium,
  FindingSeverity.low => Severity.low,
  _ => Severity.info,
};
