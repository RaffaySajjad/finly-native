/**
 * PremiumBadge Component
 * Purpose: Displays premium badge/indicator for premium features
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size = 'small',
  showIcon = true,
}) => {
  const { theme } = useTheme();

  const sizeStyles = {
    small: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      fontSize: typography.labelSmall.fontSize,
    },
    medium: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      fontSize: typography.labelMedium.fontSize,
    },
    large: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      fontSize: typography.labelLarge.fontSize,
    },
  };

  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.warning,
          borderColor: theme.warning,
        },
        sizeStyles[size],
      ]}
    >
      {showIcon && (
        <Icon
          name="crown"
          size={iconSize}
          color="#1A1A1A"
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { color: '#1A1A1A' }, sizeStyles[size]]}>
        Premium
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 0,
    marginBottom: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs / 2,
  },
  text: {
    ...typography.labelSmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default PremiumBadge;

