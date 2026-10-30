import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../api/generated/models.g.dart';
import '../../l10n/app_localizations.dart';

/// Mirrors subscriptionGrantsAccess in @weblume/shared (display only; the server decides access).
bool grantsAccess(AccountSubscription s) => switch (s.status) {
  AccountSubscriptionStatus.trialing ||
  AccountSubscriptionStatus.active ||
  AccountSubscriptionStatus.gracePeriod => true,
  AccountSubscriptionStatus.canceled => s.currentPeriodEnd != null && s.currentPeriodEnd!.isAfter(DateTime.now()),
  _ => false,
};

Uri playManageUri(BillingConfig cfg) => Uri.https('play.google.com', '/store/account/subscriptions', {
  'sku': cfg.googlePlay.subscriptionId,
  'package': cfg.googlePlay.packageName,
});

class SubscriptionStatusTile extends StatelessWidget {
  const SubscriptionStatusTile({super.key, required this.subscription});

  final AccountSubscription subscription;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final s = subscription;
    final status = switch (s.status) {
      AccountSubscriptionStatus.active => l10n.subStatusActive,
      AccountSubscriptionStatus.trialing => l10n.subStatusTrial,
      AccountSubscriptionStatus.gracePeriod => l10n.subStatusGrace,
      AccountSubscriptionStatus.onHold => l10n.subStatusOnHold,
      AccountSubscriptionStatus.paused => l10n.subStatusPaused,
      AccountSubscriptionStatus.canceled => l10n.subStatusCanceled,
      AccountSubscriptionStatus.refunded => l10n.subStatusRefunded,
      _ => l10n.subStatusEnded,
    };
    final end = s.currentPeriodEnd == null || !grantsAccess(s)
        ? ''
        : ' · ${DateFormat.yMMMd().format(s.currentPeriodEnd!.toLocal())}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.workspace_premium_outlined),
      title: const Text('Starter'),
      subtitle: Text(
        '${l10n.subscriptionStatusLine(s.provider == 'google_play' ? l10n.channelPlay : l10n.channelWeb, status)}$end',
      ),
    );
  }
}
