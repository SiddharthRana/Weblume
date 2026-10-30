import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../shared/widgets/surface.dart';
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

    final sev = severityOf(finding.severity);
    final sevFg = theme.extension<SeverityColors>()!.fg[sev]!;
    var n = 0;
    Widget block(String title, IconData icon, Widget child) => FadeSlideIn(
      index: ++n,
      child: Padding(
        padding: const EdgeInsets.only(top: WlSpace.s3),
        child: WlCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 18, color: theme.colorScheme.primary),
                  const SizedBox(width: WlSpace.s2),
                  Semantics(
                    header: true,
                    child: Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const SizedBox(height: WlSpace.s2),
              child,
            ],
          ),
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(l10n.category(finding.category))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s4, WlSpace.s4, WlSpace.s8),
        children: [
          FadeSlideIn(
            child: WlCard(
              accent: sevFg,
              padding: const EdgeInsets.all(WlSpace.s5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SeverityBadge(severity: sev),
                  const SizedBox(height: WlSpace.s3),
                  Semantics(
                    header: true,
                    child: Text(
                      finding.title,
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.3),
                    ),
                  ),
                  const SizedBox(height: WlSpace.s1),
                  Text(
                    l10n.kind(finding.kind),
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
          block(l10n.whatItMeans, Icons.lightbulb_outline, Text(finding.whatItMeans, style: muted)),
          block(l10n.whyItMatters, Icons.trending_up, Text(finding.whyItMatters, style: muted)),
          block(
            l10n.howToFix,
            Icons.build_outlined,
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < finding.howToFix.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: WlSpace.s2),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          margin: const EdgeInsets.only(right: WlSpace.s2, top: 1),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(gradient: brandGradient(theme.brightness), shape: BoxShape.circle),
                          child: Text(
                            '${i + 1}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ),
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
              Icons.manage_search,
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
            const SizedBox(height: WlSpace.s5),
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
