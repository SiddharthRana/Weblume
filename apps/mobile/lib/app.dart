import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/app_localizations.dart';
import 'billing/billing_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import 'theme/theme_mode.dart';

class WeblumeApp extends ConsumerWidget {
  const WeblumeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keep the purchase listener alive app-wide so interrupted purchases are verified on next launch.
    ref.listen(billingControllerProvider, (_, _) {});
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),
      routerConfig: ref.watch(routerProvider),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
