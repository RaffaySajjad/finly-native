/**
 * PasswordStrengthIndicator Component
 * Purpose: Visual password strength meter with animated progress
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme';
import { timingPresetsJS } from '../theme/AnimationConfig';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthConfig {
  level: StrengthLevel;
  label: string;
  color: string;
  progress: number;
  icon: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const { theme } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const calculateStrength = (): StrengthConfig => {
    if (!password) {
      return { level: 'weak', label: '', color: '#9CA3AF', progress: 0, icon: '' };
    }

    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { level: 'weak', label: 'Weak', color: '#EF4444', progress: 0.25, icon: 'alert-circle' };
    } else if (score <= 4) {
      return { level: 'fair', label: 'Fair', color: '#F59E0B', progress: 0.5, icon: 'alert' };
    } else if (score <= 5) {
      return { level: 'good', label: 'Good', color: '#3B82F6', progress: 0.75, icon: 'check-circle' };
    } else {
      return { level: 'strong', label: 'Strong', color: '#10B981', progress: 1, icon: 'shield-check' };
    }
  };

  const strength = calculateStrength();

  useEffect(() => {
    if (password) {
      Animated.parallel([
        Animated.timing(progressAnim, {
          toValue: strength.progress,
          ...timingPresetsJS.smooth,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [password, strength.progress]);

  if (!password) return null;

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: strength.color,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Strength label */}
      <View style={styles.labelContainer}>
        <Icon name={strength.icon as any} size={16} color={strength.color} />
        <Text style={[styles.label, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>

      {/* Requirements checklist */}
      <View style={styles.requirements}>
        <RequirementItem
          met={password.length >= 8}
          text="At least 8 characters"
        />
        <RequirementItem
          met={/[A-Z]/.test(password)}
          text="One uppercase letter"
        />
        <RequirementItem
          met={/[a-z]/.test(password)}
          text="One lowercase letter"
        />
        <RequirementItem
          met={/\d/.test(password)}
          text="One number"
        />
      </View>
    </Animated.View>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(met ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: met ? 1 : 0.9,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [met]);

  return (
    <Animated.View
      style={[
        styles.requirement,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Icon
        name={met ? 'check-circle' : 'circle-outline'}
        size={14}
        color={met ? '#10B981' : theme.textSecondary}
      />
      <Text
        style={[
          styles.requirementText,
          {
            color: met ? theme.text : theme.textSecondary,
            opacity: met ? 1 : 0.6,
          },
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirements: {
    gap: spacing.xs,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requirementText: {
    fontSize: 12,
  },
});
