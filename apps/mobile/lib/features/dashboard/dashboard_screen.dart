import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../router/app_router.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/logo.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [const WeblumeMark(), const SizedBox(width: 8), Text(l10n.appTitle)],
        ),
      ),
      body: EmptyState(
        icon: Icons.insights_outlined,
        title: l10n.dashboardEmptyTitle,
        body: l10n.dashboardEmptyBody,
        action: FilledButton.icon(
          onPressed: () => context.go(Routes.newScan),
          icon: const Icon(Icons.add),
          label: Text(l10n.navNewScan),
        ),
      ),
    );
  }
}
