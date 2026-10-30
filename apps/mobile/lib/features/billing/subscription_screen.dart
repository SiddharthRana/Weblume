import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/generated/models.g.dart';
import '../../billing/billing_controller.dart';
import '../../billing/billing_gateway.dart';
import '../../config/app_config.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/surface.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/status_views.dart';
import '../../theme/tokens.g.dart';
import 'subscription_status.dart';

/// Google Play subscription purchase. Never sells a second subscription to someone already subscribed.
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  bool _requested = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final config = ref.watch(billingConfigProvider);
    final account = ref.watch(accountProvider);
    final plans = ref.watch(plansProvider);
    final billing = ref.watch(billingControllerProvider);
    final muted = theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);

    Widget body;
    if (config.isLoading || account.isLoading) {
      body = const LoadingView();
    } else if (config.hasError || account.hasError) {
      body = ErrorView(
        message: l10n.apiError(config.error ?? account.error!),
        onRetry: () {
          ref.invalidate(billingConfigProvider);
          ref.invalidate(accountProvider);
        },
      );
    } else if (!config.value!.enabled || !config.value!.googlePlay.available) {
      body = Center(
        child: Padding(
          padding: const EdgeInsets.all(WlSpace.s6),
          child: Text(l10n.subscriptionUnavailable, textAlign: TextAlign.center),
        ),
      );
    } else {
      final cfg = config.value!;
      final subs = account.value!.data.subscriptions;
      final active = subs.where(grantsAccess).toList();
      if (!_requested && active.isEmpty) {
        _requested = true;
        Future.microtask(() => ref.read(billingControllerProvider.notifier).load(cfg.googlePlay.subscriptionId));
      }
      final starter = plans.value?.where((p) => p.id == PlanId.starter).firstOrNull;
      body = ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          if (billing.phase == PurchasePhase.success) ...[
            FormMessage(text: l10n.purchaseSuccess, isError: false),
            if (billing.duplicateWarning) ...[
              const SizedBox(height: WlSpace.s2),
              FormMessage(text: l10n.purchaseDuplicate),
            ],
            const SizedBox(height: WlSpace.s4),
          ],
          if (active.isNotEmpty)
            ..._manage(context, active, cfg)
          else ...[
            if (starter != null)
              FadeSlideIn(
                child: GradientPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Starter',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const Icon(Icons.workspace_premium_outlined),
                        ],
                      ),
                      const SizedBox(height: WlSpace.s1),
                      Text(l10n.starterTagline, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white)),
                      const SizedBox(height: WlSpace.s4),
                      for (final f in [
                        l10n.planFeatureScans(starter.entitlements.scansPerPeriod),
                        l10n.planFeatureRetention,
                        l10n.planFeatureCompare,
                        l10n.planFeaturePdf,
                      ])
                        Padding(
                          padding: const EdgeInsets.only(bottom: WlSpace.s2),
                          child: Row(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check, size: 14),
                              ),
                              const SizedBox(width: WlSpace.s3),
                              Expanded(
                                child: Text(f, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white)),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            if (billing.offers.isNotEmpty) SectionTitle(l10n.choosePlan),
            ..._status(l10n, billing),
            for (final (i, offer) in billing.offers.indexed)
              FadeSlideIn(
                index: i + 1,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: WlSpace.s3),
                  child: WlCard(
                    gradientBorder: offer.interval == StoreInterval.annual,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                offer.interval == StoreInterval.annual ? l10n.offerAnnual : l10n.offerMonthly,
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                offer.interval == StoreInterval.annual
                                    ? l10n.perYear(offer.price)
                                    : l10n.perMonth(offer.price),
                                style: muted,
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: billing.phase == PurchasePhase.ready || billing.phase == PurchasePhase.error
                              ? () => ref.read(billingControllerProvider.notifier).buy(offer)
                              : null,
                          child: Text(l10n.subscribe),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            const SizedBox(height: WlSpace.s3),
            TextButton(
              onPressed: () => ref.read(billingControllerProvider.notifier).restore(),
              child: Text(l10n.restorePurchases),
            ),
            const SizedBox(height: WlSpace.s2),
            Text(l10n.playBillingNote, style: muted),
          ],
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(l10n.subscriptionTitle)),
      body: body,
    );
  }

  List<Widget> _status(AppLocalizations l10n, BillingState s) => switch (s.phase) {
    PurchasePhase.loading ||
    PurchasePhase.purchasing => const [Padding(padding: EdgeInsets.all(WlSpace.s4), child: LoadingView())],
    PurchasePhase.pending => [
      FormMessage(text: l10n.purchasePending, isError: false),
      const SizedBox(height: WlSpace.s3),
    ],
    PurchasePhase.verifying => [
      FormMessage(text: l10n.purchaseVerifying, isError: false),
      const SizedBox(height: WlSpace.s3),
    ],
    PurchasePhase.error => [
      FormMessage(
        text: switch (s.error) {
          'store_unavailable' => l10n.storeUnavailable,
          'account_mismatch' => l10n.purchaseAccountMismatch,
          'verify_failed' || 'network' => l10n.purchaseVerifyFailed,
          _ => l10n.purchaseFailed,
        },
      ),
      const SizedBox(height: WlSpace.s3),
    ],
    _ => const [],
  };

  List<Widget> _manage(BuildContext context, List<AccountSubscription> active, BillingConfig cfg) {
    final l10n = AppLocalizations.of(context);
    final play = active.any((s) => s.provider == 'google_play');
    final web = active.any((s) => s.provider != 'google_play');
    return [
      for (final s in active)
        Padding(
          padding: const EdgeInsets.only(bottom: WlSpace.s2),
          child: WlCard(child: SubscriptionStatusTile(subscription: s)),
        ),
      const SizedBox(height: WlSpace.s3),
      if (web) ...[
        Text(l10n.subscribedOnWeb),
        const SizedBox(height: WlSpace.s2),
        OutlinedButton.icon(
          onPressed: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/account'), mode: LaunchMode.externalApplication),
          icon: const Icon(Icons.open_in_new),
          label: Text(l10n.manageOnWeb),
        ),
      ],
      if (play) ...[
        const SizedBox(height: WlSpace.s3),
        Text(l10n.subscribedOnPlay),
        const SizedBox(height: WlSpace.s2),
        OutlinedButton.icon(
          onPressed: () => launchUrl(playManageUri(cfg), mode: LaunchMode.externalApplication),
          icon: const Icon(Icons.open_in_new),
          label: Text(l10n.manageInPlay),
        ),
      ],
      if (play && web) ...[const SizedBox(height: WlSpace.s3), FormMessage(text: l10n.purchaseDuplicate)],
    ];
  }
}
