import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../shared/widgets/surface.dart';
import '../../api/generated/models.g.dart';
import '../../shared/labels.dart';
import '../../theme/tokens.g.dart';
import '../../utils/url_validation.dart';

class NewScanScreen extends ConsumerStatefulWidget {
  const NewScanScreen({super.key});

  @override
  ConsumerState<NewScanScreen> createState() => _NewScanScreenState();
}

class _NewScanScreenState extends ConsumerState<NewScanScreen> {
  final _url = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final check = checkUrl(_url.text);
    if (!check.isOk) return setState(() => _error = l10n.urlProblem(check.problem!));
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      final res = await ref.read(repositoryProvider).createScan(check.url!);
      onScansChanged(ref);
      if (!mounted) return;
      _url.clear();
      await context.push('/scan/${res.scan.id}');
    } catch (e) {
      if (mounted) setState(() => _error = l10n.apiError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.newScanTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(WlSpace.s4, WlSpace.s6, WlSpace.s4, WlSpace.s8),
        children: [
          FadeSlideIn(
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: brandGradient(theme.brightness),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: brandGradient(theme.brightness).colors[1].withValues(alpha: 0.45),
                        blurRadius: 28,
                        offset: const Offset(0, 10),
                        spreadRadius: -10,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.radar, color: Colors.white, size: 32),
                ),
                const SizedBox(height: WlSpace.s4),
                Text(
                  l10n.newScanHeadline,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.4),
                ),
                const SizedBox(height: WlSpace.s2),
                Text(
                  l10n.newScanSubtitle,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(height: WlSpace.s6),
          FadeSlideIn(
            index: 1,
            child: WlCard(
              gradientBorder: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _url,
                    decoration: InputDecoration(
                      labelText: l10n.urlLabel,
                      hintText: l10n.urlHint,
                      errorText: _error,
                      errorMaxLines: 3,
                      prefixIcon: const Icon(Icons.language),
                    ),
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    enableSuggestions: false,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: WlSpace.s3),
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: const Icon(Icons.search),
                    label: Text(_busy ? l10n.starting : l10n.scanButton),
                  ),
                  const SizedBox(height: WlSpace.s3),
                  Text(
                    l10n.scanDisclaimer,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
          SectionTitle(l10n.whatWeCheck),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: WlSpace.s2,
            crossAxisSpacing: WlSpace.s2,
            childAspectRatio: 2.4,
            children: [
              for (final (i, (c, icon)) in [
                (FindingCategory.performance, Icons.speed),
                (FindingCategory.seo, Icons.travel_explore),
                (FindingCategory.accessibility, Icons.accessibility_new),
                (FindingCategory.technical, Icons.dns_outlined),
              ].indexed)
                FadeSlideIn(
                  index: i + 2,
                  child: WlCard(
                    padding: const EdgeInsets.symmetric(horizontal: WlSpace.s3),
                    child: Row(
                      children: [
                        Icon(icon, color: theme.colorScheme.primary),
                        const SizedBox(width: WlSpace.s2),
                        Expanded(
                          child: Text(
                            l10n.category(c),
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
