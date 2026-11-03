import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/data/weblume_repository.dart';
import 'package:weblume/features/scan/scan_screen.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

Future<void> goToTab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
  await settle(tester);
}

void main() {
  testWidgets('dashboard shows plan, usage and recent scans', (tester) async {
    final repo = FakeRepository()
      ..accountResult = Loaded(fakeAccount(used: 5, limit: 5, name: 'Asha'))
      ..scansResult = Loaded(
        ScanListResponse.fromJson({
          'items': [summaryJson('a')],
          'nextCursor': null,
        }),
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    expect(find.text('Hi, Asha'), findsOneWidget);
    expect(find.text('5 of 5 used'), findsOneWidget);
    expect(find.textContaining('No scans left'), findsOneWidget);
    expect(find.text('https://example.com/'), findsOneWidget);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('dashboard shows an error with retry when the API fails', (tester) async {
    final repo = FakeRepository()..accountResult = ApiException(message: 'offline');
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    expect(find.text('We couldn’t reach Weblume. Check your connection and try again.'), findsOneWidget);
    repo.accountResult = Loaded(fakeAccount());
    await tapText(tester, 'Try again');
    expect(find.text('Free plan'), findsOneWidget);
  });

  testWidgets('new scan: validates, starts, polls progress and shows the report', (tester) async {
    final repo = FakeRepository()
      ..reports['s1'] = [
        loadedReport('s1', status: 'queued'),
        loadedReport('s1', status: 'running'),
        loadedReport('s1'),
      ];
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await goToTab(tester, 'New scan');

    await tester.enterText(find.byType(TextField), 'ftp://example.com');
    await tapText(tester, 'Scan website');
    expect(find.text('Only http:// and https:// addresses can be scanned.'), findsOneWidget);
    expect(repo.calls.where((c) => c.startsWith('create')), isEmpty);

    await tester.enterText(find.byType(TextField), '  Example.com  ');
    await tester.tap(find.text('Scan website'));
    await settle(tester);
    expect(repo.calls, contains('create:https://example.com/'));
    expect(find.text('Waiting to start…'), findsOneWidget);

    await tester.pump(ScanScreen.pollInterval);
    await settle(tester);
    expect(find.text('Scan in progress…'), findsOneWidget);

    await tester.pump(ScanScreen.pollInterval);
    await settle(tester);
    expect(find.bySemanticsLabel(RegExp(r'Performance: 61 out of 100, Needs work')), findsOneWidget);
    await scrollTo(tester, find.text('Start here: top priorities'));
    expect(repo.calls.where((c) => c == 'report:s1'), hasLength(3));

    // Category filter.
    await scrollTo(tester, find.text('SEO (1)'));
    await tester.tap(find.text('SEO (1)'));
    await settle(tester);
    expect(find.text('Page has no meta description'), findsWidgets);
    expect(find.widgetWithText(ChoiceChip, 'SEO (1)'), findsOneWidget);
    expect(tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'SEO (1)')).selected, isTrue);

    // Back to all findings, then open one to see its detail and evidence.
    // The list got shorter, so the chips may have scrolled up out of view.
    await scrollTo(tester, find.text('All (2)'), delta: -300);
    await tester.tap(find.text('All (2)'));
    await settle(tester);
    await scrollTo(tester, find.text('Some links on this page are broken').last);
    await tester.tap(find.text('Some links on this page are broken').last);
    await settle(tester);
    expect(find.text('How to fix it'), findsOneWidget);
    expect(find.text('https://example.com/old → HTTP 404'), findsOneWidget);
  });

  testWidgets('quota errors from the API are shown on the form', (tester) async {
    final repo = FakeRepository()
      ..createResult = ApiException(
        statusCode: 429,
        code: 'quota_exceeded',
        message: 'You’ve used all 5 scans included in your Free plan for this period.',
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await goToTab(tester, 'New scan');
    await tester.enterText(find.byType(TextField), 'example.com');
    await tapText(tester, 'Scan website');
    expect(find.textContaining('You’ve used all 5 scans'), findsOneWidget);
  });

  testWidgets('a failed scan is explained honestly and can be retried', (tester) async {
    final repo = FakeRepository()
      ..reports['s1'] = [loadedReport('s1', status: 'failed')]
      ..reports['s2'] = [loadedReport('s2')];
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await goToTab(tester, 'New scan');
    await tester.enterText(find.byType(TextField), 'example.com');
    await tapText(tester, 'Scan website');
    expect(find.text('We couldn’t find that website. Check the address for typos.'), findsOneWidget);
    expect(find.text('No report was produced, and no scores or findings have been estimated.'), findsOneWidget);
    await tapText(tester, 'Retry scan');
    expect(repo.calls, contains('retry:s1'));
    await scrollTo(tester, find.text('Start here: top priorities'));
  });

  testWidgets('a partial report shows no invented scores', (tester) async {
    final repo = FakeRepository()
      ..reports['s1'] = [
        Loaded(ScanReport.fromJson({...reportJson('s1', lighthouse: false), 'status': 'partial'})),
      ];
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await goToTab(tester, 'New scan');
    await tester.enterText(find.byType(TextField), 'example.com');
    await tapText(tester, 'Scan website');
    expect(find.textContaining('Some checks couldn’t be completed'), findsOneWidget);
    expect(find.textContaining('Lighthouse scores aren’t available'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('out of 100')), findsNothing);
    await scrollTo(tester, find.text('Daily quota reached. Try again later'));
    expect(find.text('Didn’t finish in time'), findsOneWidget);
  });

  testWidgets('offline: cached report is shown with a banner and retry is disabled', (tester) async {
    final repo = FakeRepository()
      ..scansResult = Loaded(
        ScanListResponse.fromJson({
          'items': [summaryJson('s9', status: 'failed')],
          'nextCursor': null,
        }),
        fromCache: true,
      )
      ..reports['s9'] = [loadedReport('s9', status: 'failed', fromCache: true)];
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    expect(find.text('You’re offline. Showing saved data.'), findsOneWidget);
    await tester.tap(find.text('https://example.com/'));
    await settle(tester);
    expect(find.text('You’re offline. Showing saved data.'), findsOneWidget);
    expect(find.text('Retry scan'), findsNothing);
  });

  testWidgets('history searches and loads more', (tester) async {
    final repo = FakeRepository()
      ..scansResult = Loaded(
        ScanListResponse.fromJson({
          'items': [summaryJson('a')],
          'nextCursor': '2026-10-29T10:00:00.000Z',
        }),
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await goToTab(tester, 'History');
    expect(find.text('Load more'), findsOneWidget);
    await tapText(tester, 'Load more');
    expect(repo.calls.last, 'scans:q=:before=2026-10-29T10:00:00.000Z');
    await tester.enterText(find.widgetWithText(TextField, 'Search by address'), 'shop');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await settle(tester);
    expect(repo.calls.last, 'scans:q=shop:before=');
  });

  testWidgets('account: saves the name, requires DELETE, deletes and signs out', (tester) async {
    final auth = FakeAuth(signedIn: true);
    final repo = FakeRepository();
    await pumpApp(tester, auth: auth, repo: repo);
    await goToTab(tester, 'Account');
    expect(find.text('Signed in as asha@example.com'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Display name'), 'Asha');
    await tapText(tester, 'Save name');
    expect(repo.calls, contains('name:Asha'));
    expect(find.text('Saved.'), findsOneWidget);

    await scrollTo(tester, find.text('Permanently delete my account'));
    await tapText(tester, 'Permanently delete my account');
    expect(find.text('Type DELETE (in capitals) to confirm.'), findsOneWidget);
    expect(repo.calls, isNot(contains('delete')));

    await tester.enterText(find.widgetWithText(TextField, 'Type "DELETE" to confirm'), 'DELETE');
    await tapText(tester, 'Permanently delete my account');
    expect(repo.calls, contains('delete'));
    expect(auth.calls, contains('signOut'));
    expect(find.text('Your account and its data have been deleted.'), findsOneWidget);
  });

  testWidgets('log out returns to the login screen and clears the cache', (tester) async {
    final auth = FakeAuth(signedIn: true);
    final repo = FakeRepository();
    await pumpApp(tester, auth: auth, repo: repo);
    await goToTab(tester, 'Account');
    await scrollTo(tester, find.text('Log out'));
    await tapText(tester, 'Log out');
    expect(find.widgetWithText(FilledButton, 'Log in'), findsOneWidget);
    expect(repo.calls, contains('clearCache'));
  });

  testWidgets('uses a navigation rail on wide screens', (tester) async {
    await pumpApp(tester, auth: FakeAuth(signedIn: true), size: const Size(1100, 800));
    expect(find.byType(NavigationRail), findsOneWidget);
  });

  for (final brightness in Brightness.values) {
    testWidgets('dashboard and report meet accessibility guidelines ($brightness)', (tester) async {
      final handle = tester.ensureSemantics();
      final repo = FakeRepository()
        ..scansResult = Loaded(
          ScanListResponse.fromJson({
            'items': [summaryJson('s1')],
            'nextCursor': null,
          }),
        )
        ..reports['s1'] = [loadedReport('s1')];
      await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo, brightness: brightness);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      await tester.tap(find.text('https://example.com/'));
      await settle(tester);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });
  }
}
