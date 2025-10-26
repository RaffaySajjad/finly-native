/**
 * Typography system for Finly app
 * Purpose: Defines consistent, bold, and readable text styles
 * Inspired by San Francisco font system used in iOS
 */

export const typography = {
  // Display text - For hero sections and major headings
  displayLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
    letterSpacing: -0.25,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: 0,
  },
  
  // Headlines - For screen titles and section headers
  headlineLarge: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  
  // Titles - For card titles and list headers
  titleLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  
  // Body text - For content and descriptions
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  
  // Labels - For buttons, tabs, and small UI elements
  labelLarge: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  
  // Special text styles
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  overline: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};

export type TypographyStyle = keyof typeof typography;

