import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'auth/auth_repository.dart';
import 'config/app_config.dart';
import 'data/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  AuthRepository auth = UnconfiguredAuthRepository();
  if (AppConfig.authConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabasePublishableKey,
      authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
    );
    auth = SupabaseAuthRepository(Supabase.instance.client.auth);
  }
  runApp(
    ProviderScope(
      // Screens offer explicit "Try again" actions; don't retry failed requests automatically.
      retry: (_, _) => null,
      overrides: [authRepositoryProvider.overrideWithValue(auth)],
      child: const WeblumeApp(),
    ),
  );
}
