/**
 * BottomSheetBackground - Platform-aware bottom sheet background
 * Purpose: Provides frosted glass effect on iOS 26+ (liquid glass design)
 *          and solid background on Android for optimal UX
 * Features: Auto-detects platform and OS version, scalable across all bottom sheets
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../contexts/ThemeContext';

interface BottomSheetBackgroundProps {
  style?: any;
}

/**
 * Detect if we should use the liquid glass effect (iOS 26+)
 * Exported for reuse in components that need to adapt styling based on background type
 * @returns {boolean} True if device supports translucent background
 */
export const shouldUseLiquidGlass = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  // iOS 26.0 = version 26
  const iosVersion = parseInt(Platform.Version as string, 10);
  return iosVersion >= 26;
};

/**
 * BottomSheetBackground Component
 * 
 * Renders a frosted glass blur effect on iOS 26+ for Apple's liquid glass design,
 * while maintaining solid background on Android and older iOS versions.
 */
export const BottomSheetBackground: React.FC<BottomSheetBackgroundProps> = ({ style }) => {
  const { theme, isDark } = useTheme();

  // iOS 26+ Liquid Glass Effect
  // if (shouldUseLiquidGlass()) {
  //   return (
  //     <BlurView
  //       style={[StyleSheet.absoluteFill, style]}
  //       blurType={isDark ? 'dark' : 'light'} // Adapts to theme
  //       blurAmount={20} // Increased blur for liquid glass effect
  //       reducedTransparencyFallbackColor={theme.card}
  //     />
  //   );
  // }

  // Fallback for Android and older iOS versions
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.card,
          // Add shadow/elevation to top of bottom sheet for better visual separation
          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: -4, // Negative height creates shadow above
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8, // Android elevation
        },
        style,
      ]}
    />
  );
};

export default BottomSheetBackground;

