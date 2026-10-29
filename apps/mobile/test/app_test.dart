import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/app.dart';
import 'package:weblume/shared/widgets/severity_badge.dart';
import 'package:weblume/theme/app_theme.dart';

Future<void> pumpApp(WidgetTester tester, {Size size = const Size(390, 844)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(const ProviderScope(child: WeblumeApp()));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('boots to the dashboard empty state with bottom navigation on phones', (tester) async {
    await pumpApp(tester);
    expect(find.text('No scans yet'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
  });

  testWidgets('bottom navigation switches between tabs', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('History')));
    await tester.pumpAndSettle();
    expect(find.text('Scan history'), findsOneWidget);

    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Account')));
    await tester.pumpAndSettle();
    expect(find.text('How to delete your account'), findsOneWidget);
  });

  testWidgets('dashboard call to action opens the new scan tab', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'New scan'));
    await tester.pumpAndSettle();
    expect(find.text('Scanning is coming soon'), findsOneWidget);
  });

  testWidgets('uses a navigation rail on wide screens', (tester) async {
    await pumpApp(tester, size: const Size(1024, 768));
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('renders in dark mode with dark severity colours', (tester) async {
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    await pumpApp(tester);
    final context = tester.element(find.text('No scans yet'));
    expect(Theme.of(context).brightness, Brightness.dark);
    expect(Theme.of(context).extension<SeverityColors>(), same(SeverityColors.dark));
  });

  for (final brightness in Brightness.values) {
    testWidgets('meets Flutter accessibility guidelines ($brightness)', (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = brightness;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      final handle = tester.ensureSemantics();
      await pumpApp(tester);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });
  }

  testWidgets('severity badge exposes a text label to screen readers', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: Center(child: SeverityBadge(severity: Severity.critical)),
        ),
      ),
    );
    expect(find.bySemanticsLabel('Critical severity'), findsOneWidget);
    handle.dispose();
  });
}
