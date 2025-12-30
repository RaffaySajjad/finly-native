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

  // Check if this is a rollover (savings) category
  const isRolloverCategory = category.budgetType === 'ROLLOVER' && category.rollover;

  // Memoize calculations
  const { percentage, isOverBudget, formattedSpent, formattedBudget, accumulatedBudget } = useMemo(() => {
    const totalSpent = category.totalSpent || 0;

    // For rollover categories, compare against accumulated budget
    if (isRolloverCategory && category.rollover) {
      const accumulated = category.rollover.accumulatedBudget;
      // Use totalBudget (carried + allocated) for percentage calculation, not accumulated (which can be negative)
      const totalBudget = category.rollover.carriedOver + category.rollover.monthlyAllocation;
      const pct = totalBudget > 0
        ? Math.min((totalSpent / totalBudget) * 100, 100)
        : 0;
      // Overspent when accumulated is negative or when spent exceeds available
      const overBudget = accumulated < 0 || totalSpent > Math.max(0, accumulated);

      return {
        percentage: pct,
        isOverBudget: overBudget,
        formattedSpent: formatCurrency(totalSpent),
        // Show absolute value for budget display - the badge/styling indicates overspent
        formattedBudget: formatCurrency(Math.abs(accumulated)),
        accumulatedBudget: accumulated,
      };
    }

    // For monthly categories, original behavior
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
      accumulatedBudget: null,
    };
  }, [category.budgetLimit, category.budgetType, category.rollover, category.totalSpent, category.originalAmount, category.originalCurrency, formatCurrency, formatTransactionAmount, isRolloverCategory]);

  // Calculate overspent amount for badge
  const overspentAmount = useMemo(() => {
    if (!isOverBudget) return null;
    if (isRolloverCategory && accumulatedBudget) {
      return (category.totalSpent || 0) - accumulatedBudget;
    }
    if (!category.budgetLimit) return null;
    return (category.totalSpent || 0) - category.budgetLimit;
  }, [isOverBudget, category.totalSpent, category.budgetLimit, isRolloverCategory, accumulatedBudget]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isOverBudget ? theme.error : theme.border,
          borderWidth: isOverBudget ? 1.5 : 1,
        },
        elevation.sm,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Over Budget Badge */}
      {isOverBudget && (
        <View style={[styles.overBudgetBadge, { backgroundColor: theme.error }]}>
          <Icon name="alert-circle" size={12} color="#FFFFFF" />
          <Text style={styles.overBudgetText}>
            Over by {formatCurrency(overspentAmount || 0)}
          </Text>
        </View>
      )}

      {/* Savings/Rollover Badge (only when not over budget) */}
      {isRolloverCategory && !isOverBudget && (
        <View style={[styles.savingsBadge, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="piggy-bank" size={12} color={theme.primary} />
          <Text style={[styles.savingsBadgeText, { color: theme.primary }]}>
            {category.rollover?.monthsAccumulating || 1} month{category.rollover?.monthsAccumulating !== 1 ? 's' : ''} saved
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: isOverBudget ? theme.error + '20' : category.color + '20' }
        ]}>
          <Icon
            name={category.icon as any}
            size={24}
            color={isOverBudget ? theme.error : category.color}
          />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
            {isOverBudget && (
              <Icon name="alert" size={16} color={theme.error} style={styles.warningIcon} />
            )}
          </View>
          <Text style={[styles.spent, { color: isOverBudget ? theme.error : theme.textSecondary }]}>
            {formattedSpent}
            {formattedBudget && (
              <Text style={{ color: theme.textTertiary }}>
                {isRolloverCategory
                  ? (isOverBudget ? ` spent of ${formattedBudget} budget` : ` of ${formattedBudget} available`)
                  : ` / ${formattedBudget}`
                }
              </Text>
            )}
          </Text>
        </View>
      </View>

      {category.budgetLimit ? (
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
      ) : (
        <View style={styles.setBudgetContainer}>
          <Icon name="target" size={14} color={theme.textTertiary} />
          <Text style={[styles.setBudgetText, { color: theme.textTertiary }]}>
            Tap to set a budget
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
    prevProps.category.budgetType === nextProps.category.budgetType &&
    prevProps.category.originalAmount === nextProps.category.originalAmount &&
    prevProps.category.originalCurrency === nextProps.category.originalCurrency &&
    prevProps.category.rollover?.accumulatedBudget === nextProps.category.rollover?.accumulatedBudget &&
    prevProps.category.rollover?.monthsAccumulating === nextProps.category.rollover?.monthsAccumulating &&
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
  overBudgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: 4,
  },
  overBudgetText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: 4,
  },
  savingsBadgeText: {
    ...typography.labelSmall,
    fontWeight: '600',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    ...typography.titleMedium,
    marginBottom: 2,
  },
  warningIcon: {
    marginLeft: spacing.xs,
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
  setBudgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  setBudgetText: {
    ...typography.labelSmall,
    fontStyle: 'italic',
  },
});

