import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../config/app_config.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/status_views.dart';
import '../../theme/tokens.g.dart';

enum LegalPage {
  privacy,
  terms;

  static LegalPage? fromPath(String? value) => values.where((p) => p.name == value).firstOrNull;

  String title(AppLocalizations l10n) => switch (this) {
    privacy => l10n.accountPrivacy,
    terms => l10n.accountTerms,
  };
}

/// The website's privacy policy or terms, inside the app. The site's own header and footer are
/// removed and its theme follows the app's, so it reads like an app screen. Other links (email,
/// other pages of the site) open outside the app.
class LegalScreen extends StatefulWidget {
  const LegalScreen({super.key, required this.page});

  final LegalPage page;

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  WebViewController? _web;
  bool _ready = false;
  bool _failed = false;
  String? _theme;

  Uri get _url => Uri.parse('${AppConfig.siteUrl}/legal/${widget.page.name}');

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final theme = Theme.of(context).brightness == Brightness.dark ? 'dark' : 'light';
    if (theme == _theme) return;
    _theme = theme;
    if (_web != null) {
      _web!.runJavaScript(_tidyScript(theme)); // the app's theme changed while open
      return;
    }
    // No web view on this platform (for example in widget tests): offer the browser instead.
    if (WebViewPlatform.instance == null) return;
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri != null && uri.origin == _url.origin && uri.path.startsWith('/legal/')) {
              return NavigationDecision.navigate;
            }
            if (uri != null) launchUrl(uri, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          },
          onPageStarted: (_) => setState(() {
            _ready = false;
            _failed = false;
          }),
          onPageFinished: (_) async {
            await _web?.runJavaScript(_tidyScript(_theme!)).catchError((_) {});
            if (mounted && !_failed) setState(() => _ready = true);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) setState(() => _failed = true);
          },
        ),
      )
      ..loadRequest(_url);
  }

  void _retry() {
    setState(() => _failed = false);
    _web?.loadRequest(_url);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final web = _web;
    final Widget body;
    if (web == null) {
      body = EmptyState(
        icon: Icons.description_outlined,
        title: widget.page.title(l10n),
        body: '',
        action: FilledButton.icon(
          onPressed: () => launchUrl(_url, mode: LaunchMode.externalApplication),
          icon: const Icon(Icons.open_in_new),
          label: Text(l10n.legalOpenInBrowser),
        ),
      );
    } else if (_failed) {
      body = ErrorView(message: l10n.legalLoadFailed, onRetry: _retry);
    } else {
      body = Stack(
        children: [
          // Hidden until the site's header and footer are removed, so they never flash.
          AnimatedOpacity(
            opacity: _ready ? 1 : 0,
            duration: const Duration(milliseconds: 200),
            child: WebViewWidget(controller: web),
          ),
          if (!_ready) const LinearProgressIndicator(),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.page.title(l10n)),
        actions: [
          IconButton(
            tooltip: l10n.legalOpenInBrowser,
            icon: const Icon(Icons.open_in_new),
            onPressed: () => launchUrl(_url, mode: LaunchMode.externalApplication),
          ),
          const SizedBox(width: WlSpace.s2),
        ],
      ),
      body: SafeArea(top: false, child: body),
    );
  }
}

/// Matches the site's theme to the app's and removes the site's own navigation.
String _tidyScript(String theme) =>
    '''
(function (t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('weblume.theme', t); } catch (e) {}
  document.querySelectorAll('body > header, body > footer, body > a[href="#main"]').forEach(function (e) { e.remove(); });
})(${jsonEncode(theme)});
''';
