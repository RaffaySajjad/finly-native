/**
 * GoalFocusCard Component
 * Purpose: Display goal-specific metrics and focus areas on dashboard
 * Shows different content based on user's financial goal
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useGoal, GOAL_INFO, UserGoal } from '../hooks/useGoal';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import ScaleButton from './ScaleButton';

interface GoalMetrics {
  // Budget goal metrics
  budgetsOnTrack?: number;
  budgetsOverBudget?: number;
  totalBudgets?: number;
  daysRemaining?: number;
  
  // Save goal metrics
  savingsRate?: number;
  monthlySavings?: number;
  monthlyIncome?: number;
  
  // Track goal metrics
  transactionCount?: number;
  topCategory?: string;
  topCategoryAmount?: number;
  
  // Debt goal metrics
  monthlyExpenses?: number;
  potentialSavings?: number;
}

interface GoalFocusCardProps {
  metrics: GoalMetrics;
  onPress?: () => void;
  formatCurrency: (amount: number) => string;
  categories: any[]; // Using any[] to avoid circular dependency, but should be Category[]
}

const GoalFocusCard: React.FC<GoalFocusCardProps> = ({
  metrics,
  onPress,
  formatCurrency,
  categories,
}) => {
  const { theme } = useTheme();
  const { goal, goalInfo } = useGoal();
  const navigation = useNavigation<any>();
  const { openBottomSheet } = useBottomSheetActions();

  // Render goal-specific content
  const content = useMemo(() => {
    if (!goal || !goalInfo) return null;

    switch (goal) {
      case 'budget':
        return (
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Icon name="check-circle" size={20} color={theme.success} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.budgetsOnTrack ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                On Track
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Icon name="alert-circle" size={20} color={theme.error} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.budgetsOverBudget ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Over Budget
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Icon name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.daysRemaining ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Days Left
              </Text>
            </View>
          </View>
        );

      case 'save':
        const savingsRate = metrics.savingsRate ?? 0;
        const rateColor = savingsRate >= 20 ? theme.success : savingsRate >= 10 ? theme.warning : theme.error;
        return (
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Icon name="percent" size={20} color={rateColor} />
              <Text style={[styles.metricValue, { color: rateColor }]}>
                {savingsRate.toFixed(2)}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Savings Rate
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Icon name="piggy-bank" size={20} color={theme.success} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {formatCurrency(metrics.monthlySavings ?? 0)}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Saved This Month
              </Text>
            </View>
          </View>
        );

      case 'track':
        return (
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Icon name="receipt" size={20} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.transactionCount ?? 0}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Transactions
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Icon name="chart-pie" size={20} color={theme.warning} />
              <Text style={[styles.metricValue, { color: theme.text }]} numberOfLines={1}>
                {metrics.topCategory ?? 'N/A'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                {metrics.topCategoryAmount ? formatCurrency(metrics.topCategoryAmount) : 'Top Category'}
              </Text>
            </View>
          </View>
        );

      case 'debt':
        return (
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Icon name="cash-minus" size={20} color={theme.error} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {formatCurrency(metrics.monthlyExpenses ?? 0)}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Monthly Expenses
              </Text>
            </View>
            {metrics.potentialSavings && metrics.potentialSavings > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.metricItem}>
                  <Icon name="lightbulb" size={20} color={theme.success} />
                  <Text style={[styles.metricValue, { color: theme.success }]}>
                    {formatCurrency(metrics.potentialSavings)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                    Potential Savings
                  </Text>
                </View>
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  }, [goal, goalInfo, metrics, theme, formatCurrency]);

  const renderGoalAction = () => {
    if (!goal) return null;

    let actionLabel = '';
    let actionIcon = '';
    let actionRoute = '';
    let actionParams = {};
    let targetCategoryName = '';
    let isTransactionAction = false;

    switch (goal) {
      case 'debt':
        actionLabel = 'Log Debt Payment';
        actionIcon = 'credit-card-check';
        isTransactionAction = true;
        targetCategoryName = 'Debt Payments';
        break;
      case 'budget':
        actionLabel = 'Review Budgets';
        actionIcon = 'chart-box';
        actionRoute = 'Categories';
        break;
      case 'track':
        actionLabel = 'Log Transaction';
        actionIcon = 'plus-circle';
        isTransactionAction = true;
        break;
    }

    if (!actionLabel) return null;

    return (
      <ScaleButton
        style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, marginTop: spacing.sm, borderTopWidth: 1 }]}
        onPress={() => {
          if (isTransactionAction) {
            // Find category ID if a target name is specified
            let categoryId = '';
            if (targetCategoryName && categories) {
              const category = categories.find(c => c.name === targetCategoryName);
              if (category) {
                categoryId = category.id;
              }
            }

            // Open bottom sheet with pre-filled category
            // We pass a partial expense object that acts as a template
            // @ts-ignore - Partial expense for pre-fill
            openBottomSheet({
              categoryId: categoryId,
              description: targetCategoryName || '',
              date: new Date().toISOString(),
            });
          } else if (actionRoute) {
            // @ts-ignore
            navigation.navigate(actionRoute, actionParams);
          }
        }}
        hapticFeedback="medium"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name={actionIcon as any} size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.primary, fontWeight: '600' }]}>{actionLabel}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={theme.textTertiary} />
      </ScaleButton>
    );
  };


  if (!goal || !goalInfo) {
    return null;
  }

  return (
    <ScaleButton
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
      onPress={onPress || (() => navigation.navigate('Categories'))}
      hapticFeedback="light"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: goalInfo.color + '20' }]}>
          <Icon name={goalInfo.icon as any} size={22} color={goalInfo.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>
            {goalInfo.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your current focus
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={theme.textTertiary} />
      </View>

      {/* Goal-specific metrics */}
      {content}

      {/* Quick Action */}
      {renderGoalAction()}
    </ScaleButton>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  actionButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  metricLabel: {
    ...typography.bodySmall,
    marginTop: 2,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
  },
});

export default GoalFocusCard;
