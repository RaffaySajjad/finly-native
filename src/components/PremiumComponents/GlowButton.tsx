/**
 * GlowButton Component
 * Purpose: Premium button with animated glow effect, gradient background, and haptic feedback
 * 
 * Usage:
 * <GlowButton onPress={handlePress} variant="primary">
 *   <Text>Click Me</Text>
 * </GlowButton>
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { glowEffects, brandGradients } from '../../theme/DesignTokens';
import { springPresetsJS } from '../../theme/AnimationConfig';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'secondary';

interface GlowButtonProps {
  children: React.ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  glowIntensity?: 'subtle' | 'medium' | 'strong';
  hapticFeedback?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  glowIntensity = 'medium',
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();
  const { shouldUseGlowEffects } = usePerformance();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const getGradientColors = (): string[] => {
    switch (variant) {
      case 'primary':
        return brandGradients.primary.colors;
      case 'success':
        return brandGradients.success.colors;
      case 'danger':
        return brandGradients.expense.colors;
      case 'secondary':
        return [theme.card, theme.card];
      default:
        return brandGradients.primary.colors;
    }
  };

  const getGlowColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#6366F1';
      case 'success':
        return '#10B981';
      case 'danger':
        return '#EF4444';
      case 'secondary':
        return theme.primary;
      default:
        return '#6366F1';
    }
  };

  const handlePressIn = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Use JS driver for ALL animations in this component
    // because glowAnim.interpolate is used in styles and requires JS driver
    // You cannot mix native and JS driven animations in the same Animated.View
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        ...springPresetsJS.snappy,
      }),
      ...(shouldUseGlowEffects ? [
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ] : []),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...springPresetsJS.bouncy,
      }),
      ...(shouldUseGlowEffects ? [
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ] : []),
    ]).start();
  };

  const glowStyle = shouldUseGlowEffects
    ? {
        shadowColor: getGlowColor(),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, glowEffects[glowIntensity].shadowOpacity],
        }),
        shadowRadius: glowEffects[glowIntensity].shadowRadius,
        elevation: glowEffects[glowIntensity].elevation,
      }
    : {};

  return (
    <Animated.View
      style={[
        styles.container,
        glowStyle,
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={styles.touchable}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={brandGradients.primary.start}
          end={brandGradients.primary.end}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  touchable: {
    borderRadius: 12,
    width: '100%',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
