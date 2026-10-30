import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/generated/api.g.dart';
import '../data/providers.dart';
import 'billing_gateway.dart';

/// Overridden in main.dart with the Google Play gateway on Android.
final billingGatewayProvider = Provider<BillingGateway>((ref) => UnavailableBillingGateway());

enum PurchasePhase { idle, loading, ready, purchasing, pending, verifying, success, error }

class BillingState {
  const BillingState({
    this.phase = PurchasePhase.idle,
    this.offers = const [],
    this.error,
    this.duplicateWarning = false,
  });

  final PurchasePhase phase;
  final List<StoreOffer> offers;

  /// Error code: store_unavailable, purchase_failed, account_mismatch, verify_failed, network.
  final String? error;
  final bool duplicateWarning;

  BillingState copyWith({PurchasePhase? phase, List<StoreOffer>? offers, String? error, bool? duplicateWarning}) =>
      BillingState(
        phase: phase ?? this.phase,
        offers: offers ?? this.offers,
        error: error,
        duplicateWarning: duplicateWarning ?? this.duplicateWarning,
      );
}

/// Drives Google Play purchases: buy → store result → server verification → complete on device.
/// A purchase is only completed (finished) after the server has verified and acknowledged it, so an
/// interrupted flow is redelivered by Play on the next launch and verified then.
class BillingController extends Notifier<BillingState> {
  StreamSubscription<StorePurchaseUpdate>? _sub;

  @override
  BillingState build() {
    final gateway = ref.watch(billingGatewayProvider);
    _sub = gateway.purchases.listen(_onUpdate);
    ref.onDispose(() => _sub?.cancel());
    return const BillingState();
  }

  Future<void> load(String productId) async {
    state = state.copyWith(phase: PurchasePhase.loading);
    final gateway = ref.read(billingGatewayProvider);
    try {
      if (!await gateway.isAvailable()) {
        state = state.copyWith(phase: PurchasePhase.error, error: 'store_unavailable');
        return;
      }
      final offers = await gateway.loadOffers(productId);
      state = state.copyWith(
        phase: offers.isEmpty ? PurchasePhase.error : PurchasePhase.ready,
        offers: offers,
        error: offers.isEmpty ? 'store_unavailable' : null,
      );
    } catch (_) {
      state = state.copyWith(phase: PurchasePhase.error, error: 'store_unavailable');
    }
  }

  Future<void> buy(StoreOffer offer) async {
    state = state.copyWith(phase: PurchasePhase.purchasing);
    try {
      final ref0 = await ref.read(repositoryProvider).playAccountRef();
      await ref.read(billingGatewayProvider).buy(offer, accountRef: ref0);
    } on ApiException catch (e) {
      state = state.copyWith(phase: PurchasePhase.error, error: e.isNetworkError ? 'network' : 'purchase_failed');
    } catch (_) {
      state = state.copyWith(phase: PurchasePhase.error, error: 'purchase_failed');
    }
  }

  Future<void> restore() => ref.read(billingGatewayProvider).restore();

  Future<void> _onUpdate(StorePurchaseUpdate update) async {
    final gateway = ref.read(billingGatewayProvider);
    switch (update.status) {
      case StorePurchaseStatus.pending:
        state = state.copyWith(phase: PurchasePhase.pending);
      case StorePurchaseStatus.canceled:
        await gateway.complete(update);
        state = state.copyWith(phase: state.offers.isEmpty ? PurchasePhase.idle : PurchasePhase.ready);
      case StorePurchaseStatus.error:
        await gateway.complete(update);
        state = state.copyWith(phase: PurchasePhase.error, error: 'purchase_failed');
      case StorePurchaseStatus.purchased:
      case StorePurchaseStatus.restored:
        final token = update.purchaseToken;
        if (token == null || token.isEmpty) return;
        state = state.copyWith(phase: PurchasePhase.verifying);
        try {
          final res = await ref.read(repositoryProvider).verifyPlayPurchase(token);
          await gateway.complete(update);
          ref.invalidate(accountProvider);
          state = state.copyWith(phase: PurchasePhase.success, duplicateWarning: res.duplicateSubscription);
        } on ApiException catch (e) {
          // Not completed: Play redelivers it and we retry verification later.
          state = state.copyWith(
            phase: PurchasePhase.error,
            error: e.code == 'purchase_account_mismatch'
                ? 'account_mismatch'
                : e.isNetworkError
                ? 'network'
                : 'verify_failed',
          );
        }
    }
  }
}

final billingControllerProvider = NotifierProvider<BillingController, BillingState>(BillingController.new);

final billingConfigProvider = FutureProvider.autoDispose((ref) => ref.watch(repositoryProvider).billingConfig());

final plansProvider = FutureProvider.autoDispose((ref) => ref.watch(repositoryProvider).plans());
