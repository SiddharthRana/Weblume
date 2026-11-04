import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:weblume/auth/secure_session_storage.dart';

class MemorySecretStore implements SecretStore {
  final values = <String, String>{};

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;

  @override
  Future<void> delete(String key) async => values.remove(key);
}

void main() {
  const key = 'sb-abcd-auth-token';
  late MemorySecretStore store;

  SecureSessionStorage storage() => SecureSessionStorage(persistSessionKey: key, store: store);

  setUp(() => store = MemorySecretStore());

  test('uses the same key as supabase_flutter, so old sessions can be found', () {
    expect(supabaseSessionKey('https://abcd.supabase.co'), key);
    expect(supabaseSessionKey('http://10.0.2.2:54321'), 'sb-10-auth-token');
  });

  test('persists, reads and removes the session in the secret store only', () async {
    SharedPreferences.setMockInitialValues({});
    final s = storage();
    await s.initialize();
    expect(await s.hasAccessToken(), isFalse);

    await s.persistSession('{"access_token":"a"}');
    expect(await s.hasAccessToken(), isTrue);
    expect(await s.accessToken(), '{"access_token":"a"}');
    expect(store.values[key], '{"access_token":"a"}');
    expect((await SharedPreferences.getInstance()).getKeys(), isEmpty);

    await s.removePersistedSession();
    expect(await s.hasAccessToken(), isFalse);
    expect(store.values, isEmpty);
  });

  test('moves a session saved by older versions out of SharedPreferences', () async {
    SharedPreferences.setMockInitialValues({key: '{"access_token":"old"}', 'other': 'kept'});
    final s = storage();
    await s.initialize();

    expect(await s.accessToken(), '{"access_token":"old"}');
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.containsKey(key), isFalse);
    expect(prefs.getString('other'), 'kept');
  });

  test('a newer secure session wins over a leftover plain-text one, which is still deleted', () async {
    SharedPreferences.setMockInitialValues({key: '{"access_token":"old"}'});
    store.values[key] = '{"access_token":"new"}';
    await storage().initialize();

    expect(store.values[key], '{"access_token":"new"}');
    expect((await SharedPreferences.getInstance()).containsKey(key), isFalse);
  });

  test('migration is a no-op on later starts', () async {
    SharedPreferences.setMockInitialValues({});
    await storage().initialize();
    expect(store.values, isEmpty);
  });

  test('keeps the PKCE code verifier in the secret store', () async {
    final pkce = SecurePkceStorage(store);
    await pkce.setItem(key: 'verifier', value: 'v1');
    expect(await pkce.getItem(key: 'verifier'), 'v1');
    await pkce.removeItem(key: 'verifier');
    expect(await pkce.getItem(key: 'verifier'), isNull);
  });
}
