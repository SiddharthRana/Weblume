import 'package:flutter/material.dart';

import 'tokens.g.dart';

/// Finding severities, most severe first (mirrors packages/shared).
enum Severity { critical, high, medium, low, info }

/// Severity colours from the design tokens, exposed as a ThemeExtension so widgets
/// pick the right light/dark pair via `Theme.of(context).extension<SeverityColors>()`.
@immutable
class SeverityColors extends ThemeExtension<SeverityColors> {
  const SeverityColors(this.fg, this.bg);

  final Map<Severity, Color> fg;
  final Map<Severity, Color> bg;

  static const light = SeverityColors(
    {
      Severity.critical: WlColorsLight.severityCriticalFg,
      Severity.high: WlColorsLight.severityHighFg,
      Severity.medium: WlColorsLight.severityMediumFg,
      Severity.low: WlColorsLight.severityLowFg,
      Severity.info: WlColorsLight.severityInfoFg,
    },
    {
      Severity.critical: WlColorsLight.severityCriticalBg,
      Severity.high: WlColorsLight.severityHighBg,
      Severity.medium: WlColorsLight.severityMediumBg,
      Severity.low: WlColorsLight.severityLowBg,
      Severity.info: WlColorsLight.severityInfoBg,
    },
  );

  static const dark = SeverityColors(
    {
      Severity.critical: WlColorsDark.severityCriticalFg,
      Severity.high: WlColorsDark.severityHighFg,
      Severity.medium: WlColorsDark.severityMediumFg,
      Severity.low: WlColorsDark.severityLowFg,
      Severity.info: WlColorsDark.severityInfoFg,
    },
    {
      Severity.critical: WlColorsDark.severityCriticalBg,
      Severity.high: WlColorsDark.severityHighBg,
      Severity.medium: WlColorsDark.severityMediumBg,
      Severity.low: WlColorsDark.severityLowBg,
      Severity.info: WlColorsDark.severityInfoBg,
    },
  );

  @override
  SeverityColors copyWith({Map<Severity, Color>? fg, Map<Severity, Color>? bg}) =>
      SeverityColors(fg ?? this.fg, bg ?? this.bg);

  @override
  SeverityColors lerp(ThemeExtension<SeverityColors>? other, double t) =>
      t < 0.5 ? this : (other as SeverityColors? ?? this);
}

abstract final class AppTheme {
  static ThemeData light() => _build(
    brightness: Brightness.light,
    scheme: const ColorScheme(
      brightness: Brightness.light,
      primary: WlColorsLight.primary,
      onPrimary: WlColorsLight.onPrimary,
      secondary: WlColorsLight.accent,
      onSecondary: WlColorsLight.onAccent,
      error: WlColorsLight.danger,
      onError: WlColorsLight.onPrimary,
      surface: WlColorsLight.surface,
      onSurface: WlColorsLight.text,
      onSurfaceVariant: WlColorsLight.textMuted,
      surfaceContainerLowest: WlColorsLight.surface,
      surfaceContainerLow: WlColorsLight.background,
      surfaceContainer: WlColorsLight.background,
      surfaceContainerHigh: WlColorsLight.surfaceMuted,
      surfaceContainerHighest: WlColorsLight.surfaceMuted,
      outline: WlColorsLight.border,
      outlineVariant: WlColorsLight.border,
    ),
    background: WlColorsLight.background,
    severity: SeverityColors.light,
  );

  static ThemeData dark() => _build(
    brightness: Brightness.dark,
    scheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: WlColorsDark.primary,
      onPrimary: WlColorsDark.onPrimary,
      secondary: WlColorsDark.accent,
      onSecondary: WlColorsDark.onAccent,
      error: WlColorsDark.danger,
      onError: WlColorsDark.onPrimary,
      surface: WlColorsDark.surface,
      onSurface: WlColorsDark.text,
      onSurfaceVariant: WlColorsDark.textMuted,
      surfaceContainerLowest: WlColorsDark.background,
      surfaceContainerLow: WlColorsDark.surface,
      surfaceContainer: WlColorsDark.surface,
      surfaceContainerHigh: WlColorsDark.surfaceMuted,
      surfaceContainerHighest: WlColorsDark.surfaceMuted,
      outline: WlColorsDark.border,
      outlineVariant: WlColorsDark.border,
    ),
    background: WlColorsDark.background,
    severity: SeverityColors.dark,
  );

  static ThemeData _build({
    required Brightness brightness,
    required ColorScheme scheme,
    required Color background,
    required SeverityColors severity,
  }) {
    final base = ThemeData(useMaterial3: true, brightness: brightness, colorScheme: scheme);
    final text = base.textTheme.apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);
    return base.copyWith(
      scaffoldBackgroundColor: background,
      textTheme: text.copyWith(
        headlineMedium: text.headlineMedium?.copyWith(fontSize: WlFontSize.s2xl, fontWeight: FontWeight.w700),
        titleLarge: text.titleLarge?.copyWith(fontSize: WlFontSize.xl, fontWeight: FontWeight.w600),
        bodyLarge: text.bodyLarge?.copyWith(fontSize: WlFontSize.md, height: 1.5),
        bodyMedium: text.bodyMedium?.copyWith(fontSize: WlFontSize.sm, height: 1.5),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
        shape: Border(bottom: BorderSide(color: scheme.outline)),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(WlRadius.lg),
          side: BorderSide(color: scheme.outline),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WlRadius.md)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(WlRadius.md)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.surfaceContainerHighest,
      ),
      extensions: [severity],
    );
  }
}
