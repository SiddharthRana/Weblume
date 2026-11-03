import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/generated/api.g.dart';
import '../api/generated/models.g.dart';
import '../auth/auth_repository.dart';
import '../config/app_config.dart';
import 'local_cache.dart';
import 'weblume_repository.dart';

/// Overridden in main.dart with the real implementation, and in tests with fakes.
final authRepositoryProvider = Provider<AuthRepository>((ref) => UnconfiguredAuthRepository());

final localCacheProvider = Provider<LocalCache>((ref) => LocalCache(SharedPreferencesAsync()));

final dioProvider = Provider<Dio>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Accept': 'application/json'},
    ),
  );
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = auth.accessToken;
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
    ),
  );
  return dio;
});

final repositoryProvider = Provider<WeblumeRepository>(
  (ref) => WeblumeRepository(WeblumeApi(ref.watch(dioProvider)), ref.watch(localCacheProvider)),
);

final accountProvider = FutureProvider.autoDispose<Loaded<Account>>((ref) => ref.watch(repositoryProvider).account());

final recentScansProvider = FutureProvider.autoDispose<Loaded<ScanListResponse>>(
  (ref) => ref.watch(repositoryProvider).scans(limit: 5),
);

final monitorsProvider = FutureProvider.autoDispose<Loaded<MonitorListResponse>>(
  (ref) => ref.watch(repositoryProvider).monitors(),
);
