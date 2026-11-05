import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/router/app_router.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

Brightness _brightness(WidgetTester tester) => Theme.of(tester.element(find.byType(NavigationBar))).brightness;

Future<void> _openAccount(WidgetTester tester) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
  await settle(tester);
}

void main() {
  testWidgets('dark mode can be chosen in the app and is remembered', (tester) async {
    final store = FakeThemeModeStore();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), themeStore: store);
    await _openAccount(tester);
    expect(_brightness(tester), Brightness.light);

    await scrollTo(tester, find.text('Dark'));
    await tapText(tester, 'Dark');
    expect(_brightness(tester), Brightness.dark);
    expect(store.saved, ThemeMode.dark);

    await tapText(tester, 'Phone');
    expect(_brightness(tester), Brightness.light);
    expect(store.saved, ThemeMode.system);
  });

  testWidgets('a saved choice applies on the next launch, over the phone’s setting', (tester) async {
    await pumpApp(
      tester,
      auth: FakeAuth(signedIn: true),
      themeStore: FakeThemeModeStore(ThemeMode.dark),
      brightness: Brightness.light,
    );
    expect(_brightness(tester), Brightness.dark);
  });

  testWidgets('privacy and terms open on their own screen with a proper title', (tester) async {
    await pumpApp(tester, auth: FakeAuth(signedIn: true));
    await _openAccount(tester);
    await scrollTo(tester, find.text('Privacy policy'));
    await tapText(tester, 'Privacy policy');
    expect(find.widgetWithText(AppBar, 'Privacy policy'), findsOneWidget);
    // Widget tests have no web view, so the screen offers the browser instead.
    expect(find.text('Open in browser'), findsWidgets);

    await tester.tap(find.byType(BackButton));
    await settle(tester);
    await scrollTo(tester, find.text('Terms of service'));
    await tapText(tester, 'Terms of service');
    expect(find.widgetWithText(AppBar, 'Terms of service'), findsOneWidget);
  });

  test('legal pages are open to everyone, other unknown pages are not', () {
    String? r({required bool signedIn, required String at}) =>
        authRedirect(configured: true, signedIn: signedIn, recovering: false, location: at);
    expect(r(signedIn: false, at: '/legal/privacy'), isNull);
    expect(r(signedIn: true, at: '/legal/terms'), isNull);
  });
}
