import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// The small key-value surface the session storage needs, so tests can swap in an in-memory map.
abstract interface class SecretStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// Android Keystore-backed storage (AES-GCM data key wrapped by a Keystore RSA key).
class KeystoreSecretStore implements SecretStore {
  KeystoreSecretStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            // A key that no longer decrypts (e.g. after a device restore) is wiped; the user signs in again.
            aOptions: AndroidOptions(resetOnError: true),
            iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
          );

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) => _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

/// The key supabase_flutter uses for its default SharedPreferences session storage.
String supabaseSessionKey(String supabaseUrl) => 'sb-${Uri.parse(supabaseUrl).host.split('.').first}-auth-token';

/// Persists the Supabase session (access and refresh tokens) in [SecretStore] instead of
/// plain SharedPreferences.
///
/// On first start after an upgrade, a session saved by older versions in SharedPreferences
/// is moved across and the plain-text copy deleted, so nobody is signed out by the change.
class SecureSessionStorage extends LocalStorage {
  SecureSessionStorage({
    required this.persistSessionKey,
    SecretStore? store,
    Future<SharedPreferences> Function()? legacy,
  }) : _store = store ?? KeystoreSecretStore(),
       _legacy = legacy ?? SharedPreferences.getInstance;

  final String persistSessionKey;
  final SecretStore _store;
  final Future<SharedPreferences> Function() _legacy;

  @override
  Future<void> initialize() async {
    final prefs = await _legacy();
    final old = prefs.getString(persistSessionKey);
    if (old == null) return;
    if (await _store.read(persistSessionKey) == null) {
      await _store.write(persistSessionKey, old);
    }
    await prefs.remove(persistSessionKey);
  }

  @override
  Future<bool> hasAccessToken() async => await _store.read(persistSessionKey) != null;

  @override
  Future<String?> accessToken() => _store.read(persistSessionKey);

  @override
  Future<void> removePersistedSession() => _store.delete(persistSessionKey);

  @override
  Future<void> persistSession(String persistSessionString) => _store.write(persistSessionKey, persistSessionString);
}

/// Keeps the PKCE code verifier (used by email confirmation and password reset links) in
/// [SecretStore] too, rather than SharedPreferences.
class SecurePkceStorage extends GotrueAsyncStorage {
  SecurePkceStorage([SecretStore? store]) : _store = store ?? KeystoreSecretStore();

  final SecretStore _store;

  @override
  Future<String?> getItem({required String key}) => _store.read(key);

  @override
  Future<void> setItem({required String key, required String value}) => _store.write(key, value);

  @override
  Future<void> removeItem({required String key}) => _store.delete(key);
}
