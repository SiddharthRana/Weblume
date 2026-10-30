import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../api/generated/api.g.dart';
import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../theme/tokens.g.dart';

/// Bottom sheet to create, copy and turn off read-only share links for a report.
class ShareSheet extends ConsumerStatefulWidget {
  const ShareSheet({super.key, required this.scanId});

  final String scanId;

  static const expiryOptions = [7, 30, 90, 365];

  static Future<void> show(BuildContext context, String scanId) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => ShareSheet(scanId: scanId),
  );

  @override
  ConsumerState<ShareSheet> createState() => _ShareSheetState();
}

class _ShareSheetState extends ConsumerState<ShareSheet> {
  List<ShareLink>? _links;
  int _days = 30;
  String? _created;
  bool _busy = false;
  bool _copied = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    try {
      final links = await ref.read(repositoryProvider).shares(widget.scanId);
      if (mounted) setState(() => _links = links);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _create() async {
    setState(() {
      _busy = true;
      _error = null;
      _copied = false;
    });
    try {
      final res = await ref.read(repositoryProvider).createShare(widget.scanId, _days);
      await Clipboard.setData(ClipboardData(text: res.url));
      if (!mounted) return;
      setState(() {
        _created = res.url;
        _copied = true;
      });
      await _refresh();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _revoke(ShareLink link) async {
    setState(() => _error = null);
    try {
      await ref.read(repositoryProvider).revokeShare(link.id);
      await _refresh();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    final date = DateFormat.yMMMd();
    final active = _links?.where((l) => l.active).toList();

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(WlSpace.s4, 0, WlSpace.s4, WlSpace.s4 + MediaQuery.viewInsetsOf(context).bottom),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(header: true, child: Text(l10n.shareTitle, style: theme.textTheme.titleLarge)),
              const SizedBox(height: WlSpace.s2),
              Text(l10n.shareBody, style: muted),
              const SizedBox(height: WlSpace.s4),
              DropdownButtonFormField<int>(
                initialValue: _days,
                decoration: InputDecoration(labelText: l10n.shareExpiryLabel),
                items: [
                  for (final d in ShareSheet.expiryOptions)
                    DropdownMenuItem(value: d, child: Text(d == 365 ? l10n.shareOneYear : l10n.shareDays(d))),
                ],
                onChanged: (v) => setState(() => _days = v ?? _days),
              ),
              const SizedBox(height: WlSpace.s3),
              FilledButton(
                onPressed: _busy ? null : _create,
                child: Text(_busy ? l10n.shareCreating : l10n.shareCreate),
              ),
              const SizedBox(height: WlSpace.s2),
              Text(l10n.shareRetentionNote, style: theme.textTheme.bodySmall),
              if (_created != null) ...[
                const SizedBox(height: WlSpace.s4),
                Semantics(
                  liveRegion: true,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(WlSpace.s3),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.shareCreated),
                          const SizedBox(height: WlSpace.s2),
                          SelectableText(_created!, style: const TextStyle(fontFamily: 'monospace')),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () async {
                                await Clipboard.setData(ClipboardData(text: _created!));
                                if (mounted) setState(() => _copied = true);
                              },
                              child: Text(_copied ? l10n.shareCopied : l10n.shareCopy),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: WlSpace.s3),
                Text(
                  l10n.apiError(_error!),
                  style: TextStyle(color: theme.colorScheme.error, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: WlSpace.s4),
              Text(l10n.shareActive, style: theme.textTheme.titleSmall),
              const SizedBox(height: WlSpace.s2),
              if (active == null)
                const LinearProgressIndicator()
              else if (active.isEmpty)
                Text(l10n.shareNone, style: muted)
              else
                for (final l in active)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.shareCreatedOn(date.format(l.createdAt.toLocal()))),
                    subtitle: l.expiresAt == null
                        ? null
                        : Text(l10n.shareExpiresOn(date.format(l.expiresAt!.toLocal()))),
                    trailing: Semantics(
                      label: l10n.shareTurnOffSemantics(date.format(l.createdAt.toLocal())),
                      excludeSemantics: true,
                      button: true,
                      child: TextButton(
                        onPressed: () => _revoke(l),
                        style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
                        child: Text(l10n.shareTurnOff),
                      ),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
