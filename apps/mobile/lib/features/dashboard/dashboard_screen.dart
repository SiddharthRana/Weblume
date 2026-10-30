import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../router/app_router.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/logo.dart';
import '../../shared/widgets/scan_tile.dart';
import '../../shared/widgets/status_views.dart';
import '../../shared/widgets/usage_meter.dart';
import '../../theme/tokens.g.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final account = ref.watch(accountProvider);
    final scans = ref.watch(recentScansProvider);
    final offline = (account.value?.fromCache ?? false) || (scans.value?.fromCache ?? false);

    Future<void> refresh() async {
      ref.invalidate(accountProvider);
      ref.invalidate(recentScansProvider);
      await Future.wait(
        [ref.read(accountProvider.future), ref.read(recentScansProvider.future)].map((f) => f.catchError((_) => f)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [const WeblumeMark(), const SizedBox(width: 8), Text(l10n.appTitle)],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(Routes.newScan),
        icon: const Icon(Icons.add),
        label: Text(l10n.navNewScan),
      ),
      body: Column(
        children: [
          if (offline) const OfflineBanner(),
          Expanded(
            child: account.when(
              loading: () => const LoadingView(),
              error: (e, _) => ErrorView(message: l10n.apiError(e), onRetry: () => ref.invalidate(accountProvider)),
              data: (loaded) {
                final a = loaded.data;
                return RefreshIndicator(
                  onRefresh: refresh,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s4, WlSpace.s4, 96),
                    children: [
                      Text(
                        a.displayName != null ? l10n.dashboardGreeting(a.displayName!) : l10n.dashboardWelcome,
                        style: theme.textTheme.headlineMedium,
                      ),
                      const SizedBox(height: WlSpace.s4),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(WlSpace.s4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l10n.planName(a.plan.name), style: theme.textTheme.titleLarge),
                              Text(
                                a.entitlements.retentionDays >= 365
                                    ? l10n.retentionYear
                                    : l10n.retentionDays(a.entitlements.retentionDays),
                                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                              ),
                              const SizedBox(height: WlSpace.s4),
                              UsageMeter(used: a.usage.used, limit: a.usage.limit, resetsAt: a.usage.resetsAt),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: WlSpace.s6),
                      Row(
                        children: [
                          Expanded(
                            child: Semantics(
                              header: true,
                              child: Text(l10n.recentScans, style: theme.textTheme.titleLarge),
                            ),
                          ),
                          TextButton(onPressed: () => context.go(Routes.history), child: Text(l10n.viewAll)),
                        ],
                      ),
                      scans.when(
                        loading: () => const Padding(padding: EdgeInsets.all(WlSpace.s6), child: LoadingView()),
                        error: (e, _) => FormMessage(text: l10n.apiError(e)),
                        data: (s) => s.data.items.isEmpty
                            ? SizedBox(
                                height: 220,
                                child: EmptyState(
                                  icon: Icons.insights_outlined,
                                  title: l10n.dashboardEmptyTitle,
                                  body: l10n.dashboardEmptyBody,
                                ),
                              )
                            : Card(
                                clipBehavior: Clip.antiAlias,
                                child: Column(children: [for (final scan in s.data.items) ScanTile(scan: scan)]),
                              ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
