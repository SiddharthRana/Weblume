import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/status_views.dart';
import '../../theme/tokens.g.dart';
import '../../utils/url_validation.dart';

const _frequencyOrder = [
  EntitlementsMonitorFrequency.daily,
  EntitlementsMonitorFrequency.weekly,
  EntitlementsMonitorFrequency.monthly,
];

/// Frequencies the plan allows, fastest first (slower ones are always allowed).
List<EntitlementsMonitorFrequency> allowedFrequencies(EntitlementsMonitorFrequency? fastest) {
  final i = fastest == null ? -1 : _frequencyOrder.indexOf(fastest);
  return i < 0 ? const [EntitlementsMonitorFrequency.weekly] : _frequencyOrder.sublist(i);
}

const _alerts = [MonitorAlert.anyChange, MonitorAlert.newFindings, MonitorAlert.scoreDrop, MonitorAlert.none];

Future<void> _openSheet(BuildContext context, Widget sheet) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: SafeArea(child: SingleChildScrollView(child: sheet)),
  ),
);

/// Starts monitoring a site: address (prefilled from a report), how often, and when to email.
class AddMonitorSheet extends ConsumerStatefulWidget {
  const AddMonitorSheet({super.key, this.initialUrl, required this.fastest});

  final String? initialUrl;
  final EntitlementsMonitorFrequency? fastest;

  static Future<void> show(BuildContext context, {String? url, EntitlementsMonitorFrequency? fastest}) =>
      _openSheet(context, AddMonitorSheet(initialUrl: url, fastest: fastest));

  @override
  ConsumerState<AddMonitorSheet> createState() => _AddMonitorSheetState();
}

class _AddMonitorSheetState extends ConsumerState<AddMonitorSheet> {
  late final _url = TextEditingController(text: widget.initialUrl ?? '');
  late EntitlementsMonitorFrequency _frequency = allowedFrequencies(widget.fastest).first;
  MonitorAlert _alert = MonitorAlert.anyChange;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final l10n = AppLocalizations.of(context);
    final check = checkUrl(_url.text);
    if (!check.isOk) return setState(() => _error = l10n.urlProblem(check.problem!));
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      await ref.read(repositoryProvider).createMonitor(_url.text.trim(), frequency: _frequency, alert: _alert);
      ref.invalidate(monitorsProvider);
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.monitoringStarted)));
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(WlSpace.s5, 0, WlSpace.s5, WlSpace.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.monitoringAddButton, style: theme.textTheme.titleLarge),
          const SizedBox(height: WlSpace.s2),
          Text(
            l10n.monitoringAddBody,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: WlSpace.s5),
          if (_error != null) ...[FormMessage(text: _error!), const SizedBox(height: WlSpace.s3)],
          TextField(
            controller: _url,
            decoration: InputDecoration(labelText: l10n.urlLabel, prefixIcon: const Icon(Icons.public)),
            keyboardType: TextInputType.url,
            autocorrect: false,
            readOnly: widget.initialUrl != null,
          ),
          const SizedBox(height: WlSpace.s5),
          _FrequencyChoice(
            options: allowedFrequencies(widget.fastest),
            selected: _frequency,
            onSelected: _busy ? null : (f) => setState(() => _frequency = f),
          ),
          const SizedBox(height: WlSpace.s4),
          _AlertChoice(selected: _alert, onSelected: _busy ? null : (a) => setState(() => _alert = a)),
          const SizedBox(height: WlSpace.s6),
          FilledButton(
            onPressed: _busy ? null : _start,
            child: Text(_busy ? l10n.monitoringStarting : l10n.monitoringStart),
          ),
        ],
      ),
    );
  }
}

/// One monitored site: how often, when to email, pause or resume, the latest report, and stop.
/// Changes are saved as soon as they're picked.
class MonitorSettingsSheet extends ConsumerStatefulWidget {
  const MonitorSettingsSheet({super.key, required this.monitor, required this.fastest});

  final Monitor monitor;
  final EntitlementsMonitorFrequency? fastest;

  static Future<void> show(BuildContext context, Monitor monitor, EntitlementsMonitorFrequency? fastest) =>
      _openSheet(context, MonitorSettingsSheet(monitor: monitor, fastest: fastest));

  @override
  ConsumerState<MonitorSettingsSheet> createState() => _MonitorSettingsSheetState();
}

class _MonitorSettingsSheetState extends ConsumerState<MonitorSettingsSheet> {
  late Monitor _m = widget.monitor;
  String? _error;
  bool _busy = false;

  Future<void> _update({bool? enabled, EntitlementsMonitorFrequency? frequency, MonitorAlert? alert}) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await ref
          .read(repositoryProvider)
          .updateMonitor(_m.id, enabled: enabled, frequency: frequency, alert: alert);
      ref.invalidate(monitorsProvider);
      if (mounted) setState(() => _m = updated);
    } catch (e) {
      if (mounted) setState(() => _error = l10n.apiError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _stop() async {
    final l10n = AppLocalizations.of(context);
    final material = MaterialLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.monitoringStopConfirmTitle),
        content: Text(l10n.monitoringStopConfirmBody(_m.normalizedUrl)),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(material.cancelButtonLabel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.monitoringStop),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(repositoryProvider).removeMonitor(_m.id);
      ref.invalidate(monitorsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = l10n.apiError(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final allowed = allowedFrequencies(widget.fastest);
    // Keep a frequency the plan no longer allows visible, so the current setting is never hidden.
    final options = allowed.contains(_m.frequency) ? allowed : [_m.frequency, ...allowed];
    final last = _m.lastScan;
    return Padding(
      padding: const EdgeInsets.fromLTRB(WlSpace.s5, 0, WlSpace.s5, WlSpace.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.monitoringSettingsTitle, style: theme.textTheme.titleLarge),
          const SizedBox(height: WlSpace.s1),
          Text(
            _m.normalizedUrl,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: WlSpace.s5),
          if (_error != null) ...[FormMessage(text: _error!), const SizedBox(height: WlSpace.s3)],
          _FrequencyChoice(
            options: options,
            selected: _m.frequency,
            onSelected: _busy ? null : (f) => f == _m.frequency ? null : _update(frequency: f),
          ),
          const SizedBox(height: WlSpace.s4),
          _AlertChoice(
            selected: _m.alert,
            onSelected: _busy ? null : (a) => a == _m.alert ? null : _update(alert: a),
          ),
          const SizedBox(height: WlSpace.s5),
          OutlinedButton.icon(
            onPressed: _busy ? null : () => _update(enabled: !_m.enabled),
            icon: Icon(_m.enabled ? Icons.pause : Icons.play_arrow),
            label: Text(_m.enabled ? l10n.monitoringPause : l10n.monitoringResume),
          ),
          if (!_m.enabled) ...[
            const SizedBox(height: WlSpace.s1),
            Text(
              l10n.monitoringPausedNote,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
          if (last != null) ...[
            const SizedBox(height: WlSpace.s2),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                context.push('/scan/${last.id}');
              },
              icon: const Icon(Icons.article_outlined),
              label: Text(l10n.monitoringOpenLatest),
            ),
          ],
          const SizedBox(height: WlSpace.s2),
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
            onPressed: _busy ? null : _stop,
            icon: const Icon(Icons.stop_circle_outlined),
            label: Text(l10n.monitoringStop),
          ),
        ],
      ),
    );
  }
}

class _FrequencyChoice extends StatelessWidget {
  const _FrequencyChoice({required this.options, required this.selected, required this.onSelected});

  final List<EntitlementsMonitorFrequency> options;
  final EntitlementsMonitorFrequency selected;
  final void Function(EntitlementsMonitorFrequency)? onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _Choice(
      label: l10n.monitoringFrequencyLabel,
      children: [
        for (final f in options)
          ChoiceChip(
            label: Text(l10n.frequency(f)),
            selected: f == selected,
            onSelected: onSelected == null ? null : (_) => onSelected!(f),
          ),
      ],
    );
  }
}

class _AlertChoice extends StatelessWidget {
  const _AlertChoice({required this.selected, required this.onSelected});

  final MonitorAlert selected;
  final void Function(MonitorAlert)? onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _Choice(
      label: l10n.monitoringAlertLabel,
      hint: l10n.alertHint(selected),
      children: [
        for (final a in _alerts)
          ChoiceChip(
            label: Text(l10n.alert(a)),
            selected: a == selected,
            onSelected: onSelected == null ? null : (_) => onSelected!(a),
          ),
      ],
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.children, this.hint});

  final String label;
  final List<Widget> children;

  /// Explains the current choice, under the options.
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.labelLarge),
      const SizedBox(height: WlSpace.s2),
      Wrap(spacing: WlSpace.s2, runSpacing: WlSpace.s2, children: children),
      if (hint != null) ...[
        const SizedBox(height: WlSpace.s2),
        Semantics(
          liveRegion: true,
          child: Text(
            hint!,
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      ],
    ],
  );
}
