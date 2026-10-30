import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../theme/tokens.g.dart';
import '../../utils/url_validation.dart';

class NewScanScreen extends ConsumerStatefulWidget {
  const NewScanScreen({super.key});

  @override
  ConsumerState<NewScanScreen> createState() => _NewScanScreenState();
}

class _NewScanScreenState extends ConsumerState<NewScanScreen> {
  final _url = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final check = checkUrl(_url.text);
    if (!check.isOk) return setState(() => _error = l10n.urlProblem(check.problem!));
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      final res = await ref.read(repositoryProvider).createScan(check.url!);
      ref.invalidate(recentScansProvider);
      ref.invalidate(accountProvider);
      if (!mounted) return;
      _url.clear();
      await context.push('/scan/${res.scan.id}');
    } catch (e) {
      if (mounted) setState(() => _error = l10n.apiError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.newScanTitle)),
      body: ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          TextField(
            controller: _url,
            decoration: InputDecoration(
              labelText: l10n.urlLabel,
              hintText: l10n.urlHint,
              errorText: _error,
              errorMaxLines: 3,
              prefixIcon: const Icon(Icons.language),
            ),
            keyboardType: TextInputType.url,
            autocorrect: false,
            enableSuggestions: false,
            textInputAction: TextInputAction.go,
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: WlSpace.s4),
          FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: const Icon(Icons.search),
            label: Text(_busy ? l10n.starting : l10n.scanButton),
          ),
          const SizedBox(height: WlSpace.s4),
          Text(
            l10n.scanDisclaimer,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
