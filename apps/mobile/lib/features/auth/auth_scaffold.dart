import 'package:flutter/material.dart';

import '../../shared/widgets/logo.dart';
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(WlSpace.s6),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: WeblumeMark(size: 48)),
                  const SizedBox(height: WlSpace.s4),
                  Semantics(
                    header: true,
                    child: Text(title, style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
                  ),
                  const SizedBox(height: WlSpace.s6),
                  ...children,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

const gap = SizedBox(height: WlSpace.s4);

final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
