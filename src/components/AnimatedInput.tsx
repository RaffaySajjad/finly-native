/**
 * AnimatedInput Component
 * Purpose: Premium text input with focus glow effects and smooth animations
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { spacing, borderRadius } from '../theme';
import { glowEffects } from '../theme/DesignTokens';
import { springPresets } from '../theme/AnimationConfig';

interface AnimatedInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  isValid?: boolean;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  isValid,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const { shouldUseGlowEffects } = usePerformance();
  
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      ...springPresets.smooth,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    if (error) {
      // Shake animation for errors
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [error]);

  useEffect(() => {
    if (isValid && !isFocused && textInputProps.value) {
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          ...springPresets.bouncy,
        }),
        Animated.delay(1000),
        Animated.spring(successAnim, {
          toValue: 0,
          ...springPresets.gentle,
        }),
      ]).start();
    }
  }, [isValid, isFocused]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#EF4444' : theme.border, theme.primary],
  });

  const glowStyle = shouldUseGlowEffects && isFocused && !error
    ? {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, glowEffects.subtle.shadowOpacity],
        }),
        shadowRadius: glowEffects.subtle.shadowRadius,
        elevation: glowEffects.subtle.elevation,
      }
    : {};

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderColor,
            transform: [{ translateX: shakeAnim }],
          },
          glowStyle,
        ]}
      >
        {/* Left Icon */}
        {icon && (
          <Icon
            name={icon as any}
            size={20}
            color={isFocused ? theme.primary : theme.textSecondary}
          />
        )}

        {/* Text Input */}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              color: theme.text,
            },
          ]}
          placeholderTextColor={theme.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {/* Success Checkmark */}
        {isValid && !error && (
          <Animated.View
            style={{
              opacity: successAnim,
              transform: [{ scale: successAnim }],
            }}
          >
            <Icon name="check-circle" size={20} color="#10B981" />
          </Animated.View>
        )}

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
            <Icon
              name={rightIcon as any}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <Animated.View
          style={[
            styles.errorContainer,
            {
              opacity: errorAnim,
              transform: [
                {
                  translateY: errorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
});
