/**
 * AnimatedCard Component
 * Purpose: Premium card with press animations, elevation changes, and optional glow effects
 * 
 * Usage:
 * <AnimatedCard onPress={handlePress} glowOnPress>
 *   <Text>Card Content</Text>
 * </AnimatedCard>
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
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { glowEffects, shadowPresets } from '../../theme/DesignTokens';
import { springPresetsJS } from '../../theme/AnimationConfig';
import { borderRadius } from '../../theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  glowOnPress?: boolean;
  glowColor?: string;
  hapticFeedback?: boolean;
  disabled?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  glowOnPress = false,
  glowColor,
  hapticFeedback = true,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { shouldUseGlowEffects } = usePerformance();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const elevationAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (hapticFeedback && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        ...springPresetsJS.snappy,
      }),
      Animated.timing(elevationAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...springPresetsJS.gentle,
      }),
      Animated.timing(elevationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    if (hapticFeedback && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.(event);
  };

  const animatedShadow = shouldUseGlowEffects && glowOnPress
    ? {
        shadowColor: glowColor || theme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: elevationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, glowEffects.medium.shadowOpacity],
        }),
        shadowRadius: elevationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [shadowPresets.medium.shadowRadius, glowEffects.medium.shadowRadius],
        }),
        elevation: elevationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [shadowPresets.medium.elevation, glowEffects.medium.elevation],
        }),
      }
    : shadowPresets.medium;

  const CardWrapper = onPress || onLongPress ? TouchableOpacity : Animated.View;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.6 : 1,
        },
        animatedShadow,
        style,
      ]}
    >
      {onPress || onLongPress ? (
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          disabled={disabled}
          activeOpacity={1}
          style={styles.touchable}
        >
          {children}
        </TouchableOpacity>
      ) : (
        children
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
});
