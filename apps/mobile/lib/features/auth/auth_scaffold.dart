import 'package:flutter/material.dart';

import '../../shared/widgets/logo.dart';
import '../../shared/widgets/surface.dart';
import '../../theme/app_theme.dart';
import '../../theme/tokens.g.dart';

/// Centered, width-limited layout for sign-in screens.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.children, this.showBack = false});

  final String title;
  final List<Widget> children;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showBack ? AppBar() : null,
      body: Stack(
        children: [
          // Soft brand glow at the top, decorative only.
          Positioned(
            top: -160,
            left: -80,
            right: -80,
            height: 380,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      brandGradient(Theme.of(context).brightness).colors[1].withValues(alpha: 0.28),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(WlSpace.s6),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: WeblumeMark(size: 56)),
                      const SizedBox(height: WlSpace.s4),
                      Semantics(
                        header: true,
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.headlineMedium
                              ?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.5),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: WlSpace.s6),
                      FadeSlideIn(
                        child: WlCard(
                          padding: const EdgeInsets.all(WlSpace.s5),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

const gap = SizedBox(height: WlSpace.s4);

final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
