import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/data/weblume_repository.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

Loaded<MonitorListResponse> monitors(List<Map<String, dynamic>> items, {int limit = 1, String? fastest = 'weekly'}) =>
    Loaded(MonitorListResponse.fromJson({'items': items, 'limit': limit, 'fastestFrequency': fastest}));

void main() {
  testWidgets('dashboard lists monitored sites with their schedule', (tester) async {
    final repo = FakeRepository()
      ..monitorsResult = monitors(
        [
          monitorJson('m1', lastScan: summaryJson('s1')),
          monitorJson('m2', url: 'https://shop.example.com/', enabled: false, skip: 'plan_limit'),
        ],
        limit: 5,
        fastest: 'daily',
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await scrollTo(tester, find.text('Monitor a site'));

    expect(find.text('Monitoring'), findsOneWidget);
    expect(find.text('2 of 5 monitored'), findsOneWidget);
    expect(find.textContaining('Every week · next scan'), findsOneWidget);
    expect(find.text('Every week · Paused'), findsOneWidget);
    expect(find.text('Paused: your plan includes fewer monitored sites.'), findsOneWidget);
    expect(find.text('https://shop.example.com/'), findsOneWidget);
    expect(repo.calls, contains('monitors'));
  });

  testWidgets('adds a monitored site from the dashboard', (tester) async {
    final repo = FakeRepository();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await scrollTo(tester, find.text('Monitor a site'));
    expect(find.textContaining('Scheduled scans don’t use your monthly scans'), findsOneWidget);

    await tapText(tester, 'Monitor a site');
    // Free plan: weekly at most, so daily isn't offered.
    expect(find.text('Every week'), findsOneWidget);
    expect(find.text('Every month'), findsOneWidget);
    expect(find.text('Every day'), findsNothing);

    await tapText(tester, 'Start monitoring');
    expect(find.text('Enter a website address, for example example.com.'), findsOneWidget);

    await tester.enterText(find.byType(TextField).last, 'shop.example.com');
    // Each email choice is explained under the options.
    expect(find.textContaining('a score moves by 5 points or more'), findsOneWidget);
    await tapText(tester, 'Never (just scan)');
    expect(find.textContaining('but never email you'), findsOneWidget);
    await tapText(tester, 'New issues appear');
    expect(find.textContaining('an issue that wasn’t there last time'), findsOneWidget);
    await tapText(tester, 'Start monitoring');
    expect(repo.calls, contains('createMonitor:shop.example.com:weekly:new_findings'));
    expect(find.text('Monitoring started. We’ll email you when something changes.'), findsOneWidget);
    expect(find.text('shop.example.com'), findsOneWidget);
    // The free plan's one slot is now used.
    await scrollTo(tester, find.text('Your plan’s monitored site is in use. Stop it to add a different one.'));
  });

  testWidgets('changes, pauses and stops a monitored site', (tester) async {
    final repo = FakeRepository()
      ..monitorsResult = monitors([monitorJson('m1', lastScan: summaryJson('s1'))], limit: 5, fastest: 'daily');
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await scrollTo(tester, find.text('https://example.com/').last);
    await tester.tap(find.text('https://example.com/').last);
    await settle(tester);
    expect(find.text('Monitoring settings'), findsOneWidget);

    await tapText(tester, 'Every day');
    expect(repo.calls, contains('updateMonitor:m1::daily:'));

    await tapText(tester, 'Pause');
    expect(repo.calls, contains('updateMonitor:m1:false::'));
    expect(find.text('No scans or emails while paused.'), findsOneWidget);

    await tapText(tester, 'Stop monitoring');
    expect(find.text('Stop monitoring this site?'), findsOneWidget);
    await tapText(tester, 'Cancel');
    expect(repo.calls.where((c) => c.startsWith('removeMonitor')), isEmpty);

    await tapText(tester, 'Stop monitoring');
    await tester.tap(find.widgetWithText(FilledButton, 'Stop monitoring'));
    await settle(tester);
    expect(repo.calls, contains('removeMonitor:m1'));
    expect(find.text('Monitoring settings'), findsNothing);
  });

  testWidgets('monitoring stays hidden for plans without it and when it fails to load', (tester) async {
    final repo = FakeRepository()..monitorsResult = monitors([], limit: 0, fastest: null);
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    expect(find.text('Monitoring'), findsNothing);

    final failing = FakeRepository()..monitorsResult = ApiException(message: 'offline');
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: failing);
    expect(find.text('Monitoring'), findsNothing);
    expect(find.text('Free plan'), findsOneWidget);
  });

  test('monitor JSON round-trips through the generated model', () {
    final m = Monitor.fromJson(monitorJson('m1', frequency: 'daily'));
    expect(m.frequency, EntitlementsMonitorFrequency.daily);
    expect(m.alert, MonitorAlert.anyChange);
    expect(Monitor.fromJson(m.toJson()).normalizedUrl, 'https://example.com/');
  });
}
