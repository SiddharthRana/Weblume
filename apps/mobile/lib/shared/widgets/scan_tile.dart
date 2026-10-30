import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';
import '../labels.dart';
import 'surface.dart';

/// A scan in a list: site avatar, address, date and status, and a count of serious findings.
class ScanTile extends StatelessWidget {
  const ScanTile({super.key, required this.scan});

  final ScanSummary scan;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final sev = theme.extension<SeverityColors>()!;
    final high = (scan.severityCounts.critical ?? 0) + (scan.severityCounts.high ?? 0);
    final host = Uri.tryParse(scan.normalizedUrl)?.host ?? scan.normalizedUrl;
    final failed = scan.status == ScanSummaryStatus.failed;
    return Padding(
      padding: const EdgeInsets.only(bottom: WlSpace.s2),
      child: WlCard(
        padding: const EdgeInsets.symmetric(horizontal: WlSpace.s3, vertical: WlSpace.s3),
        onTap: () => context.push('/scan/${scan.id}'),
        child: Row(
          children: [
            GradientAvatar(label: host.replaceFirst('www.', '')),
            const SizedBox(width: WlSpace.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    scan.normalizedUrl,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${DateFormat.yMMMd().add_jm().format(scan.createdAt.toLocal())} · ${l10n.scanStatus(scan.status)}'
                    '${high > 0 ? ' · ${l10n.criticalHighCount(high)}' : ''}',
                    maxLines: 2,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: failed ? theme.colorScheme.error : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (high > 0) ...[
              const SizedBox(width: WlSpace.s2),
              ExcludeSemantics(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: sev.bg[Severity.high],
                    borderRadius: BorderRadius.circular(WlRadius.full),
                  ),
                  child: Text(
                    '$high',
                    style: TextStyle(color: sev.fg[Severity.high], fontWeight: FontWeight.w700, fontSize: 12),
                  ),
                ),
              ),
            ],
            const SizedBox(width: WlSpace.s1),
            Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
