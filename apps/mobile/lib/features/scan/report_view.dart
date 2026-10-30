import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/score_ring.dart';
import '../../shared/widgets/severity_badge.dart';
import '../../shared/widgets/surface.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// Full report: scores, summary, priorities, findings by category, coverage and limitations.
class ReportView extends StatefulWidget {
  const ReportView({super.key, required this.report, this.actions});

  final ScanReport report;

  /// Owner actions (share, compare) shown under the header.
  final Widget? actions;

  @override
  State<ReportView> createState() => _ReportViewState();
}

class _ReportViewState extends State<ReportView> {
  FindingCategory? _filter;
  int _strategy = 0;

  void _open(Finding f) => context.push('/scan/${widget.report.id}/finding/${f.id}', extra: f);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final r = widget.report;
    final findings = r.findings;
    final visible = _filter == null ? findings : findings.where((f) => f.category == _filter).toList();
    final top = findings.where((f) => f.severity != FindingSeverity.info).take(5).toList();
    final lh = r.lighthouse;
    final muted = theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);

    final sev = theme.extension<SeverityColors>()!;
    final strategies = [
      if (lh?.mobile != null) (l10n.strategyMobile, lh!.mobile!),
      if (lh?.desktop != null) (l10n.strategyDesktop, lh!.desktop!),
    ];
    final shown = strategies.isEmpty ? null : strategies[_strategy.clamp(0, strategies.length - 1)];

    var i = 0;
    Widget item(Widget child) => FadeSlideIn(index: i++, child: child);

    return ListView(
      padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s4, WlSpace.s4, WlSpace.s8),
      children: [
        item(
          WlCard(
            gradientBorder: true,
            padding: const EdgeInsets.all(WlSpace.s5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(l10n.reportTitle),
                const SizedBox(height: WlSpace.s2),
                Semantics(
                  header: true,
                  child: Text(
                    r.normalizedUrl,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.4),
                  ),
                ),
                const SizedBox(height: WlSpace.s1),
                Text(
                  l10n.scannedAt(DateFormat.yMMMd().add_jm().format((r.completedAt ?? r.createdAt).toLocal())),
                  style: muted,
                ),
                if (widget.actions != null) ...[const SizedBox(height: WlSpace.s4), widget.actions!],
              ],
            ),
          ),
        ),
        if (r.status == ScanSummaryStatus.partial) ...[
          const SizedBox(height: WlSpace.s3),
          item(
            WlCard(
              accent: sev.fg[Severity.medium],
              child: Text(l10n.partialNotice, style: TextStyle(color: sev.fg[Severity.medium])),
            ),
          ),
        ],
        SectionTitle(l10n.lighthouseTitle, subtitle: l10n.lighthouseSource),
        item(
          shown == null
              ? WlCard(child: Text(l10n.lighthouseUnavailable, style: muted))
              : WlCard(
                  padding: const EdgeInsets.fromLTRB(WlSpace.s3, WlSpace.s4, WlSpace.s3, WlSpace.s4),
                  child: Column(
                    children: [
                      if (strategies.length > 1) ...[
                        SegmentedButton<int>(
                          showSelectedIcon: false,
                          segments: [
                            for (final (k, (label, _)) in strategies.indexed)
                              ButtonSegment(value: k, label: Text(label)),
                          ],
                          selected: {_strategy.clamp(0, strategies.length - 1)},
                          onSelectionChanged: (v) => setState(() => _strategy = v.first),
                        ),
                        const SizedBox(height: WlSpace.s4),
                      ] else ...[
                        Text(shown.$1, style: theme.textTheme.titleSmall),
                        const SizedBox(height: WlSpace.s3),
                      ],
                      _ScoreRow(key: ValueKey(shown.$1), result: shown.$2),
                    ],
                  ),
                ),
        ),
        SectionTitle(
          l10n.findingsSummary,
          subtitle: r.passedChecks.isNotEmpty ? l10n.passedChecks(r.passedChecks.length) : null,
        ),
        item(
          Row(
            children: [
              for (final (k, s) in FindingSeverity.values.where((s) => s != FindingSeverity.unknown).indexed) ...[
                if (k > 0) const SizedBox(width: WlSpace.s2),
                Expanded(
                  child: _SeverityCount(severity: severityOf(s), count: findings.where((f) => f.severity == s).length),
                ),
              ],
            ],
          ),
        ),
        if (top.isNotEmpty) ...[
          SectionTitle(l10n.topPriorities),
          for (final f in top) item(FindingTile(finding: f, onTap: () => _open(f))),
        ],
        SectionTitle(l10n.allFindings),
        Wrap(
          spacing: WlSpace.s2,
          runSpacing: WlSpace.s2,
          children: [
            ChoiceChip(
              label: Text(l10n.filterAll(findings.length)),
              selected: _filter == null,
              onSelected: (_) => setState(() => _filter = null),
            ),
            for (final c in FindingCategory.values.where((c) => c != FindingCategory.unknown))
              ChoiceChip(
                label: Text(l10n.filterCategory(l10n.category(c), findings.where((f) => f.category == c).length)),
                selected: _filter == c,
                onSelected: (_) => setState(() => _filter = c),
              ),
          ],
        ),
        const SizedBox(height: WlSpace.s3),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Column(
            key: ValueKey(_filter),
            children: [
              if (visible.isEmpty)
                WlCard(child: Text(l10n.noFindingsInCategory, style: muted))
              else
                for (final f in visible) FindingTile(finding: f, onTap: () => _open(f)),
            ],
          ),
        ),
        SectionTitle(l10n.coverageTitle),
        WlCard(
          padding: const EdgeInsets.symmetric(horizontal: WlSpace.s4, vertical: WlSpace.s2),
          child: _Coverage(sources: r.sources),
        ),
        SectionTitle(l10n.limitationsTitle),
        WlCard(child: Text(l10n.limitationsBody, style: muted)),
      ],
    );
  }
}

/// Four scores, evenly spaced across the card.
class _ScoreRow extends StatelessWidget {
  const _ScoreRow({super.key, required this.result});

  final LighthouseResult result;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final s = result.scores;
    final entries = [
      (l10n.scorePerformance, s.performance),
      (l10n.scoreAccessibility, s.accessibility),
      (l10n.scoreSeo, s.seo),
      (l10n.scoreBestPractices, s.bestPractices),
    ];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (label, score) in entries)
          Expanded(
            child: score == null
                ? Padding(
                    padding: const EdgeInsets.only(top: WlSpace.s4),
                    child: Text(
                      '$label: ${l10n.scoreNotMeasured}',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  )
                : ScoreRing(score: score, label: label, size: 64),
          ),
      ],
    );
  }
}

/// One severity in the summary row: icon, count and label in the severity colours.
class _SeverityCount extends StatelessWidget {
  const _SeverityCount({required this.severity, required this.count});

  final Severity severity;
  final int count;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<SeverityColors>()!;
    final fg = colors.fg[severity]!;
    return Semantics(
      label: '${SeverityBadge.label(severity)}: $count',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: WlSpace.s3),
        decoration: BoxDecoration(
          color: colors.bg[severity],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: fg.withValues(alpha: 0.18)),
        ),
        child: Column(
          children: [
            Icon(SeverityBadge.iconFor(severity), size: 16, color: fg),
            const SizedBox(height: 4),
            Text(
              '$count',
              style: TextStyle(color: fg, fontSize: 20, fontWeight: FontWeight.w800, height: 1.1),
            ),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                SeverityBadge.label(severity),
                style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A tappable finding: severity edge, title, badge and an optional note (e.g. a previous severity).
class FindingTile extends StatelessWidget {
  const FindingTile({super.key, required this.finding, required this.onTap, this.note});

  final Finding finding;
  final VoidCallback onTap;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final severity = severityOf(finding.severity);
    return Padding(
      padding: const EdgeInsets.only(bottom: WlSpace.s2),
      child: WlCard(
        onTap: onTap,
        accent: theme.extension<SeverityColors>()!.fg[severity],
        padding: const EdgeInsets.fromLTRB(WlSpace.s3, WlSpace.s3, WlSpace.s2, WlSpace.s3),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(finding.title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: WlSpace.s2),
                  SeverityBadge(severity: severity),
                  if (note != null) ...[
                    const SizedBox(height: WlSpace.s1),
                    Text(note!, style: theme.textTheme.bodySmall),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

class _Coverage extends StatelessWidget {
  const _Coverage({required this.sources});

  final ScanSources sources;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final rows = [
      (l10n.sourcePageFetch, sources.pageFetch),
      (l10n.sourcePsiMobile, sources.psiMobile),
      (l10n.sourcePsiDesktop, sources.psiDesktop),
      (l10n.sourceLinkCheck, sources.linkCheck),
      (l10n.sourceRobotsSitemap, sources.robotsSitemap),
    ];
    final theme = Theme.of(context);
    return Column(
      children: [
        for (final (label, status) in rows)
          if (status != null)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                status.status == SourceStatusStatus.ok
                    ? Icons.check_circle_outline
                    : status.status == SourceStatusStatus.failed
                    ? Icons.error_outline
                    : Icons.remove_circle_outline,
                color: status.status == SourceStatusStatus.failed
                    ? theme.colorScheme.error
                    : theme.colorScheme.onSurfaceVariant,
              ),
              title: Text(label),
              subtitle: Text(l10n.sourceStatus(status)),
            ),
      ],
    );
  }
}
