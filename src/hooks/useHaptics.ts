/**
 * useHaptics.ts
 * Purpose: Centralized hook for consistent haptic feedback across the app.
 * Provides curated haptic patterns for different interaction types.
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

export const useHaptics = () => {
  /**
   * Light feedback for minor interactions like tab switches or toggles
   */
  const light = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Ignore haptics errors on unsupported devices
    }
  }, []);

  /**
   * Medium feedback for standard button presses
   */
  const medium = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Ignore
    }
  }, []);

  /**
   * Heavy feedback for significant actions like deletions or alerts
   */
  const heavy = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Ignore
    }
  }, []);

  /**
   * Success feedback for completing tasks or positive outcomes
   */
  const success = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Ignore
    }
  }, []);

  /**
   * Error feedback for validation failures or issues
   */
  const error = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Ignore
    }
  }, []);

  /**
   * Selection feedback for scrolling lists or pickers
   */
  const selection = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Ignore
    }
  }, []);

  return {
    light,
    medium,
    heavy,
    success,
    error,
    selection,
  };
};
