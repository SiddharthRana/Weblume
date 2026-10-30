import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';
import '../labels.dart';

class ScanTile extends StatelessWidget {
  const ScanTile({super.key, required this.scan});

  final ScanSummary scan;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final high = (scan.severityCounts.critical ?? 0) + (scan.severityCounts.high ?? 0);
    return ListTile(
      minTileHeight: 64,
      title: Text(scan.normalizedUrl, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: Text(
        '${DateFormat.yMMMd().add_jm().format(scan.createdAt.toLocal())} · ${l10n.scanStatus(scan.status)}'
        '${high > 0 ? ' · ${l10n.criticalHighCount(high)}' : ''}',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => context.push('/scan/${scan.id}'),
    );
  }
}
