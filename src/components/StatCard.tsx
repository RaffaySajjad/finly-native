/**
 * StatCard component
 * Purpose: Displays financial statistics with labels and formatted amounts
 * Used for showing income, expenses, balance, and savings
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface StatCardProps {
  label: string;
  amount: number;
  icon: string;
  color?: string;
  subtitle?: string;
}

/**
 * StatCard component renders a financial statistic
 * @param label - The stat label (e.g., "Total Income")
 * @param amount - The monetary amount
 * @param icon - Material Community Icons name
 * @param color - Optional color override
 * @param subtitle - Optional subtitle text
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  amount,
  icon,
  color,
  subtitle,
}) => {
  const { theme } = useTheme();
  const cardColor = color || theme.primary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: cardColor + '20' }]}>
        <Icon name={icon as any} size={24} color={cardColor} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.amount, { color: theme.text }]}>
          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    ...typography.labelSmall,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  amount: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
});

