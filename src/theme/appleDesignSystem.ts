/**
 * Apple Design System Theme
 * Purpose: Apple Human Interface Guidelines styles for iOS < 26
 */

import { ColorScheme } from './colors';

export interface AppleDesignSystemColors {
  systemBackground: string;
  secondarySystemBackground: string;
  tertiarySystemBackground: string;
  systemGroupedBackground: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  placeholderText: string;
  separator: string;
  opaqueSeparator: string;
  systemBlue: string;
  systemGreen: string;
  systemIndigo: string;
  systemOrange: string;
  systemPink: string;
  systemPurple: string;
  systemRed: string;
  systemTeal: string;
  systemYellow: string;
}

/**
 * Generate Apple Design System colors from base theme
 */
export function getAppleDesignSystemColors(baseTheme: ColorScheme): AppleDesignSystemColors {
  return {
    systemBackground: baseTheme.background,
    secondarySystemBackground: baseTheme.surface,
    tertiarySystemBackground: baseTheme.card,
    systemGroupedBackground: baseTheme.background,
    label: baseTheme.text,
    secondaryLabel: baseTheme.textSecondary,
    tertiaryLabel: baseTheme.textTertiary,
    placeholderText: baseTheme.textTertiary,
    separator: baseTheme.border,
    opaqueSeparator: baseTheme.divider,
    systemBlue: baseTheme.primary,
    systemGreen: baseTheme.success,
    systemIndigo: baseTheme.info,
    systemOrange: baseTheme.warning,
    systemPink: '#FF2D55',
    systemPurple: '#AF52DE',
    systemRed: baseTheme.expense,
    systemTeal: '#5AC8FA',
    systemYellow: '#FFCC00',
  };
}

export default {
  getAppleDesignSystemColors,
};

