/**
 * Performance Detector
 * Purpose: Detect device capabilities and determine optimal animation complexity
 * 
 * Strategy: High-end devices get full premium experience, low-end devices get simplified animations
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeviceTier = 'high' | 'mid' | 'low';
export type AnimationComplexity = 'high' | 'medium' | 'low';

const PERFORMANCE_CACHE_KEY = '@finly_device_tier';

interface PerformanceProfile {
  deviceTier: DeviceTier;
  animationComplexity: AnimationComplexity;
  shouldUseComplexAnimations: boolean;
  shouldUseGlowEffects: boolean;
  shouldUseParticleEffects: boolean;
  shouldUseBlurEffects: boolean;
  maxFPS: 60 | 30;
}

/**
 * Detect device tier based on hardware capabilities
 */
async function detectDeviceTier(): Promise<DeviceTier> {
  try {
    const deviceYearClass = Device.deviceYearClass;
    const modelName = Device.modelName || '';
    const osVersion = Platform.Version;

    // iOS detection
    if (Platform.OS === 'ios') {
      // iPhone 12 and newer (2020+) = high-end
      // iPhone X to 11 (2017-2019) = mid-range
      // Older = low-end
      if (deviceYearClass && deviceYearClass >= 2020) {
        return 'high';
      } else if (deviceYearClass && deviceYearClass >= 2017) {
        return 'mid';
      }
      return 'low';
    }

    // Android detection
    if (Platform.OS === 'android') {
      // Flagship devices from 2020+ = high-end
      // Mid-range devices from 2018+ = mid-range
      // Older or budget = low-end
      if (deviceYearClass && deviceYearClass >= 2020) {
        return 'high';
      } else if (deviceYearClass && deviceYearClass >= 2018) {
        return 'mid';
      }
      return 'low';
    }

    // Default to mid-range for unknown platforms
    return 'mid';
  } catch (error) {
    console.warn('[PerformanceDetector] Error detecting device tier:', error);
    return 'mid'; // Safe default
  }
}

/**
 * Get performance profile based on device tier
 */
function getPerformanceProfile(tier: DeviceTier): PerformanceProfile {
  switch (tier) {
    case 'high':
      return {
        deviceTier: 'high',
        animationComplexity: 'high',
        shouldUseComplexAnimations: true,
        shouldUseGlowEffects: true,
        shouldUseParticleEffects: true,
        shouldUseBlurEffects: true,
        maxFPS: 60,
      };

    case 'mid':
      return {
        deviceTier: 'mid',
        animationComplexity: 'medium',
        shouldUseComplexAnimations: true,
        shouldUseGlowEffects: true,
        shouldUseParticleEffects: false, // Skip heavy particle effects
        shouldUseBlurEffects: true,
        maxFPS: 60,
      };

    case 'low':
      return {
        deviceTier: 'low',
        animationComplexity: 'low',
        shouldUseComplexAnimations: false,
        shouldUseGlowEffects: false, // Skip glow effects
        shouldUseParticleEffects: false,
        shouldUseBlurEffects: false, // Skip blur effects
        maxFPS: 30,
      };
  }
}

/**
 * Initialize performance detection
 * Call this on app launch
 */
export async function initializePerformanceDetection(): Promise<PerformanceProfile> {
  try {
    // Check if we have a cached tier
    const cachedTier = await AsyncStorage.getItem(PERFORMANCE_CACHE_KEY);
    
    let tier: DeviceTier;
    if (cachedTier && (cachedTier === 'high' || cachedTier === 'mid' || cachedTier === 'low')) {
      tier = cachedTier;
    } else {
      // Detect and cache
      tier = await detectDeviceTier();
      await AsyncStorage.setItem(PERFORMANCE_CACHE_KEY, tier);
    }

    const profile = getPerformanceProfile(tier);
    
    console.log('[PerformanceDetector] Device tier:', tier);
    console.log('[PerformanceDetector] Animation complexity:', profile.animationComplexity);
    
    return profile;
  } catch (error) {
    console.error('[PerformanceDetector] Initialization error:', error);
    // Return safe defaults
    return getPerformanceProfile('mid');
  }
}

/**
 * Allow user to override performance settings
 * For power users who want to force high/low performance
 */
export async function setPerformanceOverride(tier: DeviceTier): Promise<void> {
  await AsyncStorage.setItem(PERFORMANCE_CACHE_KEY, tier);
}

/**
 * Reset to auto-detected performance
 */
export async function resetPerformanceOverride(): Promise<void> {
  await AsyncStorage.removeItem(PERFORMANCE_CACHE_KEY);
}
