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
import '../../shared/widgets/surface.dart';
import '../../shared/widgets/usage_meter.dart';
import '../../theme/tokens.g.dart';
import 'monitoring_section.dart';

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
      ref.invalidate(monitorsProvider);
      await Future.wait(
        [
          ref.read(accountProvider.future),
          ref.read(recentScansProvider.future),
          ref.read(monitorsProvider.future),
        ].map((f) => f.catchError((_) => f)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [const WeblumeMark(), const SizedBox(width: 8), Text(l10n.appTitle)],
        ),
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
                    padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s5, WlSpace.s4, WlSpace.s8),
                    children: [
                      FadeSlideIn(
                        child: Text(
                          a.displayName != null ? l10n.dashboardGreeting(a.displayName!) : l10n.dashboardWelcome,
                          style: theme.textTheme.headlineMedium?.copyWith(letterSpacing: -0.5),
                        ),
                      ),
                      const SizedBox(height: WlSpace.s4),
                      FadeSlideIn(
                        index: 1,
                        child: GradientPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      l10n.planName(a.plan.name),
                                      style: theme.textTheme.titleLarge?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const Icon(Icons.auto_awesome, size: 20),
                                ],
                              ),
                              Text(
                                a.entitlements.retentionDays >= 365
                                    ? l10n.retentionYear
                                    : l10n.retentionDays(a.entitlements.retentionDays),
                                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white),
                              ),
                              const SizedBox(height: WlSpace.s5),
                              UsageMeter(
                                used: a.usage.used,
                                limit: a.usage.limit,
                                resetsAt: a.usage.resetsAt,
                                onGradient: true,
                              ),
                              const SizedBox(height: WlSpace.s5),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: () => context.go(Routes.newScan),
                                  icon: const Icon(Icons.add),
                                  label: Text(l10n.navNewScan),
                                  style: ElevatedButton.styleFrom(
                                    minimumSize: const Size(48, 48),
                                    backgroundColor: Colors.white,
                                    foregroundColor: const Color(0xFF2E1F8F),
                                    elevation: 0,
                                    textStyle: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WlRadius.md)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SectionTitle(
                        l10n.recentScans,
                        trailing: TextButton(onPressed: () => context.go(Routes.history), child: Text(l10n.viewAll)),
                      ),
                      scans.when(
                        loading: () => const Padding(padding: EdgeInsets.all(WlSpace.s6), child: LoadingView()),
                        error: (e, _) => FormMessage(text: l10n.apiError(e)),
                        data: (s) => s.data.items.isEmpty
                            ? WlCard(
                                child: SizedBox(
                                  height: 200,
                                  child: EmptyState(
                                    icon: Icons.insights_outlined,
                                    title: l10n.dashboardEmptyTitle,
                                    body: l10n.dashboardEmptyBody,
                                  ),
                                ),
                              )
                            : Column(
                                children: [
                                  for (final (i, scan) in s.data.items.indexed)
                                    FadeSlideIn(
                                      index: i + 2,
                                      child: ScanTile(scan: scan),
                                    ),
                                ],
                              ),
                      ),
                      const MonitoringSection(),
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
