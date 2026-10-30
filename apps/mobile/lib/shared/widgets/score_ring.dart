import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';

/// Lighthouse-style score ring: 90–100 good, 50–89 needs work, 0–49 poor.
class ScoreRing extends StatelessWidget {
  const ScoreRing({super.key, required this.score, required this.label, this.size = 72});

  final int score;
  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final sev = theme.extension<SeverityColors>()!;
    final s = score.clamp(0, 100);
    final (band, color) = s >= 90
        ? (l10n.scoreGood, theme.brightness == Brightness.dark ? const Color(0xFF4ADE80) : const Color(0xFF0F7A3D))
        : s >= 50
        ? (l10n.scoreNeedsWork, sev.fg[Severity.medium]!)
        : (l10n.scorePoor, theme.colorScheme.error);
    return Semantics(
      label: l10n.scoreSemantics(label, s, band),
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox.square(
            dimension: size,
            // The ring fills in on first show (instantly when the system asks for reduced motion).
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: s / 100),
              duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (context, value, child) => CustomPaint(
                painter: _RingPainter(value, color, theme.colorScheme.surfaceContainerHighest),
                child: child,
              ),
              child: Center(
                child: Text('$s', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(label, style: theme.textTheme.bodyMedium, textAlign: TextAlign.center),
          Text(band, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction, this.color, this.track);

  final double fraction;
  final Color color;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.09;
    final rect = Offset.zero & size;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect.deflate(stroke / 2), 0, math.pi * 2, false, paint..color = track);
    canvas.drawArc(rect.deflate(stroke / 2), -math.pi / 2, math.pi * 2 * fraction, false, paint..color = color);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction || old.color != color || old.track != track;
}
