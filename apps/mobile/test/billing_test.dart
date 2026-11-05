import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/billing/billing_gateway.dart';
import 'package:weblume/data/weblume_repository.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

Future<void> openSubscription(WidgetTester tester) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
  await settle(tester);
  await scrollTo(tester, find.text('Upgrade to Starter'));
  await tester.tap(find.text('Upgrade to Starter'));
  await settle(tester);
}

void main() {
  test('maps base plan ids to intervals', () {
    expect(intervalForBasePlan('monthly'), StoreInterval.monthly);
    expect(intervalForBasePlan('starter-annual'), StoreInterval.annual);
    expect(intervalForBasePlan('yearly'), StoreInterval.annual);
    expect(intervalForBasePlan('weekly'), isNull);
  });

  testWidgets('buys a subscription, verifies it on the server, then completes it', (tester) async {
    final repo = FakeRepository();
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, billing: store);
    await openSubscription(tester);

    expect(find.text('60 scans per billing period'), findsOneWidget);
    expect(find.text('₹149.00 / month'), findsOneWidget);
    expect(find.text('₹1,199.00 / year'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Subscribe').last);
    await settle(tester);
    expect(store.bought, ['annual:ref-123']);

    store.emit(const StorePurchaseUpdate(status: StorePurchaseStatus.pending));
    await settle(tester);
    expect(find.text('Waiting for your payment'), findsOneWidget);

    repo.verifyGate = Completer();
    store.emit(const StorePurchaseUpdate(status: StorePurchaseStatus.purchased, purchaseToken: 'tok-1'));
    await settle(tester);
    expect(find.text('Confirming your purchase'), findsOneWidget);
    expect(store.completed, isEmpty);

    repo.verifyGate!.complete();
    await settle(tester);
    expect(repo.calls, contains('verify:tok-1'));
    expect(store.completed, ['tok-1']); // only after server verification
    expect(find.text('You’re on Starter'), findsOneWidget);
    expect(find.text('Thank you! Your new limits and features are ready to use.'), findsOneWidget);
  });

  testWidgets('does not complete a purchase the server rejects', (tester) async {
    final repo = FakeRepository()
      ..verifyResult = ApiException(statusCode: 403, code: 'purchase_account_mismatch', message: 'x');
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, billing: store);
    await openSubscription(tester);
    store.emit(const StorePurchaseUpdate(status: StorePurchaseStatus.purchased, purchaseToken: 'tok-2'));
    await settle(tester);
    expect(find.text('This Google Play purchase belongs to a different Weblume account.'), findsOneWidget);
    expect(store.completed, isEmpty);
  });

  testWidgets('keeps unverified purchases for a later retry when offline', (tester) async {
    final repo = FakeRepository()..verifyResult = ApiException(message: 'offline');
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, billing: store);
    await openSubscription(tester);
    store.emit(const StorePurchaseUpdate(status: StorePurchaseStatus.purchased, purchaseToken: 'tok-3'));
    await settle(tester);
    expect(find.text('Still confirming your purchase'), findsOneWidget);
    expect(find.textContaining('It will be checked again automatically'), findsOneWidget);
    expect(store.completed, isEmpty);
    // "Try again" checks it right away instead of waiting.
    await tapText(tester, 'Try again');
    expect(store.restores, 1);
  });

  testWidgets('a cancelled or failed purchase is finished and explained', (tester) async {
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), billing: store);
    await openSubscription(tester);
    store.emit(
      const StorePurchaseUpdate(status: StorePurchaseStatus.error, purchaseToken: 'tok-4', errorMessage: 'declined'),
    );
    await settle(tester);
    expect(find.text('Purchase not completed'), findsOneWidget);
    expect(find.text('The purchase didn’t go through. You haven’t been charged.'), findsOneWidget);
    expect(find.text('Try again'), findsNothing); // the Subscribe buttons are the way to retry
    expect(store.completed, ['tok-4']);
  });

  testWidgets('warns about a second subscription on another channel', (tester) async {
    final repo = FakeRepository()
      ..verifyResult = PlayVerifyResponse.fromJson({
        'planId': 'starter',
        'status': 'active',
        'duplicateSubscription': true,
      });
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, billing: store);
    await openSubscription(tester);
    store.emit(const StorePurchaseUpdate(status: StorePurchaseStatus.purchased, purchaseToken: 'tok-5'));
    await settle(tester);
    expect(find.textContaining('more than one active subscription'), findsOneWidget);
  });

  testWidgets('explains when Google Play Billing is unavailable', (tester) async {
    final store = FakeBillingGateway()..available = false;
    await pumpApp(tester, auth: FakeAuth(signedIn: true), billing: store);
    await openSubscription(tester);
    expect(find.textContaining('Google Play Billing isn’t available'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Subscribe'), findsNothing);
  });

  testWidgets('restores purchases on request', (tester) async {
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), billing: store);
    await openSubscription(tester);
    await scrollTo(tester, find.text('Restore purchases'));
    await tapText(tester, 'Restore purchases');
    expect(store.restores, 1);
  });

  testWidgets('hides the upgrade while billing is off', (tester) async {
    final repo = FakeRepository()..billingConfigResult = fakeBillingConfig(enabled: false);
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
    await settle(tester);
    expect(find.text('Upgrade to Starter'), findsNothing);
    expect(find.textContaining('Paid plans with more scans'), findsOneWidget);
  });

  testWidgets('never sells a second subscription to a web subscriber', (tester) async {
    final repo = FakeRepository()..accountResult = Loaded(accountWithSubs([subscriptionJson(provider: 'paddle')]));
    final store = FakeBillingGateway();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, billing: store);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
    await settle(tester);
    expect(find.textContaining('Web · Active'), findsOneWidget);
    await scrollTo(tester, find.text('Manage subscription'));
    await tapText(tester, 'Manage subscription');
    expect(find.textContaining('subscribed through the Weblume website'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Subscribe'), findsNothing);
    expect(store.bought, isEmpty);
  });

  testWidgets('lists only current subscriptions, not declined or ended attempts', (tester) async {
    final repo = FakeRepository()
      ..accountResult = Loaded(
        accountWithSubs([
          subscriptionJson(provider: 'dodo', status: 'expired'),
          subscriptionJson(provider: 'dodo', status: 'expired'),
          subscriptionJson(provider: 'dodo'),
        ]),
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
    await settle(tester);
    expect(find.textContaining('Web · Active'), findsOneWidget);
    expect(find.textContaining('Ended'), findsNothing);
  });
}
