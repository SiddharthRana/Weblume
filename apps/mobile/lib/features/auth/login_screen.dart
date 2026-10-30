import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_repository.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/status_views.dart';
import 'auth_scaffold.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.notice});

  /// Optional message shown above the form (e.g. after account deletion).
  final String? notice;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _error = null);
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = l10n.enterEmailPassword);
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(authRepositoryProvider).signIn(email: _email.text.trim(), password: _password.text);
      // The router redirects once the auth state changes.
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
      title: l10n.loginTitle,
      children: [
        if (widget.notice != null) ...[FormMessage(text: widget.notice!, isError: false), gap],
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
          decoration: InputDecoration(labelText: l10n.passwordLabel),
          obscureText: true,
          autofillHints: const [AutofillHints.password],
          onSubmitted: (_) => _submit(),
        ),
        gap,
        FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? l10n.loggingIn : l10n.loginButton)),
        TextButton(onPressed: () => context.push('/forgot-password'), child: Text(l10n.forgotPasswordLink)),
        const Divider(height: 32),
        Text(l10n.noAccountPrompt, textAlign: TextAlign.center),
        TextButton(onPressed: () => context.push('/signup'), child: Text(l10n.createAccountLink)),
      ],
    );
  }
}
