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
  AuthFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Authentication boundary. The app talks only to this interface (tests use a fake).
abstract class AuthRepository {
  bool get configured;
  AppUser? get currentUser;
  String? get accessToken;
  Stream<AuthEvent> get events;

  Future<void> signIn({required String email, required String password});

  /// Returns true if the account is ready to use, false if email confirmation is required.
  Future<bool> signUp({required String email, required String password});
  Future<void> sendPasswordReset(String email);
  Future<void> updatePassword(String password);
  Future<void> signOut();
}

/// Supabase Auth with PKCE; email links return to the app via the weblume://auth-callback deep link.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._auth);

  final sb.GoTrueClient _auth;

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
  Stream<AuthEvent> get events => _auth.onAuthStateChange.map(
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
      throw AuthFailure(describeAuthError(e.code, e.message, e.statusCode));
    } catch (_) {
      throw AuthFailure('We couldn’t reach the server. Check your connection and try again.');
    }
  }

  @override
  Future<void> signIn({required String email, required String password}) =>
      _guard(() => _auth.signInWithPassword(email: email, password: password));

  @override
  Future<bool> signUp({required String email, required String password}) => _guard(() async {
    final res = await _auth.signUp(email: email, password: password, emailRedirectTo: AppConfig.authRedirectUrl);
    return res.session != null;
  });

  @override
  Future<void> sendPasswordReset(String email) =>
      _guard(() => _auth.resetPasswordForEmail(email, redirectTo: AppConfig.authRedirectUrl));

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
  Future<void> signIn({required String email, required String password}) async => _fail();
  @override
  Future<bool> signUp({required String email, required String password}) async => _fail();
  @override
  Future<void> sendPasswordReset(String email) async => _fail();
  @override
  Future<void> updatePassword(String password) async => _fail();
  @override
  Future<void> signOut() async {}
}

/// Friendly messages that never reveal whether an account exists. Mirrors apps/web/src/lib/supabase.ts.
String describeAuthError(String? code, String message, String? status) {
  final c = code ?? '';
  if (c == 'invalid_credentials' || RegExp('invalid login credentials', caseSensitive: false).hasMatch(message)) {
    return 'Incorrect email or password.';
  }
  if (c == 'email_not_confirmed') return 'Please confirm your email address first — check your inbox.';
  if (c == 'weak_password') {
    return 'That password is too weak. Use at least 10 characters with upper- and lowercase letters and a number.';
  }
  if (c.startsWith('over_') || status == '429') return 'Too many attempts. Please wait a few minutes and try again.';
  if (c == 'same_password') return 'Choose a password different from your current one.';
  return 'Something went wrong. Please try again.';
}

/// Password rules matching supabase/config.toml and the web form.
List<String> passwordProblems(String pw) => [
  if (pw.length < 10) 'at least 10 characters',
  if (!RegExp('[a-z]').hasMatch(pw)) 'a lowercase letter',
  if (!RegExp('[A-Z]').hasMatch(pw)) 'an uppercase letter',
  if (!RegExp('[0-9]').hasMatch(pw)) 'a number',
];
