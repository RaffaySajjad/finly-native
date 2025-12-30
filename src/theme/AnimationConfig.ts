/**
 * Animation Configuration
 * Purpose: Centralized animation presets and configurations for consistent motion design
 * 
 * Based on Revolut's smooth, premium animation style
 */

import { Easing } from 'react-native';
import { DeviceTier } from '../utils/PerformanceDetector';

/**
 * Spring Physics Presets
 * Use these for natural, bouncy animations
 */
export const springPresets = {
  // Gentle spring - subtle, elegant motion
  gentle: {
    tension: 40,
    friction: 7,
    useNativeDriver: true,
  },
  
  // Bouncy spring - playful, energetic motion
  bouncy: {
    tension: 50,
    friction: 6,
    useNativeDriver: true,
  },
  
  // Snappy spring - quick, responsive motion
  snappy: {
    tension: 70,
    friction: 8,
    useNativeDriver: true,
  },
  
  // Smooth spring - balanced, professional motion
  smooth: {
    tension: 50,
    friction: 8,
    useNativeDriver: true,
  },
};

/**
 * Spring Physics Presets (JS Driver)
 * Use these for properties that don't support native driver (width, height, color, etc.)
 */
export const springPresetsJS = {
  // Gentle spring - subtle, elegant motion
  gentle: {
    tension: 40,
    friction: 7,
    useNativeDriver: false,
  },
  
  // Bouncy spring - playful, energetic motion
  bouncy: {
    tension: 50,
    friction: 6,
    useNativeDriver: false,
  },
  
  // Snappy spring - quick, responsive motion
  snappy: {
    tension: 70,
    friction: 8,
    useNativeDriver: false,
  },
  
  // Smooth spring - balanced, professional motion
  smooth: {
    tension: 50,
    friction: 8,
    useNativeDriver: false,
  },
};

/**
 * Timing Configurations
 * Use these for linear or eased animations
 */
export const timingPresets = {
  // Fast - for quick feedback (100-200ms)
  fast: {
    duration: 150,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  
  // Normal - for standard transitions (200-400ms)
  normal: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  
  // Slow - for dramatic effects (400-600ms)
  slow: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  
  // Smooth - for elegant transitions
  smooth: {
    duration: 350,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    useNativeDriver: true,
  },
};

/**
 * Timing Configurations (JS Driver)
 * Use these for properties that don't support native driver (width, height, color, etc.)
 */
export const timingPresetsJS = {
  // Fast - for quick feedback (100-200ms)
  fast: {
    duration: 150,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  },
  
  // Normal - for standard transitions (200-400ms)
  normal: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  },
  
  // Slow - for dramatic effects (400-600ms)
  slow: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  },
  
  // Smooth - for elegant transitions
  smooth: {
    duration: 350,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    useNativeDriver: false,
  },
};

/**
 * Easing Curves
 * Custom easing functions for specific effects
 */
export const easingCurves = {
  // Standard ease out - most common
  easeOut: Easing.out(Easing.cubic),
  
  // Ease in out - symmetric motion
  easeInOut: Easing.inOut(Easing.cubic),
  
  // Sharp - quick start, slow end
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  
  // Smooth - Apple-style smooth curve
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  
  // Elastic - bouncy overshoot
  elastic: Easing.elastic(1.2),
  
  // Back - slight overshoot
  back: Easing.back(1.5),
};

/**
 * Animation Durations
 * Device-tier specific durations
 */
export const getDurations = (tier: DeviceTier) => {
  switch (tier) {
    case 'high':
      return {
        instant: 100,
        fast: 150,
        normal: 300,
        slow: 500,
        verySlow: 700,
      };
    
    case 'mid':
      return {
        instant: 100,
        fast: 150,
        normal: 250,
        slow: 400,
        verySlow: 550,
      };
    
    case 'low':
      return {
        instant: 50,
        fast: 100,
        normal: 200,
        slow: 300,
        verySlow: 400,
      };
  }
};

/**
 * Stagger Delays
 * For sequential animations (like list items appearing)
 */
export const staggerDelays = {
  tight: 50,    // Rapid succession
  normal: 100,  // Standard stagger
  relaxed: 150, // Leisurely pace
  dramatic: 200, // Emphasized entrance
};

/**
 * Haptic Feedback Patterns
 * Map animation types to haptic feedback
 */
export const hapticPatterns = {
  // Light tap - for selections, toggles
  light: 'light' as const,
  
  // Medium impact - for button presses
  medium: 'medium' as const,
  
  // Heavy impact - for important actions
  heavy: 'heavy' as const,
  
  // Success - for completions
  success: 'success' as const,
  
  // Warning - for alerts
  warning: 'warning' as const,
  
  // Error - for failures
  error: 'error' as const,
  
  // Selection - for picker changes
  selection: 'selection' as const,
};

/**
 * Animation Sequences
 * Common animation patterns
 */
export const sequences = {
  // Fade in + slide up
  fadeInUp: {
    from: { opacity: 0, translateY: 20 },
    to: { opacity: 1, translateY: 0 },
  },
  
  // Fade in + slide down
  fadeInDown: {
    from: { opacity: 0, translateY: -20 },
    to: { opacity: 1, translateY: 0 },
  },
  
  // Scale in
  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
  },
  
  // Slide in from right
  slideInRight: {
    from: { opacity: 0, translateX: 50 },
    to: { opacity: 1, translateX: 0 },
  },
  
  // Slide in from left
  slideInLeft: {
    from: { opacity: 0, translateX: -50 },
    to: { opacity: 1, translateX: 0 },
  },
};

/**
 * Gesture Thresholds
 * For swipe, drag, and other gestures
 */
export const gestureThresholds = {
  swipeVelocity: 500,      // Minimum velocity for swipe
  swipeDistance: 50,       // Minimum distance for swipe
  longPressDelay: 500,     // Delay before long press triggers
  doubleTapDelay: 300,     // Max time between taps for double tap
  dragThreshold: 10,       // Minimum movement to start drag
};

/**
 * Scroll Animation Config
 * For animated scroll views
 */
export const scrollConfig = {
  decelerationRate: 'fast' as const,
  snapToInterval: undefined,
  snapToAlignment: 'center' as const,
  scrollEventThrottle: 16, // 60fps
};
