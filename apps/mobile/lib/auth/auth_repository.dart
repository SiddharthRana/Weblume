import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../config/app_config.dart';

class AppUser {
  const AppUser({required this.id, this.email});
  final String id;
  final String? email;
}

enum AuthEvent { signedIn, signedOut, passwordRecovery, other }

class AuthFailure implements Exception {
  AuthFailure(this.message, {this.captcha = false});
  final String message;

  /// The Turnstile security check was missing or rejected (Supabase CAPTCHA protection).
  final bool captcha;
  @override
  String toString() => message;
}

/// Authentication boundary. The app talks only to this interface (tests use a fake).
abstract class AuthRepository {
  bool get configured;
  AppUser? get currentUser;
  String? get accessToken;
  Stream<AuthEvent> get events;

  /// [captchaToken] is the Turnstile token, required once CAPTCHA protection is on in Supabase.
  Future<void> signIn({required String email, required String password, String? captchaToken});

  /// Returns true if the account is ready to use, false if email confirmation is required.
  Future<bool> signUp({required String email, required String password, String? captchaToken});
  Future<void> sendPasswordReset(String email, {String? captchaToken});

  /// Whether "Continue with Google" is offered.
  bool get googleEnabled;

  /// Opens Google's sign-in page in the browser. It returns to the app through the
  /// weblume://auth-callback deep link, and [events] reports signedIn when it's done.
  Future<void> signInWithGoogle();

  /// Why a Google sign-in failed after Google sent the person back to the app (cancelled,
  /// sign-ups closed, an expired link), as a message to show on the sign-in screen.
  Stream<String> get googleErrors;
  Future<void> updatePassword(String password);
  Future<void> signOut();
}

/// Supabase Auth with PKCE; email links return to the app via the weblume://auth-callback deep link.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._auth) {
    // Supabase reports a failed return from Google as an error on the auth stream. Only errors that
    // arrive while a Google sign-in is under way are shown: the stream also carries token-refresh
    // failures, which aren't the person's to act on.
    _auth.onAuthStateChange.listen(
      (s) {
        if (s.event == sb.AuthChangeEvent.signedIn) _googlePending = false;
      },
      onError: (Object e) {
        if (!_googlePending || e is! sb.AuthException) return;
        _googlePending = false;
        _googleErrors.add(describeGoogleError(e.code, e.message));
      },
    );
  }

  final sb.GoTrueClient _auth;
  final _googleErrors = StreamController<String>.broadcast();
  bool _googlePending = false;

  @override
  bool get configured => true;

  @override
  AppUser? get currentUser {
    final u = _auth.currentUser;
    return u == null ? null : AppUser(id: u.id, email: u.email);
  }

  @override
  String? get accessToken => _auth.currentSession?.accessToken;

  @override
  Stream<AuthEvent> get events => _auth.onAuthStateChange
      .handleError((Object _) {})
      .map(
        (s) => switch (s.event) {
          sb.AuthChangeEvent.signedIn => AuthEvent.signedIn,
          sb.AuthChangeEvent.signedOut => AuthEvent.signedOut,
          sb.AuthChangeEvent.passwordRecovery => AuthEvent.passwordRecovery,
          _ => AuthEvent.other,
        },
      );

  Future<T> _guard<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on sb.AuthException catch (e) {
      throw AuthFailure(describeAuthError(e.code, e.message, e.statusCode), captcha: isCaptchaError(e.code, e.message));
    } catch (_) {
      throw AuthFailure('We couldn’t reach the server. Check your connection and try again.');
    }
  }

  @override
  Future<void> signIn({required String email, required String password, String? captchaToken}) =>
      _guard(() => _auth.signInWithPassword(email: email, password: password, captchaToken: captchaToken));

  @override
  Future<bool> signUp({required String email, required String password, String? captchaToken}) => _guard(() async {
    final res = await _auth.signUp(
      email: email,
      password: password,
      emailRedirectTo: AppConfig.authRedirectUrl,
      captchaToken: captchaToken,
    );
    return res.session != null;
  });

  @override
  Future<void> sendPasswordReset(String email, {String? captchaToken}) => _guard(
    () => _auth.resetPasswordForEmail(email, redirectTo: AppConfig.authRedirectUrl, captchaToken: captchaToken),
  );

  @override
  bool get googleEnabled => AppConfig.googleSignInEnabled;

  @override
  Stream<String> get googleErrors => _googleErrors.stream;

  @override
  Future<void> signInWithGoogle() => _guard(() async {
    _googlePending = true;
    final opened = await _auth.signInWithOAuth(
      sb.OAuthProvider.google,
      redirectTo: AppConfig.authRedirectUrl,
      authScreenLaunchMode: sb.LaunchMode.externalApplication,
    );
    if (!opened) {
      _googlePending = false;
      throw AuthFailure('We couldn’t open Google sign-in. Please try again.');
    }
  });

  @override
  Future<void> updatePassword(String password) => _guard(() => _auth.updateUser(sb.UserAttributes(password: password)));

  @override
  Future<void> signOut() => _guard(() => _auth.signOut());
}

/// Used when the build has no Supabase configuration.
class UnconfiguredAuthRepository implements AuthRepository {
  @override
  bool get configured => false;
  @override
  AppUser? get currentUser => null;
  @override
  String? get accessToken => null;
  @override
  Stream<AuthEvent> get events => const Stream.empty();
  Never _fail() => throw AuthFailure('Accounts aren’t configured for this build.');
  @override
  Future<void> signIn({required String email, required String password, String? captchaToken}) async => _fail();
  @override
  Future<bool> signUp({required String email, required String password, String? captchaToken}) async => _fail();
  @override
  Future<void> sendPasswordReset(String email, {String? captchaToken}) async => _fail();
  @override
  Future<void> updatePassword(String password) async => _fail();
  @override
  bool get googleEnabled => false;
  @override
  Future<void> signInWithGoogle() async => _fail();
  @override
  Stream<String> get googleErrors => const Stream.empty();
  @override
  Future<void> signOut() async {}
}

/// Friendly messages that never reveal whether an account exists. Mirrors apps/web/src/lib/supabase.ts.
bool isCaptchaError(String? code, String message) =>
    code == 'captcha_failed' || RegExp('captcha', caseSensitive: false).hasMatch(message);

String describeAuthError(String? code, String message, String? status) {
  final c = code ?? '';
  if (isCaptchaError(code, message)) {
    return 'The security check didn’t go through. Complete it again, then try again.';
  }
  if (c == 'invalid_credentials' || RegExp('invalid login credentials', caseSensitive: false).hasMatch(message)) {
    return 'Incorrect email or password.';
  }
  if (c == 'email_not_confirmed') return 'Please confirm your email address first. Check your inbox.';
  if (c == 'weak_password') {
    return 'That password is too weak. Use at least 10 characters with upper- and lowercase letters and a number.';
  }
  if (c.startsWith('over_') || status == '429') return 'Too many attempts. Please wait a few minutes and try again.';
  if (c == 'same_password') return 'Choose a password different from your current one.';
  return 'Something went wrong. Please try again.';
}

/// Messages for a Google sign-in that came back with an error ([code] is the OAuth error, such as
/// access_denied when the person cancels on Google's page).
String describeGoogleError(String? code, String message) {
  if (RegExp('signups? not allowed', caseSensitive: false).hasMatch(message)) {
    return 'New accounts can’t be created right now. Log in with an existing account instead.';
  }
  if (code == 'access_denied') return 'Google sign-in was cancelled.';
  return 'Google sign-in didn’t finish. Please try again.';
}

/// Password rules matching supabase/config.toml and the web form.
List<String> passwordProblems(String pw) => [
  if (pw.length < 10) 'at least 10 characters',
  if (!RegExp('[a-z]').hasMatch(pw)) 'a lowercase letter',
  if (!RegExp('[A-Z]').hasMatch(pw)) 'an uppercase letter',
  if (!RegExp('[0-9]').hasMatch(pw)) 'a number',
];
