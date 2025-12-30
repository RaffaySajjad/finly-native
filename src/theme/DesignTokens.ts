/**
 * Design Tokens for Premium UI
 * Purpose: Extended design tokens for glow effects, glassmorphism, gradients, and premium visuals
 * 
 * These tokens define Finly's premium visual language
 */

/**
 * Glow Effects
 * For buttons, cards, and interactive elements
 */
export const glowEffects = {
  // Subtle glow - for hover states
  subtle: {
    shadowColor: '#6366F1', // Primary color
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Medium glow - for active states
  medium: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Strong glow - for emphasis
  strong: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // Success glow
  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Error glow
  error: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Glassmorphism Effects
 * For modern, frosted glass UI elements
 */
export const glassEffects = {
  // Light glass - for light backgrounds
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    blurRadius: 10,
  },
  
  // Dark glass - for dark backgrounds
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    blurRadius: 10,
  },
  
  // Frosted - heavy blur effect
  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    blurRadius: 20,
  },
};

/**
 * Brand Gradients
 * Signature Finly gradients for premium feel
 */
export const brandGradients = {
  // Primary gradient - main brand gradient
  primary: {
    colors: ['#6366F1', '#8B5CF6', '#A855F7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Success gradient - for positive actions
  success: {
    colors: ['#10B981', '#059669', '#047857'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Income gradient - for income-related UI
  income: {
    colors: ['#10B981', '#34D399', '#6EE7B7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Expense gradient - for expense-related UI
  expense: {
    colors: ['#EF4444', '#F87171', '#FCA5A5'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Sunset gradient - warm, inviting
  sunset: {
    colors: ['#F59E0B', '#F97316', '#EF4444'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Ocean gradient - cool, calming
  ocean: {
    colors: ['#0EA5E9', '#06B6D4', '#14B8A6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Premium gradient - gold/premium feel
  premium: {
    colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

/**
 * Contextual Gradients
 * For specific UI contexts
 */
export const contextualGradients = {
  // Card background - subtle gradient for cards
  cardBackground: {
    colors: ['rgba(99, 102, 241, 0.05)', 'rgba(139, 92, 246, 0.05)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  
  // Screen background - full screen gradient
  screenBackground: {
    colors: ['#6366F1', '#4F46E5', '#4338CA'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  
  // Button gradient - for premium buttons
  button: {
    colors: ['#6366F1', '#8B5CF6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
};

/**
 * Shadow Presets
 * Extended shadow system for depth
 */
export const shadowPresets = {
  // Subtle shadow - barely visible
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Soft shadow - gentle depth
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Medium shadow - standard depth
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Large shadow - prominent depth
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Dramatic shadow - maximum depth
  dramatic: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 16,
  },
};

/**
 * Animation Tokens
 * Durations, delays, and curves as design tokens
 */
export const animationTokens = {
  // Durations
  duration: {
    instant: 100,
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 700,
  },
  
  // Delays
  delay: {
    none: 0,
    short: 50,
    medium: 100,
    long: 200,
  },
  
  // Stagger (for sequential animations)
  stagger: {
    tight: 50,
    normal: 100,
    relaxed: 150,
  },
};

/**
 * Border Styles
 * Premium border configurations
 */
export const borderStyles = {
  // Subtle border - barely visible
  subtle: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  // Light border - gentle separation
  light: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Medium border - clear separation
  medium: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  
  // Accent border - colored border
  accent: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  
  // Glow border - border with glow effect
  glow: {
    borderWidth: 1,
    borderColor: '#6366F1',
  },
};

/**
 * Backdrop Blur Values
 * For glassmorphism effects
 */
export const backdropBlur = {
  none: 0,
  light: 10,
  medium: 20,
  heavy: 40,
  extreme: 60,
};
