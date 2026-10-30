import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/generated/models.g.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/surface.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/scan_tile.dart';
import '../../shared/widgets/status_views.dart';
import '../../theme/tokens.g.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final _search = TextEditingController();
  List<ScanSummary>? _items;
  DateTime? _cursor;
  String _query = '';
  Object? _error;
  bool _fromCache = false;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ref.read(repositoryProvider).scans(q: _query.isEmpty ? null : _query);
      if (!mounted) return;
      setState(() {
        _items = res.data.items;
        _cursor = res.data.nextCursor;
        _fromCache = res.fromCache;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _more() async {
    if (_cursor == null) return;
    setState(() => _loadingMore = true);
    try {
      final res = await ref
          .read(repositoryProvider)
          .scans(q: _query.isEmpty ? null : _query, before: _cursor!.toUtc().toIso8601String());
      if (!mounted) return;
      setState(() {
        _items = [...?_items, ...res.data.items];
        _cursor = res.data.nextCursor;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context).apiError(e))));
      }
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _submitSearch(String value) {
    setState(() {
      _query = value.trim();
      _items = null;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    Widget content;
    if (_error != null && _items == null) {
      content = ErrorView(message: l10n.apiError(_error!), onRetry: _load);
    } else if (_items == null) {
      content = const LoadingView();
    } else if (_items!.isEmpty) {
      content = _query.isEmpty
          ? EmptyState(icon: Icons.history, title: l10n.historyEmptyTitle, body: l10n.historyEmptyBody)
          : EmptyState(icon: Icons.search_off, title: l10n.noMatches, body: '');
    } else {
      content = RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(WlSpace.s4, 0, WlSpace.s4, WlSpace.s6),
          children: [
            for (final (i, s) in _items!.indexed)
              FadeSlideIn(
                index: i,
                child: ScanTile(scan: s),
              ),
            if (_cursor != null)
              Padding(
                padding: const EdgeInsets.only(top: WlSpace.s2),
                child: OutlinedButton(
                  onPressed: _loadingMore ? null : _more,
                  child: Text(_loadingMore ? l10n.loading : l10n.loadMore),
                ),
              ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(l10n.historyTitle)),
      body: Column(
        children: [
          if (_fromCache) const OfflineBanner(),
          Padding(
            padding: const EdgeInsets.all(WlSpace.s4),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                labelText: l10n.historySearch,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  tooltip: l10n.search,
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: () => _submitSearch(_search.text),
                ),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: _submitSearch,
            ),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }
}
