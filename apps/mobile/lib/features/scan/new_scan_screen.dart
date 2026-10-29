import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../shared/widgets/empty_state.dart';

class NewScanScreen extends StatelessWidget {
  const NewScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.newScanTitle)),
      body: EmptyState(
        icon: Icons.travel_explore_outlined,
        title: l10n.newScanUnavailableTitle,
        body: l10n.newScanUnavailableBody,
      ),
    );
  }
}
