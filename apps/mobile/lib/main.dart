import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'auth/auth_repository.dart';
import 'auth/secure_session_storage.dart';
import 'billing/billing_controller.dart';
import 'billing/billing_gateway.dart';
import 'config/app_config.dart';
import 'data/providers.dart';
import 'observability/crash_reporting.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await runWithCrashReporting(_start);
}

Future<void> _start() async {
  AuthRepository auth = UnconfiguredAuthRepository();
  if (AppConfig.authConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabasePublishableKey,
      authOptions: FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
        // Tokens live in the Android Keystore, not plain SharedPreferences.
        localStorage: SecureSessionStorage(persistSessionKey: supabaseSessionKey(AppConfig.supabaseUrl)),
        pkceAsyncStorage: SecurePkceStorage(),
      ),
    );
    auth = SupabaseAuthRepository(Supabase.instance.client.auth);
  }
  runApp(
    ProviderScope(
      // Screens offer explicit "Try again" actions; don't retry failed requests automatically.
      retry: (_, _) => null,
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        if (Platform.isAndroid) billingGatewayProvider.overrideWithValue(PlayBillingGateway(InAppPurchase.instance)),
      ],
      child: const WeblumeApp(),
    ),
  );
}
