/**
 * ExpenseCard component
 * Purpose: Displays individual expense item with category icon, amount, and description
 * Features smooth press animation and long press for edit/delete
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Expense, PaymentMethod } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import tagsService from '../services/tagsService';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface ExpenseCardProps {
  expense: Expense;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * ExpenseCard component renders a single expense item
 * @param expense - The expense object to display
 * @param onPress - Optional callback when card is pressed
 * @param onLongPress - Optional callback when card is long pressed
 */
export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string }>>([]);

  // Load tags if expense has tags
  useEffect(() => {
    const loadTags = async () => {
      if (expense.tags && expense.tags.length > 0) {
        try {
          const allTags = await tagsService.getTags();
          const expenseTags = allTags.filter(t => expense.tags?.includes(t.id));
          setTags(expenseTags);
        } catch (error) {
          console.error('Error loading tags:', error);
        }
      }
    };
    loadTags();
  }, [expense.tags]);

  const handleLongPress = () => {
    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.();
  };

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

  const getPaymentMethodIcon = (method?: PaymentMethod): string => {
    const icons: Record<PaymentMethod, string> = {
      credit_card: 'credit-card',
      debit_card: 'card',
      cash: 'cash',
      check: 'receipt',
      bank_transfer: 'bank-transfer',
      digital_wallet: 'wallet',
      other: 'dots-horizontal',
    };
    return method ? icons[method] : 'credit-card-outline';
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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <Icon name={getCategoryIcon(expense.category) as any} size={24} color={categoryColor} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.description, { color: theme.text }]}>{expense.description}</Text>
        <View style={styles.metadataRow}>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDate(expense.date)}</Text>
          {expense.paymentMethod && (
            <>
              <Text style={[styles.metadataSeparator, { color: theme.textTertiary }]}>•</Text>
              <View style={styles.paymentMethodBadge}>
                <Icon name={getPaymentMethodIcon(expense.paymentMethod) as any} size={12} color={theme.textTertiary} />
                <Text style={[styles.paymentMethodText, { color: theme.textTertiary }]}>
                  {expense.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            </>
          )}
        </View>
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 2).map((tag) => (
              <View
                key={tag.id}
                style={[styles.tagBadge, { backgroundColor: tag.color + '15' }]}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagBadgeText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
            {tags.length > 2 && (
              <Text style={[styles.tagMoreText, { color: theme.textTertiary }]}>
                +{tags.length - 2}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            { color: theme.expense },
          ]}
        >
          -{formatCurrency(expense.amount)}
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
    marginBottom: 4,
  },
  date: {
    ...typography.bodySmall,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  metadataSeparator: {
    fontSize: 10,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    ...typography.caption,
    fontSize: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  tagMoreText: {
    ...typography.caption,
    fontSize: 10,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
});

