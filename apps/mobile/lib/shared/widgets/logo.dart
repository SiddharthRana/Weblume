import 'package:flutter/material.dart';

/// Geometric placeholder mark (mirrors apps/web/src/components/logo.tsx).
class WeblumeMark extends StatelessWidget {
  const WeblumeMark({super.key, this.size = 28});

  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ExcludeSemantics(
      child: CustomPaint(
        size: Size.square(size),
        painter: _MarkPainter(scheme.primary, scheme.secondary, scheme.onPrimary),
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.bg, this.arc, this.dot);

  final Color bg;
  final Color arc;
  final Color dot;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 32;
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(2 * s, 2 * s, 28 * s, 28 * s), Radius.circular(8 * s)),
      Paint()..color = bg,
    );
    canvas.drawArc(
      Rect.fromCircle(center: Offset(16 * s, 22 * s), radius: 8 * s),
      3.14159,
      3.14159,
      false,
      Paint()
        ..color = arc
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3 * s
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawCircle(Offset(16 * s, 22 * s), 2.5 * s, Paint()..color = dot);
  }

  @override
  bool shouldRepaint(_MarkPainter old) => old.bg != bg || old.arc != arc || old.dot != dot;
}
