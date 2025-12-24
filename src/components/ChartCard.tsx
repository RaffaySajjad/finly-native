/**
 * ChartCard Component
 * Purpose: Reusable card wrapper for charts with title
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

/**
 * ChartCard - Reusable chart card wrapper
 * @param title - Card title
 * @param children - Chart or content to display
 * @param subtitle - Optional subtitle
 * @param rightComponent - Optional right header component
 */
const ChartCard: React.FC<ChartCardProps> = React.memo(({
  title,
  children,
  subtitle,
  rightComponent,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightComponent}
      </View>
      {children}
    </View>
  );
});

ChartCard.displayName = 'ChartCard';

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default ChartCard;

