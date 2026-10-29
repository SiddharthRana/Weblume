import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Severity chip: colour + distinct icon + text, so meaning never relies on colour alone.
class SeverityBadge extends StatelessWidget {
  const SeverityBadge({super.key, required this.severity});

  final Severity severity;

  static const _icons = {
    Severity.critical: Icons.warning_amber_rounded,
    Severity.high: Icons.error_outline,
    Severity.medium: Icons.change_history,
    Severity.low: Icons.check_box_outline_blank,
    Severity.info: Icons.info_outline,
  };

  static String label(Severity s) => switch (s) {
    Severity.critical => 'Critical',
    Severity.high => 'High',
    Severity.medium => 'Medium',
    Severity.low => 'Low',
    Severity.info => 'Info',
  };

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<SeverityColors>()!;
    final fg = colors.fg[severity]!;
    return Semantics(
      label: '${label(severity)} severity',
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(color: colors.bg[severity], borderRadius: BorderRadius.circular(999)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(_icons[severity], size: 14, color: fg),
              const SizedBox(width: 6),
              Text(
                label(severity),
                style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
