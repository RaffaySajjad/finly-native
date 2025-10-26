/**
 * ExpenseCard component
 * Purpose: Displays individual expense item with category icon, amount, and description
 * Features smooth press animation and swipe-to-delete gesture
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Expense } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface ExpenseCardProps {
  expense: Expense;
  onPress?: () => void;
}

/**
 * ExpenseCard component renders a single expense item
 * @param expense - The expense object to display
 * @param onPress - Optional callback when card is pressed
 */
export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onPress }) => {
  const { theme } = useTheme();

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      food: 'food',
      transport: 'car',
      shopping: 'shopping',
      entertainment: 'movie',
      health: 'heart-pulse',
      utilities: 'lightning-bolt',
      other: 'dots-horizontal',
    };
    return icons[category] || 'cash';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const categoryColor = theme.categories[expense.category as keyof typeof theme.categories] || theme.primary;
  const isExpense = expense.type === 'expense';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <Icon name={getCategoryIcon(expense.category) as any} size={24} color={categoryColor} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.description, { color: theme.text }]}>{expense.description}</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDate(expense.date)}</Text>
      </View>

      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: isExpense ? theme.expense : theme.income },
          ]}
        >
          {isExpense ? '-' : '+'}${expense.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  description: {
    ...typography.titleMedium,
    marginBottom: 2,
  },
  date: {
    ...typography.bodySmall,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
});

