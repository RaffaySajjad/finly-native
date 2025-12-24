/**
 * EmptyState Component
 * Purpose: Reusable empty state with icon, title, and optional action button
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  iconSize?: number;
}

/**
 * EmptyState - Reusable empty state component
 * @param icon - Icon name to display
 * @param title - Main title text
 * @param subtitle - Optional subtitle text
 * @param actionLabel - Optional action button label
 * @param onActionPress - Action button press handler
 * @param iconSize - Icon size (default: 64)
 */
const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  icon,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  iconSize = 64,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon as any} size={iconSize} color={theme.textTertiary} />
      <Text style={[styles.title, { color: theme.textSecondary }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onActionPress && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }, elevation.sm]}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.titleMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default EmptyState;

