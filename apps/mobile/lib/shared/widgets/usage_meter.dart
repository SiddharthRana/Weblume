import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/tokens.g.dart';

class UsageMeter extends StatelessWidget {
  const UsageMeter({super.key, required this.used, required this.limit, required this.resetsAt});

  final int used;
  final int limit;
  final DateTime resetsAt;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final remaining = (limit - used).clamp(0, limit);
    final date = DateFormat.yMMMd().format(resetsAt.toLocal());
    return Semantics(
      label: l10n.usageSemantics(used, limit),
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(l10n.usageTitle, style: theme.textTheme.titleSmall)),
              Text(l10n.usageCount(used, limit)),
            ],
          ),
          const SizedBox(height: WlSpace.s2),
          ClipRRect(
            borderRadius: BorderRadius.circular(WlRadius.full),
            child: LinearProgressIndicator(
              value: limit == 0 ? 1 : (used / limit).clamp(0, 1),
              minHeight: 10,
              color: remaining == 0 ? theme.colorScheme.error : theme.colorScheme.primary,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
          ),
          const SizedBox(height: WlSpace.s2),
          Text(
            remaining == 0 ? l10n.usageNoneLeft(date) : l10n.usageRemaining(remaining, date),
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
