import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/generated/models.g.dart';
import '../../config/app_config.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/surface.dart';
import '../../theme/tokens.g.dart';

/// Monitored sites on the dashboard. Read-only in v1: adding and changing them links to the web.
class MonitoringSection extends ConsumerWidget {
  const MonitoringSection({super.key});

  static Uri get manageUri => Uri.parse('${AppConfig.siteUrl}/dashboard#monitoring');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final monitors = ref.watch(monitorsProvider);
    final list = monitors.value?.data;
    // Hidden while loading, on errors, and for plans without monitoring.
    if (list == null || list.limit <= 0) return const SizedBox.shrink();
    void openWeb() => launchUrl(manageUri, mode: LaunchMode.externalApplication);

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
                OutlinedButton.icon(
                  onPressed: openWeb,
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: Text(l10n.monitoringSetUp),
                ),
              ],
            ),
          )
        else ...[
          for (final m in list.items) _MonitorTile(monitor: m),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: openWeb,
              icon: const Icon(Icons.open_in_new, size: 18),
              label: Text(l10n.monitoringManage),
            ),
          ),
        ],
      ],
    );
  }
}

class _MonitorTile extends StatelessWidget {
  const _MonitorTile({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final m = monitor;
    final skip = l10n.monitorSkip(m.lastSkipReason);
    final last = m.lastScan;
    return Padding(
      padding: const EdgeInsets.only(bottom: WlSpace.s2),
      child: WlCard(
        padding: const EdgeInsets.symmetric(horizontal: WlSpace.s3, vertical: WlSpace.s3),
        onTap: last == null ? null : () => context.push('/scan/${last.id}'),
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
            if (last != null) Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
