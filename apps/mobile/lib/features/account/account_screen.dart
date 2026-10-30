import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/generated/models.g.dart';
import '../../config/app_config.dart';
import '../../billing/billing_controller.dart';
import '../../data/providers.dart';
import '../../router/app_router.dart';
import '../billing/subscription_status.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/surface.dart';
import '../../shared/labels.dart';
import '../../shared/widgets/status_views.dart';
import '../../shared/widgets/usage_meter.dart';
import '../../theme/tokens.g.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  final _name = TextEditingController();
  final _confirm = TextEditingController();
  bool _nameLoaded = false;
  String? _nameMessage;
  bool _nameError = false;
  String? _deleteError;
  bool _deleting = false;

  @override
  void dispose() {
    _name.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _open(String path) =>
      launchUrl(Uri.parse('${AppConfig.siteUrl}$path'), mode: LaunchMode.externalApplication);

  Future<void> _saveName() async {
    final l10n = AppLocalizations.of(context);
    try {
      final trimmed = _name.text.trim();
      await ref.read(repositoryProvider).updateDisplayName(trimmed.isEmpty ? null : trimmed);
      ref.invalidate(accountProvider);
      setState(() {
        _nameMessage = l10n.saved;
        _nameError = false;
      });
    } catch (e) {
      setState(() {
        _nameMessage = l10n.apiError(e);
        _nameError = true;
      });
    }
  }

  Future<void> _logOut() async {
    await ref.read(repositoryProvider).clearCache();
    await ref.read(authRepositoryProvider).signOut();
    if (mounted) context.go('/login');
  }

  Future<void> _delete() async {
    final l10n = AppLocalizations.of(context);
    if (_confirm.text != 'DELETE') return setState(() => _deleteError = l10n.deleteTypeError);
    setState(() {
      _deleteError = null;
      _deleting = true;
    });
    try {
      final res = await ref.read(repositoryProvider).deleteAccount();
      await ref.read(authRepositoryProvider).signOut();
      if (!mounted) return;
      context.go('/login?notice=${res.status == DeleteAccountResponseStatus.deleted ? 'deleted' : 'pending'}');
    } catch (e) {
      if (mounted) {
        setState(() {
          _deleteError = l10n.apiError(e);
          _deleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final account = ref.watch(accountProvider);
    final user = ref.watch(authRepositoryProvider).currentUser;
    final muted = theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant);

    Widget section(String title, List<Widget> children, {Color? border, IconData? icon}) => Padding(
      padding: const EdgeInsets.only(bottom: WlSpace.s4),
      child: WlCard(
        accent: border,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 20, color: border ?? theme.colorScheme.primary),
                  const SizedBox(width: WlSpace.s2),
                ],
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(color: border, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: WlSpace.s3),
            ...children,
          ],
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(l10n.accountTitle)),
      body: account.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(message: l10n.apiError(e), onRetry: () => ref.invalidate(accountProvider)),
        data: (loaded) {
          final a = loaded.data;
          if (!_nameLoaded) {
            _name.text = a.displayName ?? '';
            _nameLoaded = true;
          }
          return Column(
            children: [
              if (loaded.fromCache) const OfflineBanner(),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s5, WlSpace.s4, WlSpace.s8),
                  children: [
                    FadeSlideIn(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: WlSpace.s5),
                        child: Row(
                          children: [
                            GradientAvatar(label: a.displayName ?? user?.email ?? a.email ?? '?', size: 56),
                            const SizedBox(width: WlSpace.s4),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    a.displayName ?? l10n.accountTitle,
                                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  Text(l10n.planName(a.plan.name), style: muted),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    section(l10n.profileSection, icon: Icons.person_outline, [
                      Text(l10n.signedInAs(user?.email ?? a.email ?? ''), style: muted),
                      const SizedBox(height: WlSpace.s3),
                      TextField(
                        controller: _name,
                        maxLength: 100,
                        decoration: InputDecoration(labelText: l10n.displayNameLabel),
                        autofillHints: const [AutofillHints.name],
                      ),
                      if (_nameMessage != null) ...[
                        FormMessage(text: _nameMessage!, isError: _nameError),
                        const SizedBox(height: WlSpace.s2),
                      ],
                      OutlinedButton(onPressed: loaded.fromCache ? null : _saveName, child: Text(l10n.saveName)),
                    ]),
                    section(l10n.planSection, icon: Icons.bolt_outlined, [
                      Text(
                        '${a.plan.name} · ${l10n.planDetails(a.entitlements.scansPerPeriod)}',
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: WlSpace.s3),
                      UsageMeter(used: a.usage.used, limit: a.usage.limit, resetsAt: a.usage.resetsAt),
                      const SizedBox(height: WlSpace.s3),
                      for (final sub in a.subscriptions) SubscriptionStatusTile(subscription: sub),
                      if (a.subscriptions.where(grantsAccess).isEmpty)
                        ref
                            .watch(billingConfigProvider)
                            .maybeWhen(
                              data: (c) => c.enabled && c.googlePlay.available
                                  ? FilledButton.icon(
                                      onPressed: () => context.push(Routes.subscription),
                                      icon: const Icon(Icons.workspace_premium_outlined),
                                      label: Text(l10n.upgradeButton),
                                    )
                                  : Text(l10n.paidComingSoon, style: muted),
                              orElse: () => Text(l10n.paidComingSoon, style: muted),
                            )
                      else
                        OutlinedButton(
                          onPressed: () => context.push(Routes.subscription),
                          child: Text(l10n.manageSubscription),
                        ),
                    ]),
                    section(l10n.dataSection, icon: Icons.download_outlined, [
                      Text(l10n.exportOnWeb, style: muted),
                      const SizedBox(height: WlSpace.s2),
                      OutlinedButton.icon(
                        onPressed: () => _open('/account'),
                        icon: const Icon(Icons.open_in_new),
                        label: Text(l10n.openWebsite),
                      ),
                    ]),
                    section(l10n.legalSection, icon: Icons.gavel_outlined, [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.privacy_tip_outlined),
                        title: Text(l10n.accountPrivacy),
                        trailing: const Icon(Icons.open_in_new, size: 18),
                        onTap: () => _open('/legal/privacy'),
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.description_outlined),
                        title: Text(l10n.accountTerms),
                        trailing: const Icon(Icons.open_in_new, size: 18),
                        onTap: () => _open('/legal/terms'),
                      ),
                    ]),
                    OutlinedButton.icon(onPressed: _logOut, icon: const Icon(Icons.logout), label: Text(l10n.logOut)),
                    const SizedBox(height: WlSpace.s6),
                    section(l10n.deleteSection, border: theme.colorScheme.error, icon: Icons.warning_amber_rounded, [
                      Text(l10n.deleteWarning, style: muted),
                      const SizedBox(height: WlSpace.s3),
                      TextField(
                        controller: _confirm,
                        decoration: InputDecoration(
                          labelText: l10n.deleteConfirmLabel,
                          errorText: _deleteError,
                          errorMaxLines: 3,
                        ),
                        autocorrect: false,
                      ),
                      const SizedBox(height: WlSpace.s3),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: theme.colorScheme.error,
                          foregroundColor: theme.colorScheme.onError,
                          // Destructive: a plain red button, not the brand gradient.
                          backgroundBuilder: (_, _, child) => child!,
                        ),
                        onPressed: _deleting || loaded.fromCache ? null : _delete,
                        child: Text(_deleting ? l10n.deleting : l10n.deleteButton),
                      ),
                    ]),
                    const SizedBox(height: WlSpace.s6),
                    Center(child: Text(l10n.accountVersion(AppConfig.appVersion), style: muted)),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
