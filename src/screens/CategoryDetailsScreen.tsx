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
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';
import { getDateKey, formatDateLabel, isCurrentMonth, getMonthLabel } from '../utils/dateFormatter';
import { TransactionCard, BottomSheetBackground, CurrencyInput } from '../components';
import { Expense, Category, UnifiedTransaction } from '../types';
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

  const bottomSheetRef = useRef<BottomSheet>(null);

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
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    bottomSheetRef.current?.expand();
  };

  const handleSaveBudget = async () => {
    if (!category) return;

    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount');
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

      // Update category budget via API - include originalAmount and originalCurrency
      await apiService.updateCategory(category.id, {
        budgetLimit: budgetInUSD,
        originalAmount: budgetValue,
        originalCurrency: amountCurrency,
      });

      // Reload category data to reflect changes
      const categoriesData = await apiService.getCategories();
      const cat = categoriesData.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        // Use originalAmount if available (preserves user's original input)
        if (cat.originalAmount !== undefined && cat.originalAmount !== null) {
          setNewBudget(cat.originalAmount > 0 ? cat.originalAmount.toString() : '');
          setSelectedBudgetCurrency(cat.originalCurrency || undefined);
        } else {
          const budgetInDisplayCurrency = cat.budgetLimit ? convertFromUSD(cat.budgetLimit) : 0;
          setNewBudget(budgetInDisplayCurrency > 0 ? budgetInDisplayCurrency.toString() : '');
          setSelectedBudgetCurrency(undefined);
        }
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      bottomSheetRef.current?.close();
      Alert.alert('Success', 'Budget updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget');
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

              {/* Progress Ring/Bar */}
              {category.budgetLimit && (
                <View style={styles.budgetSection}>
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
        snapPoints={['35%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Budget</Text>

          <View style={styles.budgetInputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Monthly Budget Limit
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
              />
            </View>
          </View>

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
});

export default CategoryDetailsScreen;

