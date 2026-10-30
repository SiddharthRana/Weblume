import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/tokens.g.dart';

/// Scan usage for the current period. [onGradient] renders it in white for use inside a
/// [GradientPanel], with a circular gauge; otherwise a compact bar.
class UsageMeter extends StatelessWidget {
  const UsageMeter({
    super.key,
    required this.used,
    required this.limit,
    required this.resetsAt,
    this.onGradient = false,
  });

  final int used;
  final int limit;
  final DateTime resetsAt;
  final bool onGradient;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final remaining = (limit - used).clamp(0, limit);
    final fraction = limit == 0 ? 1.0 : (used / limit).clamp(0.0, 1.0);
    final date = DateFormat.yMMMd().format(resetsAt.toLocal());
    final status = remaining == 0 ? l10n.usageNoneLeft(date) : l10n.usageRemaining(remaining, date);

    if (onGradient) {
      return Semantics(
        label: l10n.usageSemantics(used, limit),
        excludeSemantics: true,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.usageTitle, style: theme.textTheme.titleSmall?.copyWith(color: Colors.white)),
                  const SizedBox(height: WlSpace.s1),
                  Text(
                    l10n.usageCount(used, limit),
                    style: theme.textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: WlSpace.s1),
                  Text(status, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white)),
                ],
              ),
            ),
            const SizedBox(width: WlSpace.s4),
            SizedBox.square(
              dimension: 76,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: fraction),
                duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (context, v, _) => CustomPaint(painter: _GaugePainter(v)),
              ),
            ),
          ],
        ),
      );
    }

    return Semantics(
      label: l10n.usageSemantics(used, limit),
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(l10n.usageTitle, style: theme.textTheme.titleSmall)),
              Text(l10n.usageCount(used, limit)),
            ],
          ),
          const SizedBox(height: WlSpace.s2),
          ClipRRect(
            borderRadius: BorderRadius.circular(WlRadius.full),
            child: LinearProgressIndicator(
              value: fraction,
              minHeight: 8,
              color: remaining == 0 ? theme.colorScheme.error : theme.colorScheme.primary,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
          ),
          const SizedBox(height: WlSpace.s2),
          Text(status, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter(this.fraction);

  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 8.0;
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, 0, math.pi * 2, false, paint..color = Colors.white.withValues(alpha: 0.22));
    if (fraction > 0) {
      canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * fraction, false, paint..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(_GaugePainter old) => old.fraction != fraction;
}
