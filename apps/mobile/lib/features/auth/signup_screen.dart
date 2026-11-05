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

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  String? _passwordError;
  String? _sentTo;
  bool _busy = false;
  final _captcha = AuthCaptchaController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _captcha.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _error = null;
      _passwordError = null;
    });
    final email = _email.text.trim();
    if (!emailPattern.hasMatch(email)) return setState(() => _error = l10n.invalidEmail);
    final problems = passwordProblems(_password.text);
    if (problems.isNotEmpty) return setState(() => _passwordError = l10n.passwordNeeds(problems.join(', ')));
    if (!_captcha.ready) return setState(() => _error = l10n.captchaNotReady);
    setState(() => _busy = true);
    try {
      final ready = await ref
          .read(authRepositoryProvider)
          .signUp(email: email, password: _password.text, captchaToken: _captcha.token);
      // If no confirmation is required the router redirects on sign-in; otherwise ask to check email.
      if (!ready && mounted) setState(() => _sentTo = email);
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      unawaited(_captcha.reset());
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (_sentTo != null) {
      return AuthScaffold(
        title: l10n.checkEmailTitle,
        showBack: true,
        children: [
          FormMessage(text: l10n.checkEmailBody(_sentTo!), isError: false),
          gap,
          TextButton(onPressed: () => context.go('/login'), child: Text(l10n.backToLogin)),
        ],
      );
    }
    return AuthScaffold(
      title: l10n.signupTitle,
      showBack: true,
      children: [
        if (_error != null) ...[FormMessage(text: _error!), gap],
        TextField(
          controller: _email,
          decoration: InputDecoration(labelText: l10n.emailLabel),
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.next,
        ),
        gap,
        TextField(
          controller: _password,
          decoration: InputDecoration(
            labelText: l10n.passwordLabel,
            helperText: l10n.passwordHint,
            helperMaxLines: 2,
            errorText: _passwordError,
            errorMaxLines: 3,
          ),
          obscureText: true,
          autofillHints: const [AutofillHints.newPassword],
          onSubmitted: (_) => _submit(),
        ),
        gap,
        AuthCaptcha(controller: _captcha),
        FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? l10n.creatingAccount : l10n.signupButton)),
        gap,
        Text(l10n.termsNotice, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
        const Divider(height: 32),
        Text(l10n.haveAccountPrompt, textAlign: TextAlign.center),
        TextButton(onPressed: () => context.go('/login'), child: Text(l10n.loginButton)),
      ],
    );
  }
}
