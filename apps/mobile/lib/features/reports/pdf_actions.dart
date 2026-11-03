import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../theme/tokens.g.dart';

/// Download (system "Save to" screen) and share buttons for a report's PDF (Starter).
class PdfActions extends ConsumerStatefulWidget {
  const PdfActions({super.key, required this.scanId, required this.url, required this.scannedAt});

  final String scanId;
  final String url;
  final DateTime scannedAt;

  @override
  ConsumerState<PdfActions> createState() => _PdfActionsState();
}

enum _Action { download, share }

class _PdfActionsState extends ConsumerState<PdfActions> {
  _Action? _busy;

  /// e.g. weblume-report-example.com-2026-11-03.pdf
  String get _fileName {
    final host = (Uri.tryParse(widget.url)?.host ?? 'site').replaceAll(RegExp(r'[^A-Za-z0-9.-]'), '');
    final d = widget.scannedAt.toUtc();
    final date = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    return 'weblume-report-$host-$date.pdf';
  }

  Future<void> _run(_Action action) async {
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = action);
    try {
      final bytes = await ref.read(repositoryProvider).reportPdf(widget.scanId);
      if (action == _Action.download) {
        final saved = await FilePicker.saveFile(
          fileName: _fileName,
          bytes: bytes,
          mimeType: 'application/pdf',
          dialogTitle: l10n.reportActionDownloadPdf,
        );
        if (saved != null) messenger.showSnackBar(SnackBar(content: Text(l10n.pdfSaved)));
      } else {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile.fromData(bytes, mimeType: 'application/pdf')],
            fileNameOverrides: [_fileName],
          ),
        );
      }
    } on PlatformException catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.pdfFailed)));
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
          label: Text(l10n.reportActionDownloadPdf),
        ),
        OutlinedButton.icon(
          onPressed: _busy == null ? () => _run(_Action.share) : null,
          icon: icon(_Action.share, Icons.ios_share),
          label: Text(l10n.reportActionSharePdf),
        ),
      ],
    );
  }
}
