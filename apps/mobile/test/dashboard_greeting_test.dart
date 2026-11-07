import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/features/dashboard/dashboard_screen.dart';
import 'package:weblume/l10n/app_localizations_en.dart';

import 'support/fakes.dart';

void main() {
  final l10n = AppLocalizationsEn();
  final created = DateTime.parse('2026-10-01T00:00:00.000Z');

  test('a brand-new account is welcomed, not welcomed back', () {
    final now = created.add(const Duration(minutes: 5));
    expect(dashboardGreeting(l10n, fakeAccount(), now: now), 'Welcome to Weblume');
  });

  test('a returning account is welcomed back', () {
    final now = created.add(const Duration(days: 2));
    expect(dashboardGreeting(l10n, fakeAccount(), now: now), 'Welcome back');
  });

  test('a name wins over both', () {
    expect(dashboardGreeting(l10n, fakeAccount(name: 'Asha'), now: created), 'Hi, Asha');
  });
}
