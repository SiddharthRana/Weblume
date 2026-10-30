import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// Rounded, full-width surface with a hairline border and a faint top highlight (Linear-style).
/// With [gradientBorder], the border fades through the brand colours.
class WlCard extends StatelessWidget {
  const WlCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(WlSpace.s4),
    this.onTap,
    this.gradientBorder = false,
    this.accent,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool gradientBorder;

  /// Optional colour bar on the leading edge (e.g. a finding's severity).
  final Color? accent;

  static const radius = 20.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final dark = theme.brightness == Brightness.dark;
    final inner = BorderRadius.circular(radius - (gradientBorder ? 1 : 0));
    Widget content = Padding(padding: padding, child: child);
    if (accent != null) {
      content = IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, color: accent),
            Expanded(child: content),
          ],
        ),
      );
    }
    final surface = Material(
      type: MaterialType.transparency,
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: inner,
          border: gradientBorder ? null : Border.all(color: scheme.outline),
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color.alphaBlend(scheme.onSurface.withValues(alpha: dark ? 0.035 : 0.012), scheme.surface),
              scheme.surface,
            ],
          ),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: inner,
          child: ClipRRect(borderRadius: inner, child: content),
        ),
      ),
    );
    if (!gradientBorder) return SizedBox(width: double.infinity, child: surface);
    final g = brandGradient(theme.brightness);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(1),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [g.colors.first, scheme.outline, scheme.outline, g.colors.last],
          stops: const [0, 0.35, 0.65, 1],
        ),
        boxShadow: [
          BoxShadow(
            color: g.colors[1].withValues(alpha: dark ? 0.28 : 0.16),
            blurRadius: 32,
            offset: const Offset(0, 12),
            spreadRadius: -16,
          ),
        ],
      ),
      child: surface,
    );
  }
}

/// Brand-gradient panel with soft light blobs, for the most important summary on a screen.
/// Text inside should be white (passes WCAG AA on every gradient stop).
class GradientPanel extends StatelessWidget {
  const GradientPanel({super.key, required this.child, this.padding = const EdgeInsets.all(WlSpace.s5)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final g = brandGradient(Theme.of(context).brightness);
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: g,
        borderRadius: BorderRadius.circular(WlCard.radius + 4),
        boxShadow: [
          BoxShadow(
            color: g.colors[1].withValues(alpha: 0.35),
            blurRadius: 40,
            offset: const Offset(0, 18),
            spreadRadius: -18,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(WlCard.radius + 4),
        child: Stack(
          children: [
            const Positioned(right: -40, top: -50, child: _Blob(size: 170, opacity: 0.16)),
            const Positioned(left: -30, bottom: -60, child: _Blob(size: 140, opacity: 0.10)),
            Padding(
              padding: padding,
              child: DefaultTextStyle.merge(
                style: const TextStyle(color: Colors.white),
                child: IconTheme.merge(
                  data: const IconThemeData(color: Colors.white),
                  child: child,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            Colors.white.withValues(alpha: opacity),
            Colors.white.withValues(alpha: 0),
          ],
        ),
      ),
    ),
  );
}

/// Section heading with optional trailing action, used between cards.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.trailing, this.subtitle});

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: WlSpace.s6, bottom: WlSpace.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.2),
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Small uppercase label in the brand colour.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text.toUpperCase(),
      style: theme.textTheme.labelSmall?.copyWith(
        color: color ?? theme.colorScheme.primary,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.1,
      ),
    );
  }
}

/// Round avatar with the brand gradient and an initial (for sites and people).
class GradientAvatar extends StatelessWidget {
  const GradientAvatar({super.key, required this.label, this.size = 40});

  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    final initial = label.trim().isEmpty ? '?' : label.trim().characters.first.toUpperCase();
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: brandGradient(Theme.of(context).brightness),
          borderRadius: BorderRadius.circular(size * 0.32),
        ),
        child: Text(
          initial,
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.42),
        ),
      ),
    );
  }
}

/// Fades and slides its child in, staggered by [index]. Instant when the system asks for reduced
/// motion. Kept short (≤ 0.5 s) so content is fully visible almost immediately.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({super.key, required this.child, this.index = 0});

  final Widget child;
  final int index;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
  late final Animation<double> _t;

  @override
  void initState() {
    super.initState();
    final start = (widget.index * 0.08).clamp(0.0, 0.3);
    _t = CurvedAnimation(
      parent: _c,
      curve: Interval(start, 1, curve: Curves.easeOutCubic),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _t,
    builder: (context, child) => Opacity(
      opacity: _t.value,
      child: Transform.translate(offset: Offset(0, 16 * (1 - _t.value)), child: child),
    ),
    child: widget.child,
  );
}
