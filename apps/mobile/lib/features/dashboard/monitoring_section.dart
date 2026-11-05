import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/surface.dart';
import '../../theme/tokens.g.dart';
import '../monitoring/monitor_sheets.dart';

/// Monitored sites on the dashboard: add one, and tap a site to change, pause or stop it.
class MonitoringSection extends ConsumerWidget {
  const MonitoringSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final monitors = ref.watch(monitorsProvider);
    final list = monitors.value?.data;
    // Hidden while loading, on errors, and for plans without monitoring.
    if (list == null || list.limit <= 0) return const SizedBox.shrink();
    void add() => AddMonitorSheet.show(context, fastest: list.fastestFrequency);
    final full = list.items.length >= list.limit;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionTitle(
          l10n.monitoringTitle,
          subtitle: list.items.isEmpty ? null : l10n.monitoringSubtitle,
          trailing: list.items.isEmpty
              ? null
              : Text(
                  l10n.monitoringCount(list.items.length, list.limit),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
        ),
        if (list.items.isEmpty)
          WlCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.monitoringEmpty, style: theme.textTheme.bodyMedium),
                const SizedBox(height: WlSpace.s3),
                FilledButton.icon(
                  onPressed: add,
                  icon: const Icon(Icons.radar, size: 18),
                  label: Text(l10n.monitoringAddButton),
                ),
              ],
            ),
          )
        else ...[
          for (final m in list.items) _MonitorTile(monitor: m, fastest: list.fastestFrequency),
          if (full)
            Padding(
              padding: const EdgeInsets.only(top: WlSpace.s1),
              child: Text(
                l10n.monitoringFull(list.limit),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            )
          else
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: add,
                icon: const Icon(Icons.add, size: 18),
                label: Text(l10n.monitoringAddButton),
              ),
            ),
        ],
      ],
    );
  }
}

class _MonitorTile extends StatelessWidget {
  const _MonitorTile({required this.monitor, required this.fastest});

  final Monitor monitor;
  final EntitlementsMonitorFrequency? fastest;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final m = monitor;
    final skip = l10n.monitorSkip(m.lastSkipReason);
    return Padding(
      padding: const EdgeInsets.only(bottom: WlSpace.s2),
      child: WlCard(
        padding: const EdgeInsets.symmetric(horizontal: WlSpace.s3, vertical: WlSpace.s3),
        onTap: () => MonitorSettingsSheet.show(context, monitor, fastest),
        child: Row(
          children: [
            Icon(
              m.enabled ? Icons.radar : Icons.pause_circle_outline,
              color: m.enabled ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: WlSpace.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.normalizedUrl,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    m.enabled
                        ? l10n.monitoringNext(
                            l10n.frequency(m.frequency),
                            DateFormat.MMMd().add_jm().format(m.nextRunAt.toLocal()),
                          )
                        : '${l10n.frequency(m.frequency)} · ${l10n.monitoringPaused}',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  if (skip != null) ...[
                    const SizedBox(height: 2),
                    Text(skip, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
                  ],
                ],
              ),
            ),
            Icon(Icons.tune, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
