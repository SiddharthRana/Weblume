import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/api/generated/api.g.dart';
import 'package:weblume/api/generated/models.g.dart';
import 'package:weblume/data/weblume_repository.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

/// Opens report s1 from the dashboard's recent scans.
Future<void> openReport(WidgetTester tester) async {
  await tester.tap(find.text('https://example.com/').first);
  await settle(tester);
}

FakeRepository repoWith({Account? account, List<Map<String, dynamic>> scans = const []}) => FakeRepository()
  ..accountResult = Loaded(account ?? starterAccount())
  ..scansResult = Loaded(
    ScanListResponse.fromJson({
      'items': [summaryJson('s1'), ...scans],
      'nextCursor': null,
    }),
  )
  ..reports['s1'] = [loadedReport('s1')];

void main() {
  testWidgets('free plan sees the upgrade note instead of share and compare', (tester) async {
    final repo = repoWith(account: fakeAccount());
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    expect(find.textContaining('part of Starter'), findsOneWidget);
    expect(find.text('Share link'), findsNothing);
    expect(find.text('Compare'), findsNothing);
  });

  testWidgets('creates a share link, copies it, and turns it off', (tester) async {
    final clipboard = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') clipboard.add((call.arguments as Map)['text'] as String);
      return null;
    });
    final repo = repoWith();
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    expect(find.text('Download PDF'), findsOneWidget);
    expect(find.text('Share PDF'), findsOneWidget);
    await tapText(tester, 'Share link');
    expect(find.text('No active links.'), findsOneWidget);

    await tester.tap(find.text('30 days'));
    await settle(tester);
    await tester.tap(find.text('90 days').last);
    await settle(tester);
    await tapText(tester, 'Create link');
    expect(repo.calls, contains('share:s1:90'));
    expect(find.text('https://weblume.test/r/tok'), findsOneWidget);
    expect(clipboard, ['https://weblume.test/r/tok']);
    expect(find.textContaining('shown only once'), findsOneWidget);

    await scrollTo(tester, find.text('Turn off'));
    await tapText(tester, 'Turn off');
    expect(repo.calls, contains('revoke:sh1'));
    expect(find.text('No active links.'), findsOneWidget);
  });

  testWidgets('share errors are explained', (tester) async {
    final repo = repoWith()
      ..createShareError = ApiException(
        statusCode: 409,
        code: 'too_many_share_links',
        message: 'This report already has 20 active share links. Revoke one first.',
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    await tapText(tester, 'Share link');
    await tapText(tester, 'Create link');
    expect(find.textContaining('already has 20 active share links'), findsOneWidget);
  });

  testWidgets('compares with an earlier scan of the same address', (tester) async {
    final repo = repoWith(
      scans: [
        {...summaryJson('s0'), 'createdAt': '2026-10-20T10:00:00.000Z'},
        summaryJson('x1', url: 'https://other.example/'),
        summaryJson('f1', status: 'failed'),
      ],
    );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    await tapText(tester, 'Compare');
    expect(repo.calls, contains('scans:q=https://example.com/:before='));
    // Only the other finished scan of the same address is offered.
    expect(find.byType(ListTile), findsOneWidget);
    await tester.tap(find.byType(ListTile));
    await settle(tester);
    expect(repo.calls, contains('compare:s0:s1'));
    expect(find.text('New issues (1)'), findsOneWidget);
    expect(find.text('40 → 61 (+21)'), findsOneWidget);
    expect(find.text('n/a → 92 (n/a)'), findsOneWidget);
    await scrollTo(tester, find.text('Resolved (1)'));
    expect(find.text('Page title is missing'), findsOneWidget);
    await scrollTo(tester, find.text('Was High'));
    // Findings open their detail page.
    await tester.tap(find.text('Page has no meta description').last);
    await settle(tester);
    expect(find.text('How to fix it'), findsOneWidget);
  });

  testWidgets('says when there is nothing to compare with', (tester) async {
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repoWith());
    await openReport(tester);
    await tapText(tester, 'Compare');
    expect(find.textContaining('no other finished scan of this address'), findsOneWidget);
  });

  testWidgets('explains the upgrade when the API refuses comparison', (tester) async {
    final repo = repoWith(scans: [summaryJson('s0')])
      ..compareResult = ApiException(
        statusCode: 403,
        code: 'upgrade_required',
        message: 'Comparing scans is part of the Starter plan.',
      );
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    await tapText(tester, 'Compare');
    await tester.tap(find.byType(ListTile));
    await settle(tester);
    expect(find.text('Comparing scans is part of the Starter plan.'), findsOneWidget);
    expect(find.text('See plans'), findsOneWidget);
  });

  testWidgets('comparison meets accessibility guidelines', (tester) async {
    final handle = tester.ensureSemantics();
    final repo = repoWith(scans: [summaryJson('s0')]);
    await pumpApp(tester, auth: FakeAuth(signedIn: true), repo: repo);
    await openReport(tester);
    await tapText(tester, 'Compare');
    await tester.tap(find.byType(ListTile));
    await settle(tester);
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
    handle.dispose();
  });
}
