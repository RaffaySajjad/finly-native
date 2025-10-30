/**
 * TrialBadge Component
 * Purpose: Display trial status badge
 * Shows remaining trial days or trial expiry
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface TrialBadgeProps {
  endDate: string;
  size?: 'small' | 'medium' | 'large';
}

const TrialBadge: React.FC<TrialBadgeProps> = ({ endDate, size = 'medium' }) => {
  const { theme } = useTheme();

  const end = new Date(endDate);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const sizeStyles = {
    small: {
      padding: spacing.xs,
      fontSize: 10,
      iconSize: 12,
    },
    medium: {
      padding: spacing.sm,
      fontSize: 12,
      iconSize: 16,
    },
    large: {
      padding: spacing.md,
      fontSize: 14,
      iconSize: 20,
    },
  };

  const style = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.warning + '20',
          borderColor: theme.warning,
        },
        { padding: style.padding },
      ]}
    >
      <Icon name="timer-outline" size={style.iconSize} color={theme.warning} />
      <Text
        style={[
          styles.text,
          {
            color: theme.warning,
            fontSize: style.fontSize,
          },
        ]}
      >
        {daysRemaining > 0
          ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
          : 'Trial expired'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  text: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
});

export default TrialBadge;

