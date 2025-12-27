/**
 * CategoryDetailsScreen - Category Detail View with Budget Editing
 * Purpose: Display category details with transactions and editable budget
 * Features: Budget editing, progress visualization, transaction list
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useAlert } from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';
import { getDateKey, formatDateLabel, isCurrentMonth, getMonthLabel } from '../utils/dateFormatter';
import { TransactionCard, BottomSheetBackground, CurrencyInput } from '../components';
import { Expense, Category, UnifiedTransaction, RolloverSummary, BudgetType } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { RootStackParamList } from '../navigation/types';

type CategoryDetailsRouteProp = RouteProp<RootStackParamList, 'CategoryDetails'>;
type CategoryDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryDetails'>;

interface GroupedExpenses {
  date: string;
  dateLabel: string;
  expenses: Expense[];
}

interface MonthGroupedExpenses {
  monthLabel: string;
  isCurrentMonth: boolean;
  dateGroups: GroupedExpenses[];
}

/**
 * Group expenses by month first, then by date within each month
 */
const groupExpensesByMonthAndDate = (expenses: Expense[]): MonthGroupedExpenses[] => {
  // Remove duplicates by ID first
  const uniqueExpenses = Array.from(
    new Map(expenses.map(expense => [expense.id, expense])).values()
  );

  // Sort by date (newest first)
  const sortedExpenses = [...uniqueExpenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Separate into current month and past months
  const currentMonthExpenses: Expense[] = [];
  const pastMonthsExpenses: Expense[] = [];

  sortedExpenses.forEach((expense) => {
    if (isCurrentMonth(expense.date)) {
      currentMonthExpenses.push(expense);
    } else {
      pastMonthsExpenses.push(expense);
    }
  });

  /**
   * Group expenses by date within a month
   */
  const groupByDate = (expenseList: Expense[]): GroupedExpenses[] => {
    const grouped: Record<string, Expense[]> = {};

    expenseList.forEach((expense) => {
      const dateKey = getDateKey(expense.date);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    // Convert to array and sort by date (newest first)
    return Object.entries(grouped)
      .map(([date, expenses]) => ({
        date,
        dateLabel: formatDateLabel(expenses[0].date),
        expenses: expenses.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const result: MonthGroupedExpenses[] = [];

  // Add current month group if it has expenses
  if (currentMonthExpenses.length > 0) {
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    result.push({
      monthLabel: `${monthName} (This month)`,
      isCurrentMonth: true,
      dateGroups: groupByDate(currentMonthExpenses),
    });
  }

  // Group past months expenses by month
  const pastMonthsGrouped: Record<string, Expense[]> = {};
  pastMonthsExpenses.forEach((expense) => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!pastMonthsGrouped[monthKey]) {
      pastMonthsGrouped[monthKey] = [];
    }
    pastMonthsGrouped[monthKey].push(expense);
  });

  // Convert past months to array and sort by month (newest first)
  const pastMonthsArray = Object.entries(pastMonthsGrouped)
    .map(([monthKey, expenses]) => {
      const firstExpense = expenses[0];
      return {
        monthKey,
        monthLabel: getMonthLabel(firstExpense.date, false),
        expenses,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // Add past month groups
  pastMonthsArray.forEach(({ monthLabel, expenses }) => {
    result.push({
      monthLabel,
      isCurrentMonth: false,
      dateGroups: groupByDate(expenses),
    });
  });

  return result;
};

/**
 * CategoryDetailsScreen - Detailed category view
 */
const CategoryDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, convertFromUSD, convertToUSD, currencyCode, formatTransactionAmount } = useCurrency();
  const navigation = useNavigation<CategoryDetailsNavigationProp>();
  const route = useRoute<CategoryDetailsRouteProp>();

  const { categoryId } = route.params;
  const { showError, showSuccess, showWarning, showInfo, AlertComponent } = useAlert();

  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupedExpenses, setGroupedExpenses] = useState<MonthGroupedExpenses[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [newBudget, setNewBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [selectedBudgetCurrency, setSelectedBudgetCurrency] = useState<string | undefined>(undefined);
  const [budgetType, setBudgetType] = useState<BudgetType>('MONTHLY');
  const [originalBudgetType, setOriginalBudgetType] = useState<BudgetType>('MONTHLY'); // Track original type for conversion detection
  const [applyToCurrentMonth, setApplyToCurrentMonth] = useState(false);
  const [rolloverSummary, setRolloverSummary] = useState<RolloverSummary | null>(null);
  const [showBudgetHistory, setShowBudgetHistory] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const historySheetRef = useRef<BottomSheet>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      logger.debug('[CategoryDetailsScreen] useFocusEffect - categoryId:', categoryId);
      loadData(true);
    }, [categoryId])
  );

  useEffect(() => {
    if (category) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: category.budgetLimit ? ((category.totalSpent || 0) / category.budgetLimit) : 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [category]);

  /**
   * Load category data and expenses with pagination
   */
  const loadData = async (initialLoad: boolean = false) => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Load category info
      const categoriesData = await apiService.getCategories();
      const cat = categoriesData.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        setBudgetType(cat.budgetType || 'MONTHLY');
        // Use originalAmount if available (preserves user's original input)
        // Otherwise fall back to converting budgetLimit from USD
        if (cat.originalAmount !== undefined && cat.originalAmount !== null) {
          setNewBudget(cat.originalAmount > 0 ? cat.originalAmount.toString() : '');
          // Set the currency to the original currency if available
          setSelectedBudgetCurrency(cat.originalCurrency || undefined);
        } else {
          const budgetInDisplayCurrency = cat.budgetLimit ? convertFromUSD(cat.budgetLimit) : 0;
          setNewBudget(budgetInDisplayCurrency > 0 ? budgetInDisplayCurrency.toString() : '');
          // Reset currency selection to user's active currency
          setSelectedBudgetCurrency(undefined);
        }

        // Load rollover summary for ROLLOVER type categories
        if (cat.budgetType === 'ROLLOVER') {
          try {
            const summary = await apiService.getRolloverSummary(categoryId);
            setRolloverSummary(summary);
          } catch (rolloverError) {
            logger.warn('[CategoryDetailsScreen] Failed to load rollover summary:', rolloverError);
          }
        } else {
          setRolloverSummary(null);
        }
      }

      // Load expenses with pagination
      if (initialLoad) {
        await loadExpenses(true, undefined);
      } else {
        // On refresh, reset and load from beginning
        setNextCursor(null);
        await loadExpenses(true, undefined);
      }
    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load expenses with pagination
   */
  const loadExpenses = useCallback(async (initialLoad: boolean = false, cursor?: string | null) => {
    try {
      if (!initialLoad) {
        setLoadingMore(true);
      }

      const cursorToUse = initialLoad ? undefined : (cursor || undefined);

      logger.debug('[CategoryDetailsScreen] Loading expenses:', {
        categoryId,
        initialLoad,
        cursor: cursorToUse,
      });

      const result = await apiService.getExpensesPaginated({
        categoryId,
        limit: 20,
        cursor: cursorToUse,
      });

      logger.debug('[CategoryDetailsScreen] Received expenses:', {
        count: result.expenses.length,
        total: result.pagination.total,
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.nextCursor,
        firstExpenseDate: result.expenses[0]?.date,
        lastExpenseDate: result.expenses[result.expenses.length - 1]?.date,
      });

      if (initialLoad) {
        setExpenses(result.expenses);
      } else {
        setExpenses((prev) => [...prev, ...result.expenses]);
      }

      setHasMore(result.pagination.hasMore);
      setNextCursor(result.pagination.nextCursor);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('[CategoryDetailsScreen] Error loading expenses:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [categoryId]);

  /**
   * Load more expenses (pagination)
   */
  const loadMore = useCallback(() => {
    logger.debug('[CategoryDetailsScreen] loadMore called:', {
      loadingMore,
      hasMore,
      nextCursor,
      canLoad: !loadingMore && hasMore && nextCursor,
    });

    if (!loadingMore && hasMore && nextCursor) {
      loadExpenses(false, nextCursor);
    }
  }, [loadingMore, hasMore, nextCursor, loadExpenses]);

  // Update grouped expenses when expenses change
  useEffect(() => {
    const grouped = groupExpensesByMonthAndDate(expenses);
    setGroupedExpenses(grouped);
  }, [expenses]);

  const handleEditBudget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Store original budget type when sheet opens to detect conversions
    if (category) {
      setOriginalBudgetType(category.budgetType || 'MONTHLY');
      setBudgetType(category.budgetType || 'MONTHLY');
    }
    bottomSheetRef.current?.expand();
  };

  /**
   * Handle budget type change with confirmation dialog
   * Shows warning when converting between MONTHLY and ROLLOVER types
   */
  const handleBudgetTypeChange = (newType: BudgetType) => {
    if (!category) return;
    
    const currentOriginalType = category.budgetType || 'MONTHLY';
    
    // If changing to a different type, show confirmation
    if (newType !== currentOriginalType) {
      if (newType === 'ROLLOVER') {
        // Converting from MONTHLY to ROLLOVER
        showInfo(
          'Enable Savings Goal',
          'This will convert your category to a savings goal. Unspent budget will accumulate over time, helping you save for larger purchases.\n\nWould you like to proceed?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable Savings', 
              onPress: () => {
                setBudgetType('ROLLOVER');
                setApplyToCurrentMonth(true); // Default to applying to current month for new rollover
              }
            },
          ]
        );
      } else {
        // Converting from ROLLOVER to MONTHLY
        showWarning(
          'Switch to Monthly Budget',
          'This will convert your savings goal back to a regular monthly budget that resets each month.\n\nNote: Your accumulated savings history will be preserved for reference, but the category will no longer track rollover amounts.\n\nWould you like to proceed?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Switch to Monthly', 
              style: 'destructive',
              onPress: () => setBudgetType('MONTHLY')
            },
          ]
        );
      }
    } else {
      // Same as original type, just set it
      setBudgetType(newType);
    }
  };

  const handleSaveBudget = async () => {
    if (!category) return;

    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      showError('Invalid Budget', 'Please enter a valid budget amount');
      return;
    }

    setSavingBudget(true);
    try {
      // Determine which currency the amount is in
      const amountCurrency = selectedBudgetCurrency || currencyCode;

      // Convert amount from the selected currency to USD for storage
      // If currency is USD, no conversion needed
      const budgetInUSD = amountCurrency.toUpperCase() === 'USD'
        ? budgetValue
        : convertToUSD(budgetValue);

      // Update category budget via API - include originalAmount, originalCurrency, budgetType
      await apiService.updateCategory(category.id, {
        budgetLimit: budgetInUSD,
        budgetType,
        originalAmount: budgetValue,
        originalCurrency: amountCurrency,
        applyToCurrentMonth: budgetType === 'ROLLOVER' ? applyToCurrentMonth : undefined,
      });

      // Reload category data to reflect changes
      const categoriesData = await apiService.getCategories();
      const cat = categoriesData.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        setBudgetType(cat.budgetType || 'MONTHLY');
        // Use originalAmount if available (preserves user's original input)
        if (cat.originalAmount !== undefined && cat.originalAmount !== null) {
          setNewBudget(cat.originalAmount > 0 ? cat.originalAmount.toString() : '');
          setSelectedBudgetCurrency(cat.originalCurrency || undefined);
        } else {
          const budgetInDisplayCurrency = cat.budgetLimit ? convertFromUSD(cat.budgetLimit) : 0;
          setNewBudget(budgetInDisplayCurrency > 0 ? budgetInDisplayCurrency.toString() : '');
          setSelectedBudgetCurrency(undefined);
        }

        // Reload rollover summary for ROLLOVER type categories
        if (cat.budgetType === 'ROLLOVER') {
          try {
            const summary = await apiService.getRolloverSummary(categoryId);
            setRolloverSummary(summary);
          } catch (rolloverError) {
            logger.warn('[CategoryDetailsScreen] Failed to reload rollover summary:', rolloverError);
          }
        } else {
          setRolloverSummary(null);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setApplyToCurrentMonth(false); // Reset after save

      bottomSheetRef.current?.close();
      showSuccess('Success', 'Budget updated successfully!');
    } catch (error) {
      showError('Error', 'Failed to update budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleExpenseTap = (expense: Expense) => {
    // Convert Expense to UnifiedTransaction format
    const transaction: UnifiedTransaction = {
      id: expense.id,
      type: 'expense',
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt || expense.createdAt,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      tags: expense.tags,
      notes: expense.notes,
    };
    navigation.navigate('TransactionDetails', { transaction });
  };

  if (loading || !category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const categoryColor = category.color || theme.primary;
  const budgetPercentage = category.budgetLimit ? ((category.totalSpent || 0) / category.budgetLimit) * 100 : 0;
  const remaining = category.budgetLimit ? category.budgetLimit - (category.totalSpent || 0) : 0;

  // Calculate current month transaction count
  const currentMonthCount = expenses.filter(expense => isCurrentMonth(expense.date)).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Category Details</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditBudget}
        >
          <Icon name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={groupedExpenses}
        renderItem={({ item: monthGroup }) => (
          <View>
            {/* Month Header */}
            <View style={[styles.monthHeader, { backgroundColor: theme.background }]}>
              {monthGroup.isCurrentMonth ? (
                <Text style={[styles.monthHeaderText, { color: theme.text }]}>
                  {monthGroup.monthLabel.replace(' (This month)', '')}
                  <Text style={{ color: theme.textSecondary, fontWeight: '400' }}>
                    {' (This month)'}
                  </Text>
                </Text>
              ) : (
                  <Text style={[styles.monthHeaderText, { color: theme.text }]}>
                    {monthGroup.monthLabel}
                  </Text>
              )}
            </View>

            {/* Date groups within this month */}
            {monthGroup.dateGroups.map((dateGroup) => (
              <View key={dateGroup.date}>
                {/* Date Header */}
                <View style={[styles.dateHeader, { backgroundColor: theme.background }]}>
                  <Text style={[styles.dateHeaderText, { color: theme.textSecondary }]}>
                    {dateGroup.dateLabel}
                  </Text>
                  <View style={[styles.dateHeaderLine, { backgroundColor: theme.border }]} />
                </View>

                {/* Expenses for this date */}
                {dateGroup.expenses.map((expense) => (
                  <TransactionCard
                    key={expense.id}
                    expense={expense}
                    onPress={() => handleExpenseTap(expense)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item, index) => `${item.monthLabel}-${index}`}
        ListHeaderComponent={
          <View>
            {/* Category Card */}
            <Animated.View
              style={[
                styles.categoryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.md,
                { opacity: fadeAnim },
              ]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
                <Icon name={category.icon as any} size={48} color={categoryColor} />
              </View>

              <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>

              <Text style={[styles.totalSpent, { color: categoryColor }]}>
                {formatCurrency(category.totalSpent || 0)}
              </Text>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Transactions</Text>

              {/* Transaction Counts */}
              <View style={styles.transactionCounts}>
                <View style={styles.transactionCountItem}>
                  <Text style={[styles.transactionCountValue, { color: theme.text }]}>
                    {currentMonthCount.toLocaleString('en-US')}
                  </Text>
                  <Text style={[styles.transactionCountLabel, { color: theme.textSecondary }]}>
                    This Month
                  </Text>
                </View>
                <View style={[styles.transactionCountDivider, { backgroundColor: theme.border }]} />
                <View style={styles.transactionCountItem}>
                  <Text style={[styles.transactionCountValue, { color: theme.text }]}>
                    {total.toLocaleString('en-US')}
                  </Text>
                  <Text style={[styles.transactionCountLabel, { color: theme.textSecondary }]}>
                    Total
                  </Text>
                </View>
              </View>

              {/* Budget Section - Different display for ROLLOVER vs MONTHLY */}
              {category.budgetLimit && (
                <View style={styles.budgetSection}>
                  {category.budgetType === 'ROLLOVER' && category.rollover ? (
                    // Rollover (Sinking Fund) Budget Display
                    <>
                      <View style={[styles.rolloverBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Icon name="piggy-bank" size={14} color={theme.primary} />
                        <Text style={[styles.rolloverBadgeText, { color: theme.primary }]}>
                          Savings Goal
                        </Text>
                      </View>

                      <View style={styles.budgetInfo}>
                        <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>
                          Monthly Contribution
                        </Text>
                        <Text style={[styles.budgetValue, { color: theme.text }]}>
                          {formatTransactionAmount(category.budgetLimit, category.originalAmount, category.originalCurrency)}
                        </Text>
                      </View>

                      {category.rollover.accumulatedBudget >= 0 ? (
                        <View style={[styles.rolloverAccumulatedCard, { backgroundColor: theme.income + '15', borderColor: theme.income + '30' }]}>
                          <Text style={[styles.rolloverAccumulatedLabel, { color: theme.textSecondary }]}>
                            Available to Spend
                          </Text>
                          <Text style={[styles.rolloverAccumulatedAmount, { color: theme.income }]}>
                            {formatCurrency(category.rollover.accumulatedBudget)}
                          </Text>
                          <Text style={[styles.rolloverAccumulatedHint, { color: theme.textTertiary }]}>
                            {category.rollover.monthsAccumulating} month{category.rollover.monthsAccumulating !== 1 ? 's' : ''} saved
                            {category.rollover.carriedOver > 0 && ` • ${formatCurrency(category.rollover.carriedOver)} carried over`}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.rolloverAccumulatedCard, { backgroundColor: theme.expense + '15', borderColor: theme.expense + '30' }]}>
                          <Text style={[styles.rolloverAccumulatedLabel, { color: theme.textSecondary }]}>
                            Overspent
                          </Text>
                          <Text style={[styles.rolloverAccumulatedAmount, { color: theme.expense }]}>
                            {formatCurrency(Math.abs(category.rollover.accumulatedBudget))}
                          </Text>
                          <Text style={[styles.rolloverAccumulatedHint, { color: theme.textTertiary }]}>
                            You've exceeded your budget this month
                          </Text>
                        </View>
                      )}

                      {/* Progress Bar for Rollover - shows spending against accumulated */}
                      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            {
                              backgroundColor: category.rollover.percentUsed > 80 ? theme.expense : categoryColor,
                              width: `${Math.min(category.rollover.percentUsed, 100)}%`,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.budgetStats}>
                        <Text style={[styles.budgetStat, { color: theme.textSecondary }]}>
                          {category.rollover.percentUsed.toFixed(1)}% used this month
                        </Text>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowBudgetHistory(true);
                            historySheetRef.current?.expand();
                          }}
                          style={styles.historyButton}
                        >
                          <Icon name="history" size={14} color={theme.primary} />
                          <Text style={[styles.historyButtonText, { color: theme.primary }]}>History</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    // Monthly Budget Display (Original)
                    <>
                      <View style={styles.budgetInfo}>
                        <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>
                          Monthly Budget
                        </Text>
                        <Text style={[styles.budgetValue, { color: theme.text }]}>
                          {formatTransactionAmount(category.budgetLimit, category.originalAmount, category.originalCurrency)}
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            {
                              backgroundColor: budgetPercentage > 80 ? theme.expense : categoryColor,
                              width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }),
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.budgetStats}>
                        <Text style={[styles.budgetStat, { color: theme.textSecondary }]}>
                          {budgetPercentage.toFixed(1)}% used
                        </Text>
                        <Text
                          style={[
                            styles.budgetStat,
                            { color: remaining >= 0 ? theme.income : theme.expense },
                          ]}
                        >
                          {formatCurrency(Math.abs(remaining))} {remaining >= 0 ? 'remaining' : 'over'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-text-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No transactions in this category yet
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} tintColor={theme.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={7}
        initialNumToRender={10}
      />

      {/* Budget Edit Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['65%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Budget</Text>

          {/* Budget Type Toggle */}
          <View style={styles.budgetInputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Budget Type
            </Text>
            <View style={styles.budgetTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.budgetTypeToggleOption,
                  { 
                    backgroundColor: budgetType === 'MONTHLY' ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleBudgetTypeChange('MONTHLY')}
              >
                <Icon name="calendar-month" size={16} color={budgetType === 'MONTHLY' ? '#FFFFFF' : theme.text} />
                <Text style={[styles.budgetTypeToggleText, { color: budgetType === 'MONTHLY' ? '#FFFFFF' : theme.text }]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.budgetTypeToggleOption,
                  { 
                    backgroundColor: budgetType === 'ROLLOVER' ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleBudgetTypeChange('ROLLOVER')}
              >
                <Icon name="piggy-bank" size={16} color={budgetType === 'ROLLOVER' ? '#FFFFFF' : theme.text} />
                <Text style={[styles.budgetTypeToggleText, { color: budgetType === 'ROLLOVER' ? '#FFFFFF' : theme.text }]}>
                  Savings
                </Text>
              </TouchableOpacity>
            </View>
            {budgetType === 'ROLLOVER' && (
              <Text style={[styles.budgetTypeHint, { color: theme.textTertiary }]}>
                💡 Unspent budget accumulates over time
              </Text>
            )}
          </View>

          <View style={styles.budgetInputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {budgetType === 'ROLLOVER' ? 'Monthly Contribution' : 'Monthly Budget Limit'}
            </Text>
            <View style={[styles.budgetInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <CurrencyInput
                value={newBudget}
                onChangeText={setNewBudget}
                onCurrencyChange={(code: string) => setSelectedBudgetCurrency(code)}
                selectedCurrency={selectedBudgetCurrency}
                allowCurrencySelection={true}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                showSymbol={true}
                allowDecimals={true}
                inputStyle={styles.currencyInputField}
                TextInputComponent={BottomSheetTextInput}
              />
            </View>
          </View>

          {/* Apply to Current Month Toggle (show for ROLLOVER or when converting to ROLLOVER) */}
          {budgetType === 'ROLLOVER' && (
            <TouchableOpacity
              style={[styles.applyCurrentMonthToggle, { borderColor: theme.border }]}
              onPress={() => setApplyToCurrentMonth(!applyToCurrentMonth)}
            >
              <View style={styles.applyCurrentMonthContent}>
                <Icon 
                  name={applyToCurrentMonth ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                  size={22} 
                  color={applyToCurrentMonth ? theme.primary : theme.textSecondary} 
                />
                <View style={styles.applyCurrentMonthTextContainer}>
                  <Text style={[styles.applyCurrentMonthText, { color: theme.text }]}>
                    {originalBudgetType === 'MONTHLY' ? 'Start with this month' : 'Apply to current month'}
                  </Text>
                  <Text style={[styles.applyCurrentMonthHint, { color: theme.textTertiary }]}>
                    {originalBudgetType === 'MONTHLY' 
                      ? 'Include this month\'s contribution in your savings goal'
                      : 'Update this month\'s allocation (future months always use new amount)'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, elevation.sm]}
            onPress={handleSaveBudget}
            disabled={savingBudget}
          >
            {savingBudget ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Budget</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Budget History Bottom Sheet (for ROLLOVER categories) */}
      <BottomSheet
        ref={historySheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        onClose={() => setShowBudgetHistory(false)}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Budget History</Text>
          
          {/* Summary Header */}
          {rolloverSummary && (
            <View style={[styles.historyHeader, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
              <View style={styles.historyHeaderRow}>
                <View style={styles.historyHeaderStat}>
                  <Text style={[styles.historyHeaderValue, { color: theme.primary }]}>
                    {formatCurrency(rolloverSummary.totalAccumulated || 0)}
                  </Text>
                  <Text style={[styles.historyHeaderLabel, { color: theme.textSecondary }]}>
                    Total Saved
                  </Text>
                </View>
                <View style={[styles.historyHeaderDivider, { backgroundColor: theme.primary + '30' }]} />
                <View style={styles.historyHeaderStat}>
                  <Text style={[styles.historyHeaderValue, { color: theme.text }]}>
                    {rolloverSummary.history?.length || 0}
                  </Text>
                  <Text style={[styles.historyHeaderLabel, { color: theme.textSecondary }]}>
                    Changes
                  </Text>
                </View>
              </View>
            </View>
          )}

          {rolloverSummary?.history && rolloverSummary.history.length > 0 ? (
            <View style={styles.historyTimeline}>
              {rolloverSummary.history.map((entry, index) => {
                const isIncrease = entry.previousAmount !== null && entry.newAmount > entry.previousAmount;
                const isDecrease = entry.previousAmount !== null && entry.newAmount < entry.previousAmount;
                const changePercent = entry.previousAmount ? Math.round(((entry.newAmount - entry.previousAmount) / entry.previousAmount) * 100) : null;

                return (
                  <View key={entry.id} style={styles.historyTimelineItem}>
                    {/* Timeline connector */}
                    {index < rolloverSummary.history.length - 1 && (
                      <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
                    )}

                    {/* Timeline dot */}
                    <View style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isIncrease ? theme.income : isDecrease ? theme.expense : theme.primary,
                        borderColor: theme.background,
                      }
                    ]}>
                      <Icon
                        name={isIncrease ? 'arrow-up' : isDecrease ? 'arrow-down' : 'circle-small'}
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>

                    {/* Entry Card */}
                    <View style={[styles.historyEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={styles.historyEntryHeader}>
                        <Text style={[styles.historyEntryDate, { color: theme.text }]}>
                          {new Date(entry.effectiveFrom).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                        {entry.appliedToCurrentMonth && (
                          <View style={[styles.historyEntryBadge, { backgroundColor: theme.primary + '20' }]}>
                            <Icon name="check-circle" size={10} color={theme.primary} />
                            <Text style={[styles.historyEntryBadgeText, { color: theme.primary }]}>
                              Applied
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.historyEntryAmounts}>
                        {entry.previousAmount !== null && (
                          <>
                            <Text style={[styles.historyEntryPrevious, { color: theme.textTertiary }]}>
                              {formatCurrency(entry.previousAmount)}
                            </Text>
                            <Icon name="arrow-right" size={16} color={theme.textTertiary} />
                          </>
                        )}
                        <Text style={[styles.historyEntryNew, { color: isIncrease ? theme.income : isDecrease ? theme.expense : theme.text }]}>
                          {formatCurrency(entry.newAmount)}
                        </Text>
                        {changePercent !== null && (
                          <Text style={[
                            styles.historyEntryChange,
                            { color: isIncrease ? theme.income : theme.expense }
                          ]}>
                            {isIncrease ? '+' : ''}{changePercent}%
                          </Text>
                        )}
                      </View>

                      {entry.note && (
                        <Text style={[styles.historyEntryNote, { color: theme.textTertiary }]}>
                          {entry.note}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
                <View style={[styles.emptyHistoryIcon, { backgroundColor: theme.textTertiary + '20' }]}>
                  <Icon name="history" size={32} color={theme.textTertiary} />
                </View>
                <Text style={[styles.emptyHistoryTitle, { color: theme.text }]}>
                  No changes yet
                </Text>
              <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
                  Your budget change history will appear here
              </Text>
            </View>
          )}

          {/* Monthly Breakdown */}
          {rolloverSummary?.monthlyBreakdown && rolloverSummary.monthlyBreakdown.length > 0 && (
            <>
              <Text style={[styles.sheetSubtitle, { color: theme.text }]}>Monthly Breakdown</Text>
              {rolloverSummary.monthlyBreakdown.slice(0, 6).map((month, index) => {
                const savingsRate = month.allocatedAmount > 0
                  ? Math.round(((month.allocatedAmount - month.spentAmount) / month.allocatedAmount) * 100)
                  : 0;

                return (
                  <View
                    key={month.id}
                    style={[
                      styles.monthlyBreakdownCard,
                      { backgroundColor: theme.card, borderColor: theme.border }
                    ]}
                  >
                    <View style={styles.monthlyBreakdownHeader}>
                      <Text style={[styles.monthlyBreakdownMonth, { color: theme.text }]}>
                        {new Date(month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </Text>
                      <View style={[
                        styles.savingsRateBadge,
                        { backgroundColor: savingsRate >= 50 ? theme.income + '20' : theme.warning + '20' }
                      ]}>
                        <Text style={[
                          styles.savingsRateText,
                          { color: savingsRate >= 50 ? theme.income : theme.warning }
                        ]}>
                          {savingsRate}% saved
                        </Text>
                      </View>
                    </View>

                    <View style={styles.monthlyBreakdownStats}>
                      <View style={styles.monthlyStatItem}>
                        <Icon name="plus-circle-outline" size={14} color={theme.income} />
                        <Text style={[styles.monthlyStatValue, { color: theme.income }]}>
                          {formatCurrency(month.allocatedAmount)}
                        </Text>
                      </View>
                      <View style={styles.monthlyStatItem}>
                        <Icon name="minus-circle-outline" size={14} color={theme.expense} />
                        <Text style={[styles.monthlyStatValue, { color: theme.expense }]}>
                          {formatCurrency(month.spentAmount)}
                        </Text>
                      </View>
                      <View style={styles.monthlyStatItem}>
                        <Icon name="wallet-outline" size={14} color={theme.primary} />
                        <Text style={[styles.monthlyStatValue, { color: theme.primary, fontWeight: '600' }]}>
                          {formatCurrency(month.totalAvailable)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  categoryName: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  totalSpent: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  transactionCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  transactionCountItem: {
    flex: 1,
    alignItems: 'center',
  },
  transactionCountValue: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transactionCountLabel: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  transactionCountDivider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.lg,
  },
  budgetSection: {
    width: '100%',
    marginTop: spacing.md,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    ...typography.labelMedium,
  },
  budgetValue: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetStat: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  monthHeader: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg
  },
  monthHeaderText: {
    ...typography.titleMedium,
    fontWeight: '700',
    textAlign: 'center',
  },
  dateHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  dateHeaderText: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dateHeaderLine: {
    height: 1,
    width: '100%',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  budgetInputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencyInputField: {
    paddingVertical: spacing.md,
  },
  saveButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Rollover-specific styles
  rolloverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  rolloverBadgeText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  rolloverAccumulatedCard: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rolloverAccumulatedLabel: {
    ...typography.labelSmall,
    marginBottom: spacing.xs,
  },
  rolloverAccumulatedAmount: {
    ...typography.displaySmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  rolloverAccumulatedHint: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyButtonText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  // Budget type toggle styles
  budgetTypeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  budgetTypeToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  budgetTypeToggleText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  budgetTypeHint: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  // Apply to current month toggle
  applyCurrentMonthToggle: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  applyCurrentMonthContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  applyCurrentMonthTextContainer: {
    flex: 1,
  },
  applyCurrentMonthText: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  applyCurrentMonthHint: {
    ...typography.bodySmall,
  },
  // History bottom sheet styles
  sheetSubtitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  // Budget History Header
  historyHeader: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  historyHeaderStat: {
    alignItems: 'center',
  },
  historyHeaderValue: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  historyHeaderLabel: {
    ...typography.labelSmall,
    marginTop: 2,
  },
  historyHeaderDivider: {
    width: 1,
    height: 32,
  },
  // Timeline styles
  historyTimeline: {
    position: 'relative',
  },
  historyTimelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -12,
    width: 2,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: spacing.md,
  },
  historyEntryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  historyEntry: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  historyEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyEntryDate: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  historyEntryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  historyEntryBadgeText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
  historyEntryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  historyEntryPrevious: {
    ...typography.bodyMedium,
    textDecorationLine: 'line-through',
  },
  historyEntryNew: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  historyEntryChange: {
    ...typography.labelSmall,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  historyEntryNote: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyHistoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyHistoryTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyHistoryText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  // Monthly Breakdown
  monthlyBreakdownCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  monthlyBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthlyBreakdownMonth: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  savingsRateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  savingsRateText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  monthlyBreakdownStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthlyStatValue: {
    ...typography.bodySmall,
  },
  monthlyBreakdownItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  monthlyBreakdownDetails: {
    gap: spacing.xs,
  },
  monthlyBreakdownText: {
    ...typography.bodySmall,
  },
});

export default CategoryDetailsScreen;

