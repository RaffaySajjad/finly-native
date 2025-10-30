/**
 * Material Design 3 Theme
 * Purpose: Material Design 3 color system and components for Android
 */

import { ColorScheme } from './colors';

export interface MaterialDesign3Colors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  elevation: {
    level0: string;
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
  };
}

/**
 * Generate Material Design 3 colors from base theme
 */
export function getMaterialDesign3Colors(baseTheme: ColorScheme): MaterialDesign3Colors {
  return {
    primary: baseTheme.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: baseTheme.primary + '20',
    onPrimaryContainer: baseTheme.primaryDark,
    secondary: baseTheme.info,
    onSecondary: '#FFFFFF',
    surface: baseTheme.surface,
    onSurface: baseTheme.text,
    surfaceVariant: baseTheme.card,
    onSurfaceVariant: baseTheme.textSecondary,
    outline: baseTheme.border,
    outlineVariant: baseTheme.divider,
    shadow: baseTheme.shadow,
    elevation: {
      level0: 'transparent',
      level1: 'rgba(0, 0, 0, 0.05)',
      level2: 'rgba(0, 0, 0, 0.08)',
      level3: 'rgba(0, 0, 0, 0.11)',
      level4: 'rgba(0, 0, 0, 0.14)',
      level5: 'rgba(0, 0, 0, 0.17)',
    },
  };
}

export default {
  getMaterialDesign3Colors,
};

