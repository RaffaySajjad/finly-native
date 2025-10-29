/**
 * CategoryCard component
 * Purpose: Displays category with spending progress and budget visualization
 * Shows progress bar and percentage of budget used
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Category } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

/**
 * CategoryCard component renders a category spending overview
 * @param category - The category object to display
 * @param onPress - Optional callback when card is pressed
 */
export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const { theme } = useTheme();

  const percentage = category.budgetLimit
    ? Math.min((category.totalSpent / category.budgetLimit) * 100, 100)
    : 0;

  const isOverBudget = category.budgetLimit && category.totalSpent > category.budgetLimit;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
          <Icon name={category.icon as any} size={24} color={category.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
          <Text style={[styles.spent, { color: theme.textSecondary }]}>
            ${category.totalSpent.toFixed(2)}
            {category.budgetLimit && (
              <Text style={{ color: theme.textTertiary }}>
                {' '}/ ${category.budgetLimit.toFixed(2)}
              </Text>
            )}
          </Text>
        </View>
      </View>

      {category.budgetLimit && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: isOverBudget ? theme.error : category.color,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.percentage,
              { color: isOverBudget ? theme.error : theme.textSecondary },
            ]}
          >
            {percentage.toFixed(0)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  categoryName: {
    ...typography.titleMedium,
    marginBottom: 2,
  },
  spent: {
    ...typography.bodyMedium,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  percentage: {
    ...typography.labelMedium,
    minWidth: 40,
    textAlign: 'right',
  },
});

