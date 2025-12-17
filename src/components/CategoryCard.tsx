/**
 * CategoryCard component
 * Purpose: Displays category with spending progress and budget visualization
 * Shows progress bar and percentage of budget used
 * Performance: Optimized with React.memo and useMemo
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Category } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
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
const CategoryCardComponent: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const { theme } = useTheme();
  const { formatCurrency, formatTransactionAmount } = useCurrency();

  // Memoize calculations
  const { percentage, isOverBudget, formattedSpent, formattedBudget } = useMemo(() => {
    const totalSpent = category.totalSpent || 0;
    const pct = category.budgetLimit
      ? Math.min((totalSpent / category.budgetLimit) * 100, 100)
      : 0;
    const overBudget = category.budgetLimit && totalSpent > category.budgetLimit;
    const spent = formatCurrency(totalSpent);
    // Use originalAmount and originalCurrency if available for proper currency display
    const budget = category.budgetLimit 
      ? formatTransactionAmount(category.budgetLimit, category.originalAmount, category.originalCurrency) 
      : null;
    
    return {
      percentage: pct,
      isOverBudget: overBudget,
      formattedSpent: spent,
      formattedBudget: budget,
    };
  }, [category.budgetLimit, category.totalSpent, category.originalAmount, category.originalCurrency, formatCurrency, formatTransactionAmount]);

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
            {formattedSpent}
            {formattedBudget && (
              <Text style={{ color: theme.textTertiary }}>
                {' '}/ {formattedBudget}
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

// Export memoized component for performance
export const CategoryCard = React.memo(CategoryCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.category.id === nextProps.category.id &&
    prevProps.category.totalSpent === nextProps.category.totalSpent &&
    prevProps.category.budgetLimit === nextProps.category.budgetLimit &&
    prevProps.category.originalAmount === nextProps.category.originalAmount &&
    prevProps.category.originalCurrency === nextProps.category.originalCurrency &&
    prevProps.onPress === nextProps.onPress
  );
});

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

