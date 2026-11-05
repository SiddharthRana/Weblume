import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../theme/tokens.g.dart';

/// Download (system "Save to" screen) or share a copy of all the account's data as JSON,
/// the same export as Account settings on the website.
class DataExportActions extends ConsumerStatefulWidget {
  const DataExportActions({super.key});

  @override
  ConsumerState<DataExportActions> createState() => _DataExportActionsState();
}

enum _Action { download, share }

class _DataExportActionsState extends ConsumerState<DataExportActions> {
  _Action? _busy;

  /// e.g. weblume-data-2026-11-05.json
  String get _fileName {
    final d = DateTime.now();
    return 'weblume-data-${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}.json';
  }

  Future<void> _run(_Action action) async {
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = action);
    try {
      final data = await ref.read(repositoryProvider).exportData();
      final bytes = Uint8List.fromList(utf8.encode(const JsonEncoder.withIndent('  ').convert(data)));
      if (action == _Action.download) {
        final saved = await FilePicker.saveFile(
          fileName: _fileName,
          bytes: bytes,
          mimeType: 'application/json',
          dialogTitle: l10n.exportDownload,
        );
        if (saved != null) messenger.showSnackBar(SnackBar(content: Text(l10n.exportSaved)));
      } else {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile.fromData(bytes, mimeType: 'application/json')],
            fileNameOverrides: [_fileName],
          ),
        );
      }
    } on PlatformException catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.exportFailed)));
    } catch (e) {
      if (mounted) messenger.showSnackBar(SnackBar(content: Text(l10n.apiError(e))));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    Widget icon(_Action a, IconData data) => _busy == a
        ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
        : Icon(data);
    return Wrap(
      spacing: WlSpace.s2,
      runSpacing: WlSpace.s2,
      children: [
        OutlinedButton.icon(
          onPressed: _busy == null ? () => _run(_Action.download) : null,
          icon: icon(_Action.download, Icons.download),
          label: Text(l10n.exportDownload),
        ),
        OutlinedButton.icon(
          onPressed: _busy == null ? () => _run(_Action.share) : null,
          icon: icon(_Action.share, Icons.ios_share),
          label: Text(l10n.exportShare),
        ),
      ],
    );
  }
}
