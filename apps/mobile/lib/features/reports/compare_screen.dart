import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/generated/api.g.dart';
import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/severity_badge.dart';
import '../../shared/widgets/status_views.dart';
import '../../theme/tokens.g.dart';
import '../scan/report_view.dart';

/// Compare a finished scan with another scan of the same address: pick one, then see what changed.
class CompareScreen extends ConsumerStatefulWidget {
  const CompareScreen({super.key, required this.targetId});

  final String targetId;

  @override
  ConsumerState<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends ConsumerState<CompareScreen> {
  ScanReport? _target;
  List<ScanSummary>? _candidates;
  ReportComparison? _comparison;
  bool _loading = true;
  Object? _error;

  static const _comparable = {ScanSummaryStatus.completed, ScanSummaryStatus.partial};

  @override
  void initState() {
    super.initState();
    _loadCandidates();
  }

  Future<void> _run(Future<void> Function() body) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await body();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadCandidates() => _run(() async {
    final repo = ref.read(repositoryProvider);
    final target = (await repo.report(widget.targetId)).data;
    final list = await repo.scans(q: target.normalizedUrl, limit: 50);
    if (!mounted) return;
    setState(() {
      _target = target;
      _candidates = list.data.items
          .where((s) => s.id != target.id && s.normalizedUrl == target.normalizedUrl && _comparable.contains(s.status))
          .toList();
    });
  });

  Future<void> _compare(ScanSummary base) => _run(() async {
    final c = await ref.read(repositoryProvider).compare(base.id, widget.targetId);
    if (mounted) setState(() => _comparison = c);
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final Widget body;
    if (_loading) {
      body = const LoadingView();
    } else if (_error != null) {
      final e = _error;
      body = e is ApiException && e.code == 'upgrade_required'
          ? EmptyState(
              icon: Icons.compare_arrows,
              title: l10n.compareTitle,
              body: e.message,
              action: FilledButton(onPressed: () => context.push('/subscription'), child: Text(l10n.seePlans)),
            )
          : ErrorView(message: l10n.apiError(e!), onRetry: _loadCandidates);
    } else if (_comparison != null) {
      body = _ComparisonView(comparison: _comparison!);
    } else {
      body = _Picker(target: _target!, candidates: _candidates!, onPick: _compare);
    }
    return Scaffold(
      appBar: AppBar(title: Text(l10n.compareTitle)),
      body: body,
    );
  }
}

String _when(DateTime d) => DateFormat.yMMMd().add_jm().format(d.toLocal());

class _Picker extends StatelessWidget {
  const _Picker({required this.target, required this.candidates, required this.onPick});

  final ScanReport target;
  final List<ScanSummary> candidates;
  final ValueChanged<ScanSummary> onPick;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(WlSpace.s4),
      children: [
        Semantics(header: true, child: Text(target.normalizedUrl, style: theme.textTheme.headlineSmall)),
        const SizedBox(height: WlSpace.s2),
        Text(l10n.comparePick(_when(target.createdAt))),
        const SizedBox(height: WlSpace.s4),
        if (candidates.isEmpty)
          Text(l10n.compareNoOther, style: TextStyle(color: theme.colorScheme.onSurfaceVariant))
        else
          for (final c in candidates)
            Card(
              margin: const EdgeInsets.only(bottom: WlSpace.s2),
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                minTileHeight: 56,
                title: Text(_when(c.createdAt)),
                subtitle: Text(
                  l10n.compareFindingCount(
                    [
                      c.severityCounts.critical,
                      c.severityCounts.high,
                      c.severityCounts.medium,
                      c.severityCounts.low,
                      c.severityCounts.info,
                    ].fold<int>(0, (n, v) => n + (v ?? 0)),
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => onPick(c),
              ),
            ),
      ],
    );
  }
}

class _ComparisonView extends StatelessWidget {
  const _ComparisonView({required this.comparison});

  final ReportComparison comparison;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final c = comparison;
    final muted = theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);

    void open(Finding f) => context.push('/scan/${c.target.id}/finding/${f.id}', extra: f);

    Widget group(String title, List<Finding> findings, {String? intro, Map<String, String> notes = const {}}) =>
        Padding(
          padding: const EdgeInsets.only(top: WlSpace.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(l10n.compareGroupTitle(title, findings.length), style: theme.textTheme.titleLarge),
              ),
              if (intro != null) ...[const SizedBox(height: WlSpace.s2), Text(intro, style: muted)],
              const SizedBox(height: WlSpace.s3),
              if (findings.isEmpty)
                Text(l10n.compareNone, style: muted)
              else
                for (final f in findings) FindingTile(finding: f, note: notes[f.id], onTap: () => open(f)),
            ],
          ),
        );

    Widget scores(String strategy, ScoreDeltas d) {
      String show(int? n) => n?.toString() ?? '—';
      String change(int? n) => n == null ? 'n/a' : (n > 0 ? '+$n' : '$n');
      final rows = [
        (l10n.scorePerformance, d.performance),
        (l10n.scoreAccessibility, d.accessibility),
        (l10n.scoreSeo, d.seo),
        (l10n.scoreBestPractices, d.bestPractices),
      ];
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(WlSpace.s3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(strategy, style: theme.textTheme.titleMedium),
              for (final (label, s) in rows)
                Padding(
                  padding: const EdgeInsets.only(top: WlSpace.s2),
                  child: Row(
                    children: [
                      Expanded(child: Text(label)),
                      Text(l10n.compareScoreChange(show(s.before), show(s.after), change(s.delta))),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(WlSpace.s4),
      children: [
        Semantics(header: true, child: Text(c.target.normalizedUrl, style: theme.textTheme.headlineSmall)),
        const SizedBox(height: WlSpace.s1),
        Text(l10n.compareRange(_when(c.base.createdAt), _when(c.target.createdAt)), style: muted),
        const SizedBox(height: WlSpace.s4),
        Wrap(
          spacing: WlSpace.s3,
          runSpacing: WlSpace.s3,
          children: [
            _Stat(label: l10n.compareResolved, value: c.resolvedFindings.length),
            _Stat(label: l10n.compareNew, value: c.newFindings.length),
            _Stat(label: l10n.compareStillOpen, value: c.unchangedFindings.length),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: WlSpace.s6),
          child: Semantics(header: true, child: Text(l10n.compareScores, style: theme.textTheme.titleLarge)),
        ),
        const SizedBox(height: WlSpace.s3),
        if (c.scores.mobile == null && c.scores.desktop == null)
          Text(l10n.compareNoScores, style: muted)
        else ...[
          if (c.scores.mobile != null) scores(l10n.strategyMobile, c.scores.mobile!),
          if (c.scores.desktop != null) scores(l10n.strategyDesktop, c.scores.desktop!),
        ],
        const SizedBox(height: WlSpace.s2),
        Text(l10n.compareScoresVary, style: theme.textTheme.bodySmall),
        group(l10n.compareNew, c.newFindings),
        group(l10n.compareResolved, c.resolvedFindings),
        group(
          l10n.compareStillOpen,
          [for (final u in c.unchangedFindings) u.finding],
          notes: {
            for (final u in c.unchangedFindings)
              if (u.previousSeverity != null)
                u.finding.id: l10n.compareWasSeverity(SeverityBadge.label(severityOf(u.previousSeverity!))),
          },
        ),
        if (c.notComparable.isNotEmpty)
          group(l10n.compareNotComparable, c.notComparable, intro: l10n.compareNotComparableBody),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: WlSpace.s4, vertical: WlSpace.s3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: theme.textTheme.bodyMedium),
            Text('$value', style: theme.textTheme.headlineMedium),
          ],
        ),
      ),
    );
  }
}
