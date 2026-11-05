import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Where the chosen appearance is kept between launches. Separate from [LocalCache], which is
/// cleared on sign-out: the appearance belongs to the device, not the account.
class ThemeModeStore {
  ThemeModeStore(this._prefs);

  final SharedPreferencesAsync _prefs;
  static const _key = 'weblume.themeMode';

  Future<ThemeMode> read() async {
    try {
      final name = await _prefs.getString(_key);
      return ThemeMode.values.firstWhere((m) => m.name == name, orElse: () => ThemeMode.system);
    } catch (_) {
      return ThemeMode.system; // storage unavailable: follow the phone
    }
  }

  Future<void> write(ThemeMode mode) async {
    try {
      await _prefs.setString(_key, mode.name);
    } catch (_) {
      // best-effort: the choice still applies until the app closes
    }
  }
}

final themeModeStoreProvider = Provider<ThemeModeStore>((ref) => ThemeModeStore(SharedPreferencesAsync()));

/// System (the default, follows the phone), light or dark.
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    ref.read(themeModeStoreProvider).read().then((saved) {
      if (ref.mounted && !_changed) state = saved;
    });
    return ThemeMode.system;
  }

  // A choice made before the saved one finishes loading wins.
  bool _changed = false;

  void set(ThemeMode mode) {
    _changed = true;
    state = mode;
    ref.read(themeModeStoreProvider).write(mode);
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(ThemeModeController.new);
