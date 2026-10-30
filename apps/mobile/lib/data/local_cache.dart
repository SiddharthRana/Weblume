import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Small JSON cache for offline, read-only viewing of the last fetched data.
/// Contains only data the signed-in user can already see; cleared on sign-out and account deletion.
class LocalCache {
  LocalCache(this._prefs);

  final SharedPreferencesAsync _prefs;
  static const _prefix = 'weblume.cache.';
  static const maxReports = 20;

  Future<Map<String, dynamic>?> read(String key) async {
    try {
      final raw = await _prefs.getString('$_prefix$key');
      return raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null; // corrupt or unavailable storage: behave as empty
    }
  }

  Future<void> write(String key, Map<String, dynamic> value) async {
    try {
      await _prefs.setString('$_prefix$key', jsonEncode(value));
    } catch (_) {
      // caching is best-effort
    }
  }

  /// Stores a report and keeps only the [maxReports] most recent ones.
  Future<void> writeReport(String id, Map<String, dynamic> report) async {
    await write('report.$id', report);
    final index = await read('reports.index');
    final ids = [id, ...((index?['ids'] as List?)?.cast<String>() ?? const []).where((x) => x != id)];
    for (final old in ids.skip(maxReports)) {
      await _prefs.remove('${_prefix}report.$old');
    }
    await write('reports.index', {'ids': ids.take(maxReports).toList()});
  }

  Future<void> clear() async {
    final keys = await _prefs.getKeys();
    for (final k in keys.where((k) => k.startsWith(_prefix))) {
      await _prefs.remove(k);
    }
  }
}
