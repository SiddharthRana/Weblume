import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';

enum StoreInterval { monthly, annual }

/// A purchasable base plan as shown by the store (price is localised by Google Play).
class StoreOffer {
  const StoreOffer({required this.basePlanId, required this.interval, required this.price, this.raw});

  final String basePlanId;
  final StoreInterval interval;
  final String price;

  /// Plugin object needed to start the purchase (null in tests).
  final Object? raw;
}

enum StorePurchaseStatus { pending, purchased, restored, error, canceled }

class StorePurchaseUpdate {
  const StorePurchaseUpdate({required this.status, this.purchaseToken, this.errorMessage, this.raw});

  final StorePurchaseStatus status;
  final String? purchaseToken;
  final String? errorMessage;
  final Object? raw;
}

/// Store boundary (Google Play via in_app_purchase). Tests use a fake.
abstract class BillingGateway {
  Future<bool> isAvailable();
  Future<List<StoreOffer>> loadOffers(String productId);

  /// [accountRef] is sent as the obfuscated account id so the server can bind the purchase to the user.
  Future<void> buy(StoreOffer offer, {required String accountRef});
  Stream<StorePurchaseUpdate> get purchases;

  /// Finishes a purchase on the device after the server verified (and acknowledged) it.
  Future<void> complete(StorePurchaseUpdate update);
  Future<void> restore();
}

StoreInterval? intervalForBasePlan(String id) {
  final lower = id.toLowerCase();
  if (RegExp('annual|year|yearly|12m').hasMatch(lower)) return StoreInterval.annual;
  if (RegExp('month|1m').hasMatch(lower)) return StoreInterval.monthly;
  return null;
}

class PlayBillingGateway implements BillingGateway {
  PlayBillingGateway(this._iap);

  final InAppPurchase _iap;

  @override
  Future<bool> isAvailable() => _iap.isAvailable();

  @override
  Future<List<StoreOffer>> loadOffers(String productId) async {
    final res = await _iap.queryProductDetails({productId});
    final offers = <StoreOffer>[];
    for (final d in res.productDetails.whereType<GooglePlayProductDetails>()) {
      final index = d.subscriptionIndex;
      final offer = index == null ? null : d.productDetails.subscriptionOfferDetails?[index];
      // Base plans only (no promotional offers) — the server maps base plans to intervals.
      if (offer == null || offer.offerId != null) continue;
      final interval = intervalForBasePlan(offer.basePlanId);
      if (interval == null) continue;
      offers.add(StoreOffer(basePlanId: offer.basePlanId, interval: interval, price: d.price, raw: d));
    }
    offers.sort((a, b) => a.interval.index.compareTo(b.interval.index));
    return offers;
  }

  @override
  Future<void> buy(StoreOffer offer, {required String accountRef}) async {
    final details = offer.raw! as GooglePlayProductDetails;
    await _iap.buyNonConsumable(
      purchaseParam: GooglePlayPurchaseParam(
        productDetails: details,
        applicationUserName: accountRef,
        offerToken: details.offerToken,
      ),
    );
  }

  @override
  Stream<StorePurchaseUpdate> get purchases => _iap.purchaseStream.expand(
    (list) => list.map(
      (p) => StorePurchaseUpdate(
        status: switch (p.status) {
          PurchaseStatus.pending => StorePurchaseStatus.pending,
          PurchaseStatus.purchased => StorePurchaseStatus.purchased,
          PurchaseStatus.restored => StorePurchaseStatus.restored,
          PurchaseStatus.canceled => StorePurchaseStatus.canceled,
          PurchaseStatus.error => StorePurchaseStatus.error,
        },
        purchaseToken: p.verificationData.serverVerificationData,
        errorMessage: p.error?.message,
        raw: p,
      ),
    ),
  );

  @override
  Future<void> complete(StorePurchaseUpdate update) async {
    final p = update.raw;
    if (p is PurchaseDetails && p.pendingCompletePurchase) await _iap.completePurchase(p);
  }

  @override
  Future<void> restore() => _iap.restorePurchases();
}

/// Used where Google Play isn't available (iOS, desktop, tests by default).
class UnavailableBillingGateway implements BillingGateway {
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<List<StoreOffer>> loadOffers(String productId) async => const [];
  @override
  Future<void> buy(StoreOffer offer, {required String accountRef}) async {}
  @override
  Stream<StorePurchaseUpdate> get purchases => const Stream.empty();
  @override
  Future<void> complete(StorePurchaseUpdate update) async {}
  @override
  Future<void> restore() async {}
}
