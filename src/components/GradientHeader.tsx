import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandGradients } from '../theme/DesignTokens';

interface GradientHeaderProps {
  style?: ViewStyle;
}

/**
 * GradientHeader - Standardized premium header background
 * Renders a subtle primary gradient at the top of the screen that extends behind the status bar
 */
export const GradientHeader: React.FC<GradientHeaderProps> = ({ style }) => {
  const insets = useSafeAreaInsets();
  
  // Use primary brand color with very low opacity for a subtle, premium feel
  // Primary colors: ['#6366F1', '#8B5CF6', '#A855F7']
  // We want ~8% opacity fading to transparent
  
  return (
    <LinearGradient
      colors={['rgba(99, 102, 241, 0.15)', 'transparent']}
      style={[
        styles.container, 
        { paddingTop: insets.top, height: insets.top + 80 },
        style
      ]}
      pointerEvents="none" // Allow touches to pass through to buttons underneath if needed
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0, // Behind content usually, but requires content to have transparent background
  },
});
