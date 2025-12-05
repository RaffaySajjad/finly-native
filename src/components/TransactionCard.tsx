/**
 * TransactionCard component
 * Purpose: Displays individual expense or income transaction with category icon, amount, and description
 * Features smooth press animation and long press for edit/delete
 * Performance: Optimized with React.memo and memoized callbacks
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Expense, PaymentMethod, UnifiedTransaction } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyByCode } from '../services/currencyService';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface TransactionCardProps {
  expense?: Expense;
  transaction?: UnifiedTransaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * TransactionCard component renders a single expense or income transaction
 * @param expense - The expense object to display (for backward compatibility)
 * @param transaction - The unified transaction object to display
 * @param onPress - Optional callback when card is pressed
 * @param onLongPress - Optional callback when card is long pressed
 */
const TransactionCardComponent: React.FC<TransactionCardProps> = ({ expense, transaction, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const { formatTransactionAmount, currencyCode } = useCurrency();

  // Use transaction if provided, otherwise fall back to expense
  const tx = transaction || (expense ? {
    id: expense.id,
    type: 'expense' as const,
    amount: expense.amount,
    date: expense.date,
    description: expense.description,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    category: expense.category,
    paymentMethod: expense.paymentMethod,
    tags: expense.tags,
    notes: expense.notes,
  } : null);

  if (!tx) {
    return null;
  }

  // Memoize callbacks for better performance
  const handleLongPress = useCallback(() => {
    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.();
  }, [onLongPress]);

  // Memoize icon getters to prevent recalculation on every render
  const getCategoryIcon = useCallback((category?: { id: string; name: string; icon: string }): string => {
    // Use icon from category object if available
    if (category?.icon) {
      return category.icon;
    }

  // Fallback to icon mapping by category name
    const icons: Record<string, string> = {
      food: 'food',
      transport: 'car',
      shopping: 'shopping',
      entertainment: 'movie',
      health: 'heart-pulse',
      utilities: 'lightning-bolt',
      other: 'dots-horizontal',
    };

    const categoryName = category?.name?.toLowerCase();
    return (categoryName && icons[categoryName]) || 'cash';
  }, []);

  const getIncomeIcon = useCallback((incomeSource?: { id: string; name: string }): string => {
    if (incomeSource?.name) {
      const name = incomeSource.name.toLowerCase();
      if (name.includes('salary') || name.includes('paycheck')) return 'briefcase';
      if (name.includes('freelance') || name.includes('gig')) return 'laptop';
      if (name.includes('investment') || name.includes('dividend')) return 'chart-line';
      if (name.includes('gift') || name.includes('bonus')) return 'gift';
    }
    return 'cash-plus';
  }, []);

  const getPaymentMethodIcon = useCallback((method?: PaymentMethod): string => {
    const icons: Record<PaymentMethod, string> = {
      CREDIT_CARD: 'credit-card',
      DEBIT_CARD: 'card',
      CASH: 'cash',
      CHECK: 'receipt',
      BANK_TRANSFER: 'bank-transfer',
      DIGITAL_WALLET: 'wallet',
      OTHER: 'dots-horizontal',
    };
    return method ? icons[method] : 'credit-card-outline';
  }, []);

  const formatPaymentMethod = (method?: PaymentMethod): string => {
    if (!method) return '';
    return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  const isIncome = tx.type === 'income';
  const category = tx.category;
  const categoryColor = isIncome
    ? theme.income
    : (category?.color || theme.primary);
  const tags = tx.tags || [];
  const iconName = isIncome
    ? getIncomeIcon(tx.incomeSource)
    : getCategoryIcon(category);

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
        <Icon name={iconName as any} size={24} color={categoryColor} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.description, { color: theme.text }]}>{tx.description}</Text>
        <View style={styles.metadataRow}>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDate(tx.date)}</Text>
          {!isIncome && tx.paymentMethod && (
            <>
              <Text style={[styles.metadataSeparator, { color: theme.textTertiary }]}>•</Text>
              <View style={styles.paymentMethodBadge}>
                <Icon name={getPaymentMethodIcon(tx.paymentMethod) as any} size={12} color={theme.textTertiary} />
                <Text style={[styles.paymentMethodText, { color: theme.textTertiary }]}>
                  {formatPaymentMethod(tx.paymentMethod)}
                </Text>
              </View>
            </>
          )}
          {isIncome && tx.incomeSource && (
            <>
              <Text style={[styles.metadataSeparator, { color: theme.textTertiary }]}>•</Text>
              <Text style={[styles.incomeSourceText, { color: theme.textTertiary }]}>
                {tx.incomeSource.name}
              </Text>
            </>
          )}
          {isIncome && tx.autoAdded && (
            <>
              <Text style={[styles.metadataSeparator, { color: theme.textTertiary }]}>•</Text>
              <View style={styles.autoBadge}>
                <Icon name="auto-fix" size={10} color={theme.textTertiary} />
                <Text style={[styles.autoText, { color: theme.textTertiary }]}>Auto</Text>
              </View>
            </>
          )}
        </View>
        {!isIncome && tags.length > 0 && (
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
            { color: isIncome ? theme.income : theme.expense },
          ]}
        >
          {isIncome ? '+' : '-'}{formatTransactionAmount(tx.amount, tx.originalAmount, tx.originalCurrency)}
        </Text>
        {(() => {
          // Show original currency amount if:
          // 1. originalAmount and originalCurrency exist AND differ from active currency, OR
          // 2. originalAmount/originalCurrency are absent AND active currency is not USD (show USD amount)
          
          const hasOriginalCurrency = tx.originalCurrency !== undefined && tx.originalCurrency !== null;
          const hasOriginalAmount = tx.originalAmount !== undefined && tx.originalAmount !== null;
          
          if ((hasOriginalAmount || hasOriginalCurrency) && tx.originalCurrency!.toUpperCase() !== currencyCode.toUpperCase()) {
            // Case 1: Show original currency amount when it differs from active currency
            const originalCurrency = getCurrencyByCode(tx.originalCurrency!);
            const currencySymbol = originalCurrency?.symbol || tx.originalCurrency!;
            return (
              <Text style={[styles.originalAmount, { color: theme.textSecondary }]}>
                {currencySymbol}{tx.originalAmount!.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            );
          } else if ((!hasOriginalAmount || !hasOriginalCurrency) && currencyCode.toUpperCase() !== 'USD') {
            // Case 2: Show USD amount when original currency info is missing and active currency is not USD
            const usdCurrency = getCurrencyByCode('USD');
            const usdSymbol = usdCurrency?.symbol || '$';
            return (
              <Text style={[styles.originalAmount, { color: theme.textSecondary }]}>
                {usdSymbol}{tx.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            );
          }
          // Case 3: Don't show anything if:
          // - originalAmount/originalCurrency are missing AND active currency is USD (both are USD, no need to show)
          // - originalAmount/originalCurrency exist AND match active currency (already shown in main amount)
          return null;
        })()}
      </View>
    </TouchableOpacity>
  );
};

// Export memoized component for performance
export const TransactionCard = React.memo(TransactionCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.expense?.id === nextProps.expense?.id &&
    prevProps.transaction?.id === nextProps.transaction?.id &&
    prevProps.expense?.amount === nextProps.expense?.amount &&
    prevProps.transaction?.amount === nextProps.transaction?.amount &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onLongPress === nextProps.onLongPress
  );
});

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
  incomeSourceText: {
    ...typography.caption,
    fontSize: 10,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoText: {
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
  originalAmount: {
    ...typography.bodySmall,
    fontSize: 11,
    marginTop: 2,
  },
});

