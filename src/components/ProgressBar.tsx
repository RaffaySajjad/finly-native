/**
 * ProgressBar Component
 * Purpose: Reusable progress indicator with customizable colors
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { borderRadius } from '../theme';

interface ProgressBarProps {
  progress: number; // 0-100
  color: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
}

/**
 * ProgressBar - Reusable progress indicator
 * @param progress - Progress value (0-100)
 * @param color - Fill color
 * @param backgroundColor - Background color (default: #E5E7EB)
 * @param height - Bar height (default: 8)
 * @param animated - Animate progress changes (default: false)
 */
const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  progress,
  color,
  backgroundColor = '#E5E7EB',
  height = 8,
  animated = false,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, height, borderRadius: height / 2 },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%`,
            backgroundColor: color,
            height: height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;

