/**
 * TransactionDetailsScreen - Transaction Detail View
 * Purpose: Display detailed information about a transaction with edit/delete options
 * Features: Elegant card display, haptic feedback, smooth animations
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { PaymentMethod, Tag, UnifiedTransaction, Expense, IncomeTransaction } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAlert } from '../hooks/useAlert';

type TransactionDetailsRouteProp = RouteProp<RootStackParamList, 'TransactionDetails'>;
type TransactionDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'TransactionDetails'>;

/**
 * TransactionDetailsScreen - Full transaction details modal
 */
const TransactionDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, formatTransactionAmount } = useCurrency();
  const navigation = useNavigation<TransactionDetailsNavigationProp>();
  const route = useRoute<TransactionDetailsRouteProp>();
  const { showError, showInfo, AlertComponent } = useAlert();
  const { openBottomSheet } = useBottomSheetActions();

  const { transaction } = route.params;
  const [tags, setTags] = useState<Tag[]>([]);
  const isExpense = transaction.type === 'expense';

  // Load tags if transaction has tags (expenses only)
  useEffect(() => {
    const loadTags = async () => {
      if (isExpense && transaction.tags && transaction.tags.length > 0) {
        try {
          const allTags = await tagsService.getTags();
          const tagIds = transaction.tags!.map(t => typeof t === 'string' ? t : t.id);
          const expenseTags = allTags.filter(t => tagIds.includes(t.id));
          setTags(expenseTags);
        } catch (error) {
          console.error('Error loading tags:', error);
        }
      }
    };
    loadTags();
  }, [transaction.tags, isExpense]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getPaymentMethodName = (method?: PaymentMethod): string => {
    if (!method) return 'Not specified';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPaymentMethodIcon = (method?: PaymentMethod): string => {
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
  };

  const getCategoryIcon = (category?: { id: string; name: string; icon: string }): string => {
    return category?.icon || 'cash';
  };

  const getCategoryName = (category?: { id: string; name: string }): string => {
    return category?.name || 'Other';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isExpense) {
      const expense: Expense = {
        id: transaction.id,
        amount: transaction.amount,
        categoryId: transaction.category!.id,
        category: transaction.category!,
        description: transaction.description,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        tags: transaction.tags,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt || transaction.createdAt,
      };
      navigation.goBack(); // Close details screen first
      setTimeout(() => openBottomSheet(expense), 300); // Open bottom sheet after navigation completes
    } else {
      // Use bottom sheet for income editing
      const income: IncomeTransaction = {
        id: transaction.id,
        userId: '', // Not needed for editing
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        incomeSourceId: transaction.incomeSource?.id,
        autoAdded: transaction.autoAdded || false,
        createdAt: transaction.createdAt,
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
      };
      navigation.goBack(); // Close details screen first
      setTimeout(() => openBottomSheet(undefined, income), 300); // Open bottom sheet after navigation completes
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const deleteTransaction = async () => {
      try {
        if (isExpense) {
          await apiService.deleteExpense(transaction.id);
        } else {
          await apiService.deleteIncomeTransaction(transaction.id);
        }
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        navigation.goBack();
      } catch (error) {
        showError('Error', 'Failed to delete transaction');
      }
    };

    showInfo(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteTransaction,
        },
      ]
    );
  };

  const category = isExpense ? transaction.category : undefined;
  const categoryColor = category?.color || (isExpense ? theme.primary : theme.income);
  const categoryName = isExpense ? getCategoryName(category) : 'Income';
  const categoryIcon = isExpense ? getCategoryIcon(category) : 'cash-plus';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.lg,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Category Icon */}
          <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
            <Icon name={categoryIcon as any} size={64} color={categoryColor} />
          </View>

          {/* Amount */}
          <Text
            style={[
              styles.amount,
              { color: isExpense ? theme.expense : theme.income },
            ]}
          >
            {isExpense ? '-' : '+'}{formatTransactionAmount(transaction.amount, transaction.originalAmount, transaction.originalCurrency)}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.text }]}>
            {transaction.description}
          </Text>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Category/Income Source */}
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                {isExpense ? 'Category' : 'Income Source'}
              </Text>
              <View style={styles.detailValueRow}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {isExpense ? categoryName : (transaction.incomeSource?.name || 'Manual Income')}
                </Text>
              </View>
            </View>

            {/* Type */}
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Type</Text>
              <View style={styles.detailValueRow}>
                <Icon
                  name={isExpense ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={isExpense ? theme.expense : theme.income}
                />
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {isExpense ? 'Expense' : 'Income'}
                </Text>
              </View>
            </View>

            {/* Payment Method (expenses only) */}
            {isExpense && transaction.paymentMethod && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payment Method</Text>
              <View style={styles.detailValueRow}>
                <Icon
                    name={getPaymentMethodIcon(transaction.paymentMethod) as any}
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {getPaymentMethodName(transaction.paymentMethod)}
                  </Text>
                </View>
              </View>
            )}

            {/* Auto Added (income only) */}
            {!isExpense && transaction.autoAdded !== undefined && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Source</Text>
                <View style={styles.detailValueRow}>
                  <Icon
                    name={transaction.autoAdded ? 'auto-fix' : 'hand-pointing-right'}
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {transaction.autoAdded ? 'Auto Added' : 'Manual Entry'}
                  </Text>
                </View>
              </View>
            )}

            {/* Date */}
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(transaction.date)}
              </Text>
            </View>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.detailItemFull}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {tags.map((tag) => (
                    <View
                      key={tag.id}
                      style={[styles.tagChip, { backgroundColor: tag.color + '20', borderColor: tag.color }]}
                    >
                      <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ID */}
            <View style={[styles.detailItem, styles.detailItemFull]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
              <Text style={[styles.detailValue, { color: theme.textTertiary, fontFamily: 'monospace' }]}>
                {transaction.id}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.aiButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => navigation.navigate('AIAssistant', {
                context: { transactionId: transaction.id },
                initialQuery: `Tell me about this transaction: ${transaction.description}`,
              })}
            >
              <Icon name="robot" size={18} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Ask AI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.editButton,
                { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Icon name="pencil" size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.deleteButton,
                { backgroundColor: theme.expense + '20', borderColor: theme.expense },
              ]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Icon name="delete-outline" size={20} color={theme.expense} />
              <Text style={[styles.actionButtonText, { color: theme.expense }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Alert Dialog */}
      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amount: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.titleMedium,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  detailsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
  },
  detailItemFull: {
    width: '100%',
  },
  detailLabel: {
    ...typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagChipText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  actionButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  editButton: {},
  deleteButton: {},
  aiButton: {},
  actionButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
});

export default TransactionDetailsScreen;

