import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../config/app_config.dart';

/// Holds the Turnstile token for one sign-up, sign-in or password-reset screen. Supabase's CAPTCHA
/// protection rejects those calls without a token once it's on. Without a site key (local builds,
/// tests) the check is off and [ready] is always true.
class AuthCaptchaController extends ChangeNotifier {
  bool get enabled => AppConfig.turnstileSiteKey.isNotEmpty;

  String? _token;
  WebViewController? _web;

  /// True once the person has passed the check.
  bool get ready => !enabled || _token != null;

  /// Pass as `captchaToken`; null when the check is off.
  String? get token => _token;

  void _setToken(String? token) {
    _token = token;
    notifyListeners();
  }

  /// Tokens are single-use: call after every attempt, successful or not.
  Future<void> reset() async {
    if (!enabled) return;
    _setToken(null);
    try {
      await _web?.runJavaScript('resetWidget()');
    } catch (_) {
      // The page may be gone (screen closed); a new one starts fresh.
    }
  }
}

/// Cloudflare's own Turnstile widget, in a small web view. Turnstile only runs on the hostnames
/// listed for the widget in Cloudflare, so the page is loaded as this build's website address
/// (weblu.me or dev.weblu.me), and it reports back through a JavaScript channel.
class AuthCaptcha extends StatefulWidget {
  const AuthCaptcha({super.key, required this.controller});

  final AuthCaptchaController controller;

  @override
  State<AuthCaptcha> createState() => _AuthCaptchaState();
}

class _AuthCaptchaState extends State<AuthCaptcha> {
  WebViewController? _web;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_web != null || !widget.controller.enabled) return;
    final dark = Theme.of(context).brightness == Brightness.dark;
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel('TurnstileBridge', onMessageReceived: (m) => _onMessage(m.message))
      ..loadHtmlString(_page(AppConfig.turnstileSiteKey, dark ? 'dark' : 'light'), baseUrl: '${AppConfig.siteUrl}/');
    widget.controller._web = _web;
  }

  void _onMessage(String message) {
    if (message.startsWith('token:')) {
      widget.controller._setToken(message.substring('token:'.length));
    } else {
      // 'expired' or 'error': Turnstile retries on its own and sends a new token.
      widget.controller._setToken(null);
    }
  }

  @override
  void dispose() {
    if (widget.controller._web == _web) widget.controller._web = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final web = _web;
    if (web == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        // Turnstile's normal widget is 300 × 65.
        child: SizedBox(width: 310, height: 72, child: WebViewWidget(controller: web)),
      ),
    );
  }
}

String _page(String siteKey, String theme) {
  final key = jsonEncode(siteKey);
  final themeJs = jsonEncode(theme);
  return '''<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=start" async defer></script>
</head><body><div id="w"></div><script>
function send(m) { TurnstileBridge.postMessage(m); }
function start() {
  window.wid = turnstile.render('#w', {
    sitekey: $key,
    theme: $themeJs,
    callback: function (t) { send('token:' + t); },
    'expired-callback': function () { send('expired'); },
    'error-callback': function () { send('error'); }
  });
}
function resetWidget() { if (window.wid !== undefined) turnstile.reset(window.wid); }
</script></body></html>''';
}
