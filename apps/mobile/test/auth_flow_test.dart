import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:weblume/auth/auth_repository.dart';
import 'package:weblume/router/app_router.dart';

import 'support/fakes.dart';
import 'support/harness.dart';

void main() {
  group('authRedirect', () {
    String? r({bool configured = true, bool signedIn = false, bool recovering = false, required String at}) =>
        authRedirect(configured: configured, signedIn: signedIn, recovering: recovering, location: at);

    test('sends everyone to the not-configured screen without Supabase config', () {
      expect(r(configured: false, at: '/'), Routes.notConfigured);
      expect(r(configured: false, at: Routes.notConfigured), isNull);
    });
    test('requires sign-in for app routes', () {
      expect(r(at: '/'), Routes.login);
      expect(r(at: '/scan/abc'), Routes.login);
      expect(r(at: Routes.signup), isNull);
    });
    test('keeps signed-in users out of auth screens', () {
      expect(r(signedIn: true, at: Routes.login), Routes.dashboard);
      expect(r(signedIn: true, at: '/history'), isNull);
    });
    test('the new-scan route isn’t captured by the report route', () {
      expect(Routes.newScan.startsWith('/scan/'), isFalse);
    });
    test('forces the new-password screen during recovery', () {
      expect(r(signedIn: true, recovering: true, at: '/'), Routes.resetPassword);
    });
  });

  testWidgets('shows the not-configured screen when the build has no auth config', (tester) async {
    await pumpApp(tester, auth: FakeAuth(configured: false));
    expect(find.text('Accounts aren’t configured'), findsOneWidget);
  });

  testWidgets('log in: validation, wrong credentials, then success to the dashboard', (tester) async {
    final auth = FakeAuth();
    await pumpApp(tester, auth: auth);
    expect(find.widgetWithText(FilledButton, 'Log in'), findsOneWidget);

    await tapText(tester, 'Log in');
    expect(find.text('Enter your email and password.'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'asha@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'wrong');
    auth.signInError = AuthFailure('Incorrect email or password.');
    await tester.tap(find.widgetWithText(FilledButton, 'Log in'));
    await settle(tester);
    expect(find.text('Incorrect email or password.'), findsOneWidget);

    auth.signInError = null;
    await tester.tap(find.widgetWithText(FilledButton, 'Log in'));
    await settle(tester);
    expect(find.text('Free plan'), findsOneWidget);
    expect(find.text('2 of 5 used'), findsOneWidget);
    expect(auth.calls, contains('signIn:asha@example.com'));
  });

  testWidgets('sign up checks the password and asks to confirm the email', (tester) async {
    final auth = FakeAuth();
    await pumpApp(tester, auth: auth);
    await tapText(tester, 'Create a free account');
    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'new@example.com');
    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'short');
    await tapText(tester, 'Create account');
    expect(find.textContaining('Your password needs at least 10 characters'), findsOneWidget);
    expect(auth.calls, isEmpty);

    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'Correct-horse-1');
    await tapText(tester, 'Create account');
    expect(find.text('Check your email'), findsOneWidget);
    expect(auth.calls, ['signUp:new@example.com']);
  });

  testWidgets('forgot password always shows the same confirmation', (tester) async {
    final auth = FakeAuth();
    await pumpApp(tester, auth: auth);
    await tapText(tester, 'Forgot your password?');
    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'maybe@example.com');
    await tapText(tester, 'Send reset link');
    expect(find.textContaining('If an account exists for that email'), findsOneWidget);
    expect(auth.calls, ['reset:maybe@example.com']);
  });

  testWidgets('a password-recovery link leads to the new-password screen', (tester) async {
    final auth = FakeAuth(signedIn: true);
    await pumpApp(tester, auth: auth);
    auth.emit(AuthEvent.passwordRecovery);
    await settle(tester);
    expect(find.text('Choose a new password'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'New-password-9');
    await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'Different-9xyz');
    await tapText(tester, 'Save new password');
    expect(find.text('The passwords don’t match.'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'Confirm new password'), 'New-password-9');
    await tapText(tester, 'Save new password');
    expect(auth.calls, contains('updatePassword'));
    expect(find.text('Free plan'), findsOneWidget);
  });
}
