import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_repository.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/status_views.dart';
import 'auth_scaffold.dart';
import 'auth_captcha.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String? _error;
  bool _sent = false;
  bool _busy = false;
  final _captcha = AuthCaptchaController();

  @override
  void dispose() {
    _email.dispose();
    _captcha.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final email = _email.text.trim();
    if (!emailPattern.hasMatch(email)) return setState(() => _error = l10n.invalidEmail);
    if (!_captcha.ready) return setState(() => _error = l10n.captchaNotReady);
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      await ref.read(authRepositoryProvider).sendPasswordReset(email, captchaToken: _captcha.token);
    } on AuthFailure catch (e) {
      // Never reveal whether the account exists; the same confirmation is shown either way, except
      // when the security check failed, which says nothing about the account.
      if (e.captcha) {
        unawaited(_captcha.reset());
        if (mounted) {
          setState(() {
            _busy = false;
            _error = e.message;
          });
        }
        return;
      }
    }
    unawaited(_captcha.reset());
    if (mounted) {
      setState(() {
        _busy = false;
        _sent = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AuthScaffold(
      title: l10n.resetTitle,
      showBack: true,
      children: _sent
          ? [
              FormMessage(text: l10n.resetSent, isError: false),
              gap,
              TextButton(onPressed: () => context.go('/login'), child: Text(l10n.backToLogin)),
            ]
          : [
              if (_error != null) ...[FormMessage(text: _error!), gap],
              TextField(
                controller: _email,
                decoration: InputDecoration(labelText: l10n.emailLabel),
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                onSubmitted: (_) => _submit(),
              ),
              gap,
              AuthCaptcha(controller: _captcha),
              FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? l10n.sending : l10n.resetButton)),
            ],
    );
  }
}

/// Shown after the user opens a password-reset link (Supabase emits a passwordRecovery event).
class NewPasswordScreen extends ConsumerStatefulWidget {
  const NewPasswordScreen({super.key, this.onDone});

  /// Called after the password is saved (ends the recovery flow).
  final VoidCallback? onDone;

  @override
  ConsumerState<NewPasswordScreen> createState() => _NewPasswordScreenState();
}

class _NewPasswordScreenState extends ConsumerState<NewPasswordScreen> {
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final problems = passwordProblems(_password.text);
    if (problems.isNotEmpty) return setState(() => _error = l10n.passwordNeeds(problems.join(', ')));
    if (_password.text != _confirm.text) return setState(() => _error = l10n.passwordsDontMatch);
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      await ref.read(authRepositoryProvider).updatePassword(_password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.passwordUpdated)));
      widget.onDone?.call();
      context.go('/');
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AuthScaffold(
      title: l10n.newPasswordTitle,
      children: [
        if (_error != null) ...[FormMessage(text: _error!), gap],
        TextField(
          controller: _password,
          decoration: InputDecoration(
            labelText: l10n.newPasswordLabel,
            helperText: l10n.passwordHint,
            helperMaxLines: 2,
          ),
          obscureText: true,
          autofillHints: const [AutofillHints.newPassword],
        ),
        gap,
        TextField(
          controller: _confirm,
          decoration: InputDecoration(labelText: l10n.confirmPasswordLabel),
          obscureText: true,
          onSubmitted: (_) => _submit(),
        ),
        gap,
        FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? l10n.saving : l10n.savePassword)),
      ],
    );
  }
}

class AuthNotConfiguredScreen extends StatelessWidget {
  const AuthNotConfiguredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AuthScaffold(
      title: l10n.authNotConfiguredTitle,
      children: [Text(l10n.authNotConfiguredBody, textAlign: TextAlign.center)],
    );
  }
}
