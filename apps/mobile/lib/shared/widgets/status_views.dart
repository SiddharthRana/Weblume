import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/tokens.g.dart';
import 'empty_state.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) => Center(
    child: Semantics(
      label: AppLocalizations.of(context).loading,
      liveRegion: true,
      child: const CircularProgressIndicator(),
    ),
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => EmptyState(
    icon: Icons.cloud_off_outlined,
    title: message,
    body: '',
    action: onRetry == null
        ? null
        : FilledButton(onPressed: onRetry, child: Text(AppLocalizations.of(context).tryAgain)),
  );
}

/// Shown above content served from the offline cache.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        color: scheme.surfaceContainerHighest,
        padding: const EdgeInsets.symmetric(horizontal: WlSpace.s4, vertical: WlSpace.s2),
        child: Row(
          children: [
            Icon(Icons.wifi_off, size: 18, color: scheme.onSurface),
            const SizedBox(width: WlSpace.s2),
            Expanded(child: Text(AppLocalizations.of(context).offlineBanner)),
          ],
        ),
      ),
    );
  }
}

/// Inline error or success message for forms.
class FormMessage extends StatelessWidget {
  const FormMessage({super.key, required this.text, this.isError = true});

  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(WlSpace.s3),
        decoration: BoxDecoration(
          color: isError ? theme.colorScheme.errorContainer : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(WlRadius.md),
        ),
        child: Text(
          text,
          style: TextStyle(color: isError ? theme.colorScheme.onErrorContainer : theme.colorScheme.onSurface),
        ),
      ),
    );
  }
}
