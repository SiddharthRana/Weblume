import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/auth_repository.dart';
import '../../data/providers.dart';
import '../../l10n/app_localizations.dart';
import 'auth_scaffold.dart';

/// "Continue with Google" with an "or" divider below it, the same as the website's log-in and
/// sign-up forms. Hidden unless the build turns Google sign-in on. Google's page opens in the
/// browser; the router moves on once the app comes back signed in.
class GoogleSignInButton extends ConsumerStatefulWidget {
  const GoogleSignInButton({super.key, required this.onError});

  final ValueChanged<String> onError;

  @override
  ConsumerState<GoogleSignInButton> createState() => _GoogleSignInButtonState();
}

class _GoogleSignInButtonState extends ConsumerState<GoogleSignInButton> with WidgetsBindingObserver {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Coming back from the browser without finishing (back button, closed tab) re-enables the button.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _busy && mounted) setState(() => _busy = false);
  }

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      await ref.read(authRepositoryProvider).signInWithGoogle();
    } on AuthFailure catch (e) {
      widget.onError(e.message);
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(authRepositoryProvider).googleEnabled) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed: _busy ? null : _start,
          icon: const _GoogleMark(),
          label: Text(_busy ? l10n.googleOpening : l10n.googleButton),
        ),
        gap,
        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(l10n.orDivider.toUpperCase(), style: theme.textTheme.labelSmall),
            ),
            const Expanded(child: Divider()),
          ],
        ),
        gap,
      ],
    );
  }
}

/// Google's "G", drawn so the app doesn't need an image asset.
class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) => const SizedBox.square(dimension: 18, child: CustomPaint(painter: _GPainter()));
}

class _GPainter extends CustomPainter {
  const _GPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    final stroke = s * 0.2;
    final rect = Rect.fromCircle(center: Offset(s / 2, s / 2), radius: (s - stroke) / 2);
    Paint arc(Color c) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    const deg = 3.14159265 / 180;
    canvas
      ..drawArc(rect, -40 * deg, -100 * deg, false, arc(const Color(0xFFEA4335)))
      ..drawArc(rect, -140 * deg, -90 * deg, false, arc(const Color(0xFFFBBC05)))
      ..drawArc(rect, 130 * deg, -90 * deg, false, arc(const Color(0xFF34A853)))
      ..drawArc(rect, 40 * deg, -40 * deg, false, arc(const Color(0xFF4285F4)))
      ..drawRect(
        Rect.fromLTWH(s / 2, s / 2 - stroke / 2, s / 2 - stroke / 4, stroke),
        Paint()..color = const Color(0xFF4285F4),
      );
  }

  @override
  bool shouldRepaint(_GPainter oldDelegate) => false;
}
