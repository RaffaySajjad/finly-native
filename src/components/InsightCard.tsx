/**
 * InsightCard component
 * Purpose: Displays AI-generated financial insights with icons and recommendations
 * Provides actionable tips and warnings to help users save money
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Insight } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface InsightCardProps {
  insight: Insight;
}

/**
 * InsightCard component renders an AI insight with icon and description
 * @param insight - The insight object to display
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: insight.color + '20' }]}>
        <Icon name={insight.icon as any} size={28} color={insight.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{insight.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {insight.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
});

