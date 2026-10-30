import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/generated/models.g.dart';
import '../auth/auth_repository.dart';
import '../data/providers.dart';
import '../features/account/account_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/password_screens.dart';
import '../features/auth/signup_screen.dart';
import '../features/billing/subscription_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/history/history_screen.dart';
import '../features/reports/compare_screen.dart';
import '../features/scan/finding_detail_screen.dart';
import '../features/scan/new_scan_screen.dart';
import '../features/scan/scan_screen.dart';
import '../l10n/app_localizations.dart';
import '../shared/widgets/app_shell.dart';

abstract final class Routes {
  static const dashboard = '/';
  // Not under /scan/ so it can't be captured by the /scan/:id report route.
  static const newScan = '/new';
  static const history = '/history';
  static const account = '/account';
  static const login = '/login';
  static const signup = '/signup';
  static const forgotPassword = '/forgot-password';
  static const resetPassword = '/reset-password';
  static const notConfigured = '/not-configured';
  static const subscription = '/subscription';
}

const _publicRoutes = {Routes.login, Routes.signup, Routes.forgotPassword};

/// Re-runs router redirects when the auth state changes; remembers password-recovery links.
class AuthListenable extends ChangeNotifier {
  AuthListenable(this._auth, this._onSignedOut) {
    _sub = _auth.events.listen((event) {
      if (event == AuthEvent.passwordRecovery) recovering = true;
      if (event == AuthEvent.signedOut) {
        recovering = false;
        _onSignedOut();
      }
      notifyListeners();
    });
  }

  final AuthRepository _auth;
  final VoidCallback _onSignedOut;
  late final StreamSubscription<AuthEvent> _sub;
  bool recovering = false;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

@visibleForTesting
String? authRedirect({
  required bool configured,
  required bool signedIn,
  required bool recovering,
  required String location,
}) {
  if (!configured) return location == Routes.notConfigured ? null : Routes.notConfigured;
  if (recovering) return location == Routes.resetPassword ? null : Routes.resetPassword;
  final isPublic = _publicRoutes.contains(location);
  if (!signedIn) return isPublic ? null : Routes.login;
  if (isPublic || location == Routes.notConfigured) return Routes.dashboard;
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final listenable = AuthListenable(auth, () => ref.read(repositoryProvider).clearCache());
  ref.onDispose(listenable.dispose);

  final router = GoRouter(
    initialLocation: Routes.dashboard,
    refreshListenable: listenable,
    redirect: (context, state) => authRedirect(
      configured: auth.configured,
      signedIn: auth.currentUser != null,
      recovering: listenable.recovering,
      location: state.matchedLocation,
    ),
    routes: [
      GoRoute(
        path: Routes.login,
        builder: (context, state) {
          final l10n = AppLocalizations.of(context);
          final notice = switch (state.uri.queryParameters['notice']) {
            'deleted' => l10n.accountDeleted,
            'pending' => l10n.accountDeletionPending,
            _ => null,
          };
          return LoginScreen(notice: notice);
        },
      ),
      GoRoute(path: Routes.signup, builder: (_, _) => const SignupScreen()),
      GoRoute(path: Routes.forgotPassword, builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(
        path: Routes.resetPassword,
        builder: (_, _) =>
            PopScope(canPop: false, child: NewPasswordScreen(onDone: () => listenable.recovering = false)),
      ),
      GoRoute(path: Routes.notConfigured, builder: (_, _) => const AuthNotConfiguredScreen()),
      GoRoute(path: Routes.subscription, builder: (_, _) => const SubscriptionScreen()),
      GoRoute(
        path: '/scan/:id',
        builder: (_, state) =>
            ScanScreen(key: ValueKey(state.pathParameters['id']), scanId: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'compare',
            builder: (_, state) => CompareScreen(targetId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'finding/:findingId',
            builder: (context, state) {
              final finding = state.extra;
              // Opened without its data (e.g. restored after the process was killed): go back to the report.
              if (finding is! Finding) return ScanScreen(scanId: state.pathParameters['id']!);
              return FindingDetailScreen(finding: finding);
            },
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: Routes.dashboard, builder: (_, _) => const DashboardScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: Routes.newScan, builder: (_, _) => const NewScanScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: Routes.history, builder: (_, _) => const HistoryScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: Routes.account, builder: (_, _) => const AccountScreen())],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
