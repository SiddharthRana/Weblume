import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/generated/api.g.dart';
import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/status_views.dart';
import '../../shared/widgets/surface.dart';
import '../../router/app_router.dart';
import '../../theme/tokens.g.dart';
import '../monitoring/monitor_sheets.dart';
import '../reports/pdf_actions.dart';
import '../reports/share_sheet.dart';
import 'report_view.dart';
import 'scan_progress.dart';

/// Polls a scan while it runs, then shows the report (or an honest failure).
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key, required this.scanId});

  final String scanId;

  static const pollInterval = Duration(seconds: 2);
  static const giveUpAfter = Duration(minutes: 5);

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  ScanReport? _report;
  bool _fromCache = false;
  Object? _error;
  bool _notFound = false;
  bool _tooSlow = false;
  bool _retrying = false;
  String? _retryError;
  Timer? _timer;
  late DateTime _startedAt;

  @override
  void initState() {
    super.initState();
    _startedAt = DateTime.now();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  static bool _finishedRecently(ScanReport r) =>
      r.completedAt != null && DateTime.now().difference(r.completedAt!) < const Duration(minutes: 2);

  bool get _running =>
      _report != null && (_report!.status == ScanSummaryStatus.queued || _report!.status == ScanSummaryStatus.running);

  Future<void> _load() async {
    _timer?.cancel();
    try {
      final loaded = await ref.read(repositoryProvider).report(widget.scanId);
      if (!mounted) return;
      final wasRunning = _running;
      final firstLoad = _report == null;
      setState(() {
        _report = loaded.data;
        _fromCache = loaded.fromCache;
        _error = null;
      });
      if (_running) {
        if (DateTime.now().difference(_startedAt) > ScanScreen.giveUpAfter) {
          setState(() => _tooSlow = true);
        } else {
          _timer = Timer(ScanScreen.pollInterval, _load);
        }
      } else if (wasRunning || (firstLoad && _finishedRecently(loaded.data))) {
        // The scan just finished (or did so before this screen first loaded it): that changes
        // usage, the recent list and History. Opening an old report doesn't.
        onScansChanged(ref);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.statusCode == 404 || e.statusCode == 400) {
          _notFound = true;
        } else {
          _error = e;
        }
      });
    }
  }

  Future<void> _retry() async {
    setState(() {
      _retrying = true;
      _retryError = null;
    });
    try {
      final res = await ref.read(repositoryProvider).retryScan(widget.scanId);
      if (mounted) context.pushReplacement('/scan/${res.scan.id}');
    } catch (e) {
      if (mounted) setState(() => _retryError = AppLocalizations.of(context).apiError(e));
    } finally {
      if (mounted) setState(() => _retrying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final Widget body;
    if (_notFound) {
      body = EmptyState(icon: Icons.search_off, title: l10n.reportNotAvailableTitle, body: l10n.reportNotAvailableBody);
    } else if (_error != null && _report == null) {
      body = ErrorView(
        message: l10n.apiError(_error!),
        onRetry: () {
          setState(() => _error = null);
          _load();
        },
      );
    } else if (_report == null) {
      body = const LoadingView();
    } else if (_running) {
      final r = _report!;
      body = ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          Text(
            l10n.scanningLabel.toUpperCase(),
            style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary),
          ),
          Text(r.normalizedUrl, style: theme.textTheme.headlineSmall),
          const SizedBox(height: WlSpace.s6),
          Semantics(
            liveRegion: true,
            child: ScanProgressCard(
              url: r.normalizedUrl,
              queued: r.status == ScanSummaryStatus.queued,
              startedAt: r.createdAt,
            ),
          ),
          if (_tooSlow) ...[
            const SizedBox(height: WlSpace.s4),
            Text(l10n.scanTakingLong),
            TextButton(
              onPressed: () {
                setState(() {
                  _tooSlow = false;
                  _startedAt = DateTime.now();
                });
                _load();
              },
              child: Text(l10n.checkAgain),
            ),
          ],
        ],
      );
    } else if (_report!.status == ScanSummaryStatus.failed) {
      final r = _report!;
      body = ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          Text(
            l10n.scanFailedTitle.toUpperCase(),
            style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.error),
          ),
          Text(r.normalizedUrl, style: theme.textTheme.headlineSmall),
          const SizedBox(height: WlSpace.s4),
          Semantics(
            liveRegion: true,
            child: Card(
              color: theme.colorScheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(WlSpace.s4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.failureMessage ?? l10n.errorGeneric,
                      style: TextStyle(color: theme.colorScheme.onErrorContainer, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: WlSpace.s2),
                    Text(l10n.scanFailedNoData, style: TextStyle(color: theme.colorScheme.onErrorContainer)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: WlSpace.s4),
          if (!_fromCache)
            FilledButton(onPressed: _retrying ? null : _retry, child: Text(_retrying ? l10n.retrying : l10n.retryScan)),
          if (_retryError != null) ...[const SizedBox(height: WlSpace.s3), FormMessage(text: _retryError!)],
        ],
      );
    } else {
      body = ReportView(
        report: _report!,
        actions: _fromCache ? null : _OwnerActions(report: _report!),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reportTitle)),
      body: Column(
        children: [
          if (_fromCache) const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(onRefresh: _load, child: body),
          ),
        ],
      ),
    );
  }
}

/// Share/compare for the report owner, depending on the plan's entitlements (enforced by the API).
class _OwnerActions extends ConsumerWidget {
  const _OwnerActions({required this.report});

  final ScanReport report;

  String get scanId => report.id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final account = ref.watch(accountProvider).value?.data;
    if (account == null) return const SizedBox.shrink();
    final e = account.entitlements;
    final monitor = _MonitorThisSite(url: report.normalizedUrl);
    if (!e.shareLinks && !e.comparison) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          monitor,
          const SizedBox(height: WlSpace.s2),
          WlCard(
            padding: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(WlSpace.s3, WlSpace.s3, WlSpace.s3, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.reportUpsell),
                  TextButton(onPressed: () => context.push(Routes.subscription), child: Text(l10n.seePlans)),
                ],
              ),
            ),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: WlSpace.s2,
          runSpacing: WlSpace.s2,
          children: [
            if (e.shareLinks)
              OutlinedButton.icon(
                onPressed: () => ShareSheet.show(context, scanId),
                icon: const Icon(Icons.link),
                label: Text(l10n.reportActionShare),
              ),
            if (e.comparison)
              OutlinedButton.icon(
                onPressed: () => context.push('/scan/$scanId/compare'),
                icon: const Icon(Icons.compare_arrows),
                label: Text(l10n.reportActionCompare),
              ),
            monitor,
          ],
        ),
        if (e.pdfExport) ...[
          const SizedBox(height: WlSpace.s2),
          PdfActions(scanId: scanId, url: report.normalizedUrl, scannedAt: report.completedAt ?? report.createdAt),
        ],
      ],
    );
  }
}

/// "Monitor this site" for the report's address, or its current schedule when it's already
/// monitored (tap to change). Hidden for plans without monitoring and when every slot is used.
class _MonitorThisSite extends ConsumerWidget {
  const _MonitorThisSite({required this.url});

  final String url;

  static String _key(String u) => u.replaceFirst(RegExp(r'/$'), '').toLowerCase();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final list = ref.watch(monitorsProvider).value?.data;
    if (list == null || list.limit <= 0) return const SizedBox.shrink();
    final existing = list.items.where((m) => _key(m.normalizedUrl) == _key(url)).firstOrNull;
    if (existing != null) {
      return OutlinedButton.icon(
        onPressed: () => MonitorSettingsSheet.show(context, existing, list.fastestFrequency),
        icon: const Icon(Icons.radar),
        label: Text(l10n.monitoringActive(l10n.frequency(existing.frequency))),
      );
    }
    if (list.items.length >= list.limit) return const SizedBox.shrink();
    return OutlinedButton.icon(
      onPressed: () => AddMonitorSheet.show(context, url: url, fastest: list.fastestFrequency),
      icon: const Icon(Icons.radar),
      label: Text(l10n.monitoringThisSite),
    );
  }
}
