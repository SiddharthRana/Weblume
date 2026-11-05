import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../billing/billing_controller.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/logo.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// The result of a Google Play purchase, as an animated card (the same states and motion as the
/// website's checkout result): a spinning brand ring while it's confirmed, a check that draws itself
/// on success, a cross that shakes once on failure. Still for people who turn animations off.
class PurchaseStatusCard extends StatelessWidget {
  const PurchaseStatusCard({super.key, required this.state, this.onRetry});

  final BillingState state;

  /// Shown as "Try again" on failures the person can retry.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final severity = theme.extension<SeverityColors>()!;
    final success = dark ? WlColorsDark.success : WlColorsLight.success;
    final danger = severity.fg[Severity.critical]!;
    final warning = severity.fg[Severity.medium]!;

    final (Widget badge, String title, String body, Color tone, bool live) = switch (state.phase) {
      PurchasePhase.verifying => (
        const _Spinner(),
        l10n.purchaseVerifyingTitle,
        l10n.purchaseVerifyingBody,
        theme.colorScheme.primary,
        true,
      ),
      PurchasePhase.pending => (
        _Badge(color: warning, child: const Icon(Icons.schedule)),
        l10n.purchasePendingTitle,
        l10n.purchasePending,
        warning,
        true,
      ),
      PurchasePhase.success => (
        _Badge(
          color: success,
          child: _DrawnMark(color: success, cross: false),
        ),
        l10n.purchaseSuccessTitle,
        l10n.purchaseSuccessBody,
        success,
        false,
      ),
      _ => (
        _Shake(
          child: _Badge(
            color: danger,
            child: _DrawnMark(color: danger, cross: true),
          ),
        ),
        state.error == 'verify_failed' || state.error == 'network'
            ? l10n.purchaseDelayedTitle
            : l10n.purchaseFailedTitle,
        switch (state.error) {
          'store_unavailable' => l10n.storeUnavailable,
          'account_mismatch' => l10n.purchaseAccountMismatch,
          'verify_failed' || 'network' => l10n.purchaseVerifyFailed,
          _ => l10n.purchaseFailed,
        },
        danger,
        false,
      ),
    };
    final retry = state.phase == PurchasePhase.error && onRetry != null && state.error != 'account_mismatch';

    return _PopIn(
      key: ValueKey(state.phase),
      child: Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(WlSpace.s4),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: tone.withValues(alpha: 0.45)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ExcludeSemantics(child: badge),
                  const SizedBox(width: WlSpace.s4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: WlSpace.s1),
                        Text(
                          body,
                          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                        if (state.phase == PurchasePhase.success && state.duplicateWarning) ...[
                          const SizedBox(height: WlSpace.s2),
                          Text(l10n.purchaseDuplicate, style: theme.textTheme.bodyMedium?.copyWith(color: warning)),
                        ],
                        if (retry) ...[
                          const SizedBox(height: WlSpace.s3),
                          FilledButton(onPressed: onRetry, child: Text(l10n.tryAgain)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              if (live) ...[
                const SizedBox(height: WlSpace.s4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    minHeight: 4,
                    color: tone,
                    backgroundColor: tone.withValues(alpha: 0.12),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

bool _still(BuildContext context) => MediaQuery.disableAnimationsOf(context);

class _Badge extends StatelessWidget {
  const _Badge({required this.color, required this.child});

  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) => _PopIn(
    scaleFrom: 0.5,
    child: Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.14), shape: BoxShape.circle),
      child: IconTheme(
        data: IconThemeData(color: color, size: 26),
        child: Center(child: child),
      ),
    ),
  );
}

/// The logo inside a spinning brand ring, as on the website's loaders.
class _Spinner extends StatefulWidget {
  const _Spinner();

  @override
  State<_Spinner> createState() => _SpinnerState();
}

class _SpinnerState extends State<_Spinner> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _still(context) ? _c.stop() : _c.repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gradient = brandGradient(Theme.of(context).brightness);
    return SizedBox.square(
      dimension: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          RotationTransition(
            turns: _c,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [gradient.colors.first.withValues(alpha: 0), ...gradient.colors.skip(1)],
                ),
              ),
            ),
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, shape: BoxShape.circle),
          ),
          const WeblumeMark(size: 22),
        ],
      ),
    );
  }
}

/// A check or a cross whose strokes draw themselves.
class _DrawnMark extends StatefulWidget {
  const _DrawnMark({required this.color, required this.cross});

  final Color color;
  final bool cross;

  @override
  State<_DrawnMark> createState() => _DrawnMarkState();
}

class _DrawnMarkState extends State<_DrawnMark> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 450));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_still(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      Future.delayed(const Duration(milliseconds: 200), () => mounted ? _c.forward() : null);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: 26,
    child: AnimatedBuilder(
      animation: _c,
      builder: (_, _) =>
          CustomPaint(painter: _MarkPainter(Curves.easeOut.transform(_c.value), widget.color, widget.cross)),
    ),
  );
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter(this.t, this.color, this.cross);

  final double t;
  final Color color;
  final bool cross;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6 * s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final strokes = cross
        ? [
            Path()
              ..moveTo(7 * s, 7 * s)
              ..lineTo(17 * s, 17 * s),
            Path()
              ..moveTo(17 * s, 7 * s)
              ..lineTo(7 * s, 17 * s),
          ]
        : [
            Path()
              ..moveTo(5 * s, 12.5 * s)
              ..lineTo(9.5 * s, 17 * s)
              ..lineTo(19 * s, 7.5 * s),
          ];
    // Strokes draw one after another.
    for (var i = 0; i < strokes.length; i++) {
      final part = ((t * strokes.length) - i).clamp(0.0, 1.0);
      if (part == 0) continue;
      for (final metric in strokes[i].computeMetrics()) {
        canvas.drawPath(metric.extractPath(0, metric.length * part), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_MarkPainter old) => old.t != t || old.color != color;
}

/// Fades and scales a widget in once.
class _PopIn extends StatefulWidget {
  const _PopIn({super.key, required this.child, this.scaleFrom = 0.96});

  final Widget child;
  final double scaleFrom;

  @override
  State<_PopIn> createState() => _PopInState();
}

class _PopInState extends State<_PopIn> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 380));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _still(context) ? _c.value = 1 : _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(parent: _c, curve: Curves.easeOutBack);
    return FadeTransition(
      opacity: _c,
      child: ScaleTransition(
        scale: Tween(begin: widget.scaleFrom, end: 1.0).animate(curve),
        child: widget.child,
      ),
    );
  }
}

/// Shakes its child once, sideways.
class _Shake extends StatefulWidget {
  const _Shake({required this.child});

  final Widget child;

  @override
  State<_Shake> createState() => _ShakeState();
}

class _ShakeState extends State<_Shake> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_still(context) && _c.value == 0) {
      Future.delayed(const Duration(milliseconds: 500), () => mounted ? _c.forward() : null);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (_, child) =>
        Transform.translate(offset: Offset(math.sin(_c.value * math.pi * 4) * 4 * (1 - _c.value), 0), child: child),
    child: widget.child,
  );
}
