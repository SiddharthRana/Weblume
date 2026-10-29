import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/tokens.g.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  Future<void> _open(String path) async {
    await launchUrl(Uri.parse('${AppConfig.siteUrl}$path'), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.accountTitle)),
      body: ListView(
        padding: const EdgeInsets.all(WlSpace.s4),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(WlSpace.s4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.accountSignedOutTitle, style: theme.textTheme.titleLarge),
                  const SizedBox(height: WlSpace.s2),
                  Text(
                    l10n.accountSignedOutBody,
                    style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: WlSpace.s4),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: Text(l10n.accountPrivacy),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => _open('/legal/privacy'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: Text(l10n.accountTerms),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => _open('/legal/terms'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.delete_outline),
                  title: Text(l10n.accountDeleteInfo),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => _open('/legal/account-deletion'),
                ),
              ],
            ),
          ),
          const SizedBox(height: WlSpace.s6),
          Center(
            child: Text(
              l10n.accountVersion(AppConfig.appVersion),
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}
