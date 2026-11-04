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
    await scrollTo(tester, find.text('Manage on the website'));

    expect(find.text('Monitoring'), findsOneWidget);
    expect(find.text('2 of 5 monitored'), findsOneWidget);
    expect(find.textContaining('Every week · next scan'), findsOneWidget);
    expect(find.text('Every week · Paused'), findsOneWidget);
    expect(find.text('Paused: your plan includes fewer monitored sites.'), findsOneWidget);
    expect(find.text('https://shop.example.com/'), findsOneWidget);
    expect(repo.calls, contains('monitors'));
  });

  testWidgets('dashboard invites free users to set up monitoring on the web', (tester) async {
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: FakeRepository());
    await scrollTo(tester, find.text('Set up on the website'));
    expect(find.textContaining('Scheduled scans don’t use your monthly scans'), findsOneWidget);
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
