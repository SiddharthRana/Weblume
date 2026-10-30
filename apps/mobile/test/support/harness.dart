import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/app.dart';
import 'package:weblume/data/providers.dart';

import 'fakes.dart';

Future<void> pumpApp(
  WidgetTester tester, {
  required FakeAuth auth,
  FakeRepository? repo,
  Size size = const Size(400, 900),
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.platformBrightnessTestValue = brightness;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        repositoryProvider.overrideWithValue(repo ?? FakeRepository()),
      ],
      child: const WeblumeApp(),
    ),
  );
  await settle(tester);
}

/// Like pumpAndSettle, but safe with indeterminate progress indicators.
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text).last;
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await settle(tester);
}

/// Scrolls the visible list until [finder] is built and on screen.
Future<void> scrollTo(WidgetTester tester, Finder finder, {double delta = 300}) async {
  await tester.dragUntilVisible(finder, find.byType(Scrollable).last, Offset(0, -delta));
  await settle(tester, frames: 2);
}
