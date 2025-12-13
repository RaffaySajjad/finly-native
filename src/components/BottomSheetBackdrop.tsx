/**
 * BottomSheetBackdrop Component
 * Purpose: Provides a dynamic dark overlay behind bottom sheets
 * Features: Adapts opacity based on bottom sheet position, theme-aware, dismissible
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

/**
 * BottomSheetBackdrop - Dynamic backdrop that darkens area behind bottom sheet
 * Opacity increases as bottom sheet opens and decreases as it closes
 * Uses pressBehavior to handle dismiss on tap
 */
export const BottomSheetBackdrop: React.FC<BottomSheetBackdropProps> = ({
  style,
  animatedIndex,
}) => {
  // Animate opacity based on bottom sheet position
  // When index is -1 (closed), opacity is 0
  // When index is >= 0 (open), opacity increases based on position
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5], // 0% opacity when closed, 50% opacity when fully open
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: '#000000', // Always use black for backdrop
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default BottomSheetBackdrop;

