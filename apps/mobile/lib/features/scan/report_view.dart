import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/score_ring.dart';
import '../../shared/widgets/severity_badge.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// Full report: scores, summary, priorities, findings by category, coverage and limitations.
class ReportView extends StatefulWidget {
  const ReportView({super.key, required this.report});

  final ScanReport report;

  @override
  State<ReportView> createState() => _ReportViewState();
}

class _ReportViewState extends State<ReportView> {
  FindingCategory? _filter;

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

    Widget section(String title, List<Widget> children) => Padding(
      padding: const EdgeInsets.only(top: WlSpace.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(title, style: theme.textTheme.titleLarge)),
          const SizedBox(height: WlSpace.s3),
          ...children,
        ],
      ),
    );

    return ListView(
      padding: const EdgeInsets.all(WlSpace.s4),
      children: [
        Text(
          l10n.reportTitle.toUpperCase(),
          style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary),
        ),
        Semantics(header: true, child: Text(r.normalizedUrl, style: theme.textTheme.headlineSmall)),
        const SizedBox(height: WlSpace.s1),
        Text(
          l10n.scannedAt(DateFormat.yMMMd().add_jm().format((r.completedAt ?? r.createdAt).toLocal())),
          style: muted,
        ),
        if (r.status == ScanSummaryStatus.partial) ...[
          const SizedBox(height: WlSpace.s3),
          Card(
            color: theme.extension<SeverityColors>()!.bg[Severity.medium],
            child: Padding(
              padding: const EdgeInsets.all(WlSpace.s3),
              child: Text(
                l10n.partialNotice,
                style: TextStyle(color: theme.extension<SeverityColors>()!.fg[Severity.medium]),
              ),
            ),
          ),
        ],
        section(l10n.lighthouseTitle, [
          Text(l10n.lighthouseSource, style: muted),
          const SizedBox(height: WlSpace.s3),
          if (lh?.mobile == null && lh?.desktop == null)
            Text(l10n.lighthouseUnavailable, style: muted)
          else ...[
            if (lh!.mobile != null) _LighthouseCard(title: l10n.strategyMobile, result: lh.mobile!),
            if (lh.desktop != null) ...[
              const SizedBox(height: WlSpace.s3),
              _LighthouseCard(title: l10n.strategyDesktop, result: lh.desktop!),
            ],
          ],
        ]),
        section(l10n.findingsSummary, [
          Wrap(
            spacing: WlSpace.s2,
            runSpacing: WlSpace.s2,
            children: [
              for (final s in FindingSeverity.values.where((s) => s != FindingSeverity.unknown))
                Chip(
                  avatar: null,
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SeverityBadge(severity: severityOf(s)),
                      const SizedBox(width: 6),
                      Text('${findings.where((f) => f.severity == s).length}'),
                    ],
                  ),
                ),
            ],
          ),
          if (r.passedChecks.isNotEmpty) ...[
            const SizedBox(height: WlSpace.s2),
            Text(l10n.passedChecks(r.passedChecks.length), style: muted),
          ],
        ]),
        if (top.isNotEmpty)
          section(l10n.topPriorities, [for (final f in top) _FindingTile(finding: f, onTap: () => _open(f))]),
        section(l10n.allFindings, [
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
          if (visible.isEmpty)
            Text(l10n.noFindingsInCategory, style: muted)
          else
            for (final f in visible) _FindingTile(finding: f, onTap: () => _open(f)),
        ]),
        section(l10n.coverageTitle, [_Coverage(sources: r.sources)]),
        section(l10n.limitationsTitle, [Text(l10n.limitationsBody, style: muted)]),
        const SizedBox(height: WlSpace.s8),
      ],
    );
  }
}

class _LighthouseCard extends StatelessWidget {
  const _LighthouseCard({required this.title, required this.result});

  final String title;
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(WlSpace.s4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: WlSpace.s3),
            Wrap(
              alignment: WrapAlignment.spaceAround,
              spacing: WlSpace.s4,
              runSpacing: WlSpace.s4,
              children: [
                for (final (label, score) in entries)
                  score == null
                      ? SizedBox(
                          width: 80,
                          child: Text('$label: ${l10n.scoreNotMeasured}', textAlign: TextAlign.center),
                        )
                      : ScoreRing(score: score, label: label),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FindingTile extends StatelessWidget {
  const _FindingTile({required this.finding, required this.onTap});

  final Finding finding;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: WlSpace.s2),
    clipBehavior: Clip.antiAlias,
    child: ListTile(
      minTileHeight: 56,
      title: Text(finding.title),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: WlSpace.s1),
        child: Align(
          alignment: Alignment.centerLeft,
          child: SeverityBadge(severity: severityOf(finding.severity)),
        ),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    ),
  );
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
