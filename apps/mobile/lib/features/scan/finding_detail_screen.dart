import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/severity_badge.dart';
import '../../theme/tokens.g.dart';

/// Evidence lines from a finding's details (mirrors evidenceLines() on the web). Never renders HTML.
List<String> evidenceLines(Finding f) {
  final d = f.details;
  final lines = <String>[];
  if (d['measured'] is String) {
    lines.add('Measured: ${d['measured']}${d['strategy'] != null ? ' (${d['strategy']})' : ''}');
  }
  if (d['broken'] is List) {
    for (final b in (d['broken'] as List).whereType<Map<String, dynamic>>()) {
      lines.add(
        '${b['url']} → ${b['status'] != null ? 'HTTP ${b['status']}' : '${b['error'] ?? 'error'}'.replaceAll('_', ' ')}',
      );
    }
  }
  if (d['examples'] is List) {
    for (final e in d['examples'] as List) {
      lines.add(e is Map ? '<${e['from']}> → <${e['to']}>' : '$e');
    }
  }
  if (d['missing'] is List) lines.add('Missing: ${(d['missing'] as List).join(', ')}');
  if (d['chain'] is List) {
    final chain = d['chain'] as List;
    for (var i = 0; i < chain.length; i++) {
      lines.add('${i + 1}. ${chain[i]}');
    }
  }
  if (d['canonical'] is String) lines.add('Canonical: ${d['canonical']}');
  if (d['header'] is String) lines.add('Header: ${d['header']}');
  if (lines.isEmpty && d['count'] is num) lines.add('Count: ${d['count']}');
  return lines.take(25).toList();
}

class FindingDetailScreen extends StatelessWidget {
  const FindingDetailScreen({super.key, required this.finding});

  final Finding finding;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    final evidence = evidenceLines(finding);

    Widget block(String title, Widget child) => Padding(
      padding: const EdgeInsets.only(top: WlSpace.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(title, style: theme.textTheme.titleMedium)),
          const SizedBox(height: WlSpace.s2),
          child,
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(l10n.category(finding.category))),
      body: ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: SeverityBadge(severity: severityOf(finding.severity)),
          ),
          const SizedBox(height: WlSpace.s3),
          Semantics(header: true, child: Text(finding.title, style: theme.textTheme.headlineSmall)),
          const SizedBox(height: WlSpace.s1),
          Text(
            l10n.kind(finding.kind),
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          block(l10n.whatItMeans, Text(finding.whatItMeans, style: muted)),
          block(l10n.whyItMatters, Text(finding.whyItMatters, style: muted)),
          block(
            l10n.howToFix,
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < finding.howToFix.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: WlSpace.s2),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${i + 1}. ', style: muted),
                        Expanded(child: Text(finding.howToFix[i], style: muted)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (evidence.isNotEmpty)
            block(
              l10n.whatWeFound,
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(WlSpace.s3),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(WlRadius.md),
                ),
                child: SelectableText(
                  evidence.join('\n'),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                ),
              ),
            ),
          if (finding.learnMoreUrl != null) ...[
            const SizedBox(height: WlSpace.s6),
            OutlinedButton.icon(
              onPressed: () => launchUrl(Uri.parse(finding.learnMoreUrl!), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.open_in_new),
              label: Text(l10n.learnMore),
            ),
          ],
        ],
      ),
    );
  }
}
