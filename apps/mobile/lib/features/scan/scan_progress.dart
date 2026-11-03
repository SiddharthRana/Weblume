import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../shared/widgets/surface.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// Waiting screen for a queued or running scan. The API reports only "queued" or "running", so the
/// animation shows activity without pretending to know which step is done. Still when the system
/// asks for reduced motion.
class ScanProgressCard extends StatefulWidget {
  const ScanProgressCard({super.key, required this.url, required this.queued, required this.startedAt});

  final String url;
  final bool queued;
  final DateTime startedAt;

  @override
  State<ScanProgressCard> createState() => _ScanProgressCardState();
}

class _ScanProgressCardState extends State<ScanProgressCard> with SingleTickerProviderStateMixin {
  /// One loop drives every animation on the card, so they stay in step.
  late final AnimationController _loop = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600));
  late Timer _clock;
  Duration _elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final d = DateTime.now().difference(widget.startedAt);
    if (mounted) setState(() => _elapsed = d.isNegative ? Duration.zero : d);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _loop.stop();
      _loop.value = 0.35;
    } else if (!_loop.isAnimating) {
      _loop.repeat();
    }
  }

  @override
  void dispose() {
    _clock.cancel();
    _loop.dispose();
    super.dispose();
  }

  String get _clockText {
    final m = _elapsed.inMinutes;
    final s = _elapsed.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final muted = Color.alphaBlend(scheme.onSurface.withValues(alpha: 0.06), scheme.surface);
    final steps = [l10n.scanStepFetch, l10n.scanStepContent, l10n.scanStepLinks, l10n.scanStepSpeed];
    final host = Uri.tryParse(widget.url)?.host ?? widget.url;

    return WlCard(
      gradientBorder: true,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Page preview with a scan beam sweeping down it.
          ExcludeSemantics(
            child: Container(
              color: muted.withValues(alpha: 0.5),
              padding: const EdgeInsets.all(WlSpace.s5),
              child: _PagePreview(host: host, loop: _loop, muted: muted),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(WlSpace.s5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ExcludeSemantics(child: _PulseDot(loop: _loop)),
                    const SizedBox(width: WlSpace.s3),
                    Expanded(
                      child: Text(
                        widget.queued ? l10n.scanQueued : l10n.scanRunning,
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    Semantics(
                      label: l10n.scanElapsed(_clockText),
                      excludeSemantics: true,
                      child: Text(
                        _clockText,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: WlSpace.s4),
                ExcludeSemantics(
                  child: _IndeterminateBar(loop: _loop, track: muted),
                ),
                const SizedBox(height: WlSpace.s5),
                for (final (i, step) in steps.indexed) ...[
                  Row(
                    children: [
                      ExcludeSemantics(
                        child: _StepDot(loop: _loop, index: i, count: steps.length),
                      ),
                      const SizedBox(width: WlSpace.s3),
                      Expanded(
                        child: Text(step, style: theme.textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                      ),
                    ],
                  ),
                  const SizedBox(height: WlSpace.s3),
                ],
                const SizedBox(height: WlSpace.s2),
                Text(l10n.scanLeaveOpen, style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PagePreview extends StatelessWidget {
  const _PagePreview({required this.host, required this.loop, required this.muted});

  final String host;
  final Animation<double> loop;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final g = brandGradient(Theme.of(context).brightness);
    const widths = [0.70, 0.92, 0.84, 0.55, 0.78];
    const previewHeight = 150.0;

    return Container(
      height: previewHeight,
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(WlRadius.md),
        border: Border.all(color: scheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Browser bar: three dots and the address.
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: scheme.outlineVariant)),
                ),
                child: Row(
                  children: [
                    for (final c in const [Color(0xFFEF6B5E), Color(0xFFF5BE4F), Color(0xFF5FC454)]) ...[
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(color: c.withValues(alpha: 0.7), shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 4),
                    ],
                    const SizedBox(width: 6),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        decoration: BoxDecoration(color: muted, borderRadius: BorderRadius.circular(99)),
                        child: Text(
                          host,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontFamily: 'monospace', fontSize: 10, color: scheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Clipped rather than overflowing when large text makes the address bar taller.
              Expanded(
                child: SingleChildScrollView(
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final (i, w) in widths.indexed) ...[
                        _ShimmerLine(loop: loop, widthFactor: w, index: i, base: muted),
                        const SizedBox(height: 9),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
          // The beam: a soft gradient band with a bright leading edge.
          AnimatedBuilder(
            animation: loop,
            builder: (context, _) {
              final t = Curves.easeInOut.transform(loop.value);
              return Positioned(
                left: 0,
                right: 0,
                top: -40 + t * (previewHeight + 40),
                height: 40,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [g.colors[1].withValues(alpha: 0), g.colors[1].withValues(alpha: 0.22)],
                    ),
                    border: Border(bottom: BorderSide(color: g.colors[1], width: 2)),
                    boxShadow: [
                      BoxShadow(color: g.colors[1].withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 6)),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ShimmerLine extends StatelessWidget {
  const _ShimmerLine({required this.loop, required this.widthFactor, required this.index, required this.base});

  final Animation<double> loop;
  final double widthFactor;
  final int index;
  final Color base;

  @override
  Widget build(BuildContext context) {
    final highlight = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.10);
    return FractionallySizedBox(
      widthFactor: widthFactor,
      child: AnimatedBuilder(
        animation: loop,
        builder: (context, _) {
          // A light band slides across each line, a little later on each one.
          final x = ((loop.value + index * 0.08) % 1) * 3 - 1;
          return Container(
            height: 8,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(99),
              gradient: LinearGradient(
                begin: Alignment(x - 1, 0),
                end: Alignment(x + 1, 0),
                colors: [base, Color.alphaBlend(highlight, base), base],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PulseDot extends StatelessWidget {
  const _PulseDot({required this.loop});

  final Animation<double> loop;

  @override
  Widget build(BuildContext context) {
    final g = brandGradient(Theme.of(context).brightness);
    return SizedBox.square(
      dimension: 14,
      child: AnimatedBuilder(
        animation: loop,
        builder: (context, _) {
          final t = (loop.value * 2) % 1; // two pings per loop
          return Stack(
            alignment: Alignment.center,
            children: [
              Transform.scale(
                scale: 1 + t * 1.2,
                child: Opacity(
                  opacity: (1 - t) * 0.5,
                  child: DecoratedBox(
                    decoration: BoxDecoration(gradient: g, shape: BoxShape.circle),
                    child: const SizedBox.square(dimension: 12),
                  ),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(gradient: g, shape: BoxShape.circle),
                child: const SizedBox.square(dimension: 12),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _IndeterminateBar extends StatelessWidget {
  const _IndeterminateBar({required this.loop, required this.track});

  final Animation<double> loop;
  final Color track;

  @override
  Widget build(BuildContext context) {
    final g = brandGradient(Theme.of(context).brightness);
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: SizedBox(
        height: 6,
        child: LayoutBuilder(
          builder: (context, c) => AnimatedBuilder(
            animation: loop,
            builder: (context, _) {
              final segment = c.maxWidth / 3;
              final t = Curves.easeInOut.transform((loop.value * 1.6) % 1);
              return Stack(
                children: [
                  Positioned.fill(child: ColoredBox(color: track)),
                  Positioned(
                    left: -segment + t * (c.maxWidth + segment),
                    width: segment,
                    top: 0,
                    bottom: 0,
                    child: DecoratedBox(
                      decoration: BoxDecoration(gradient: g, borderRadius: BorderRadius.circular(99)),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Step markers that pulse one after another.
class _StepDot extends StatelessWidget {
  const _StepDot({required this.loop, required this.index, required this.count});

  final Animation<double> loop;
  final int index;
  final int count;

  @override
  Widget build(BuildContext context) {
    final g = brandGradient(Theme.of(context).brightness);
    return SizedBox.square(
      dimension: 12,
      child: AnimatedBuilder(
        animation: loop,
        builder: (context, _) {
          final phase = (loop.value - index / count) % 1;
          final pulse = math.max(0.0, math.sin(phase * math.pi * 2)) * (phase < 0.5 ? 1 : 0);
          return Center(
            child: Transform.scale(
              scale: 1 + pulse * 0.35,
              child: Opacity(
                opacity: 0.55 + pulse * 0.45,
                child: DecoratedBox(
                  decoration: BoxDecoration(gradient: g, shape: BoxShape.circle),
                  child: const SizedBox.square(dimension: 8),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
