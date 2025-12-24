/**
 * Color palette for Finly app
 * Purpose: Defines premium color scheme with muted blues, whites, and elegant accents
 * Follows design principles inspired by Apple's Human Interface Guidelines
 */

export const lightColors = {
  // Primary colors - Muted sophisticated blues
  primary: '#4A90E2',
  primaryLight: '#6BA3E8',
  primaryDark: '#357ABD',
  
  // Background colors - Clean whites and light grays
  background: '#F8F9FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text colors - High contrast for readability
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Accent colors for categories and insights
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Semantic colors for expenses
  expense: '#EF4444',
  income: '#10B981',
  
  // UI elements
  border: '#E5E7EB',
  divider: '#F3F4F6',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Category colors - Soft, distinguishable palette
  categories: {
    food: '#F59E0B',
    transport: '#3B82F6',
    shopping: '#EC4899',
    entertainment: '#8B5CF6',
    health: '#10B981',
    utilities: '#6366F1',
    other: '#6B7280',
  },
};

export const darkColors = {
  // Primary colors - Adjusted for dark mode
  primary: '#5B9FED',
  primaryLight: '#7BB2F0',
  primaryDark: '#4A90E2',
  
  // Background colors - Deep, rich blacks
  background: '#0F0F0F',
  surface: '#1A1A1A',
  card: '#262626',
  
  // Text colors - Soft whites for reduced eye strain
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  
  // Accent colors - Slightly muted for dark mode
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  // Semantic colors
  expense: '#F87171',
  income: '#34D399',
  
  // UI elements
  border: '#374151',
  divider: '#2D2D2D',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // Category colors - Enhanced for visibility
  categories: {
    food: '#FBBF24',
    transport: '#60A5FA',
    shopping: '#F472B6',
    entertainment: '#A78BFA',
    health: '#34D399',
    utilities: '#818CF8',
    other: '#9CA3AF',
  },
};

export type ColorScheme = typeof lightColors;

