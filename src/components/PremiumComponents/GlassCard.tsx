/**
 * GlassCard Component
 * Purpose: Glassmorphism card with backdrop blur and subtle borders
 * 
 * Usage:
 * <GlassCard variant="light" intensity="medium">
 *   <Text>Content</Text>
 * </GlassCard>
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { glassEffects } from '../../theme/DesignTokens';
import { borderRadius } from '../../theme';

type GlassVariant = 'light' | 'dark' | 'frosted';
type BlurIntensity = 'light' | 'medium' | 'heavy';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  intensity?: BlurIntensity;
  style?: StyleProp<ViewStyle>;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'light',
  intensity = 'medium',
  style,
}) => {
  const { theme } = useTheme();
  const { shouldUseBlurEffects } = usePerformance();

  const getBlurIntensity = (): number => {
    switch (intensity) {
      case 'light':
        return 10;
      case 'medium':
        return 20;
      case 'heavy':
        return 40;
      default:
        return 20;
    }
  };

  const glassStyle = glassEffects[variant];

  // If device doesn't support blur effects, use fallback
  if (!shouldUseBlurEffects) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={getBlurIntensity()}
      tint={variant === 'dark' ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          backgroundColor: glassStyle.backgroundColor,
          borderColor: glassStyle.borderColor,
          borderWidth: glassStyle.borderWidth,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: 16,
    overflow: 'hidden',
  },
});
