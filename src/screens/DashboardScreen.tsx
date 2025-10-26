/**
 * DashboardScreen - Premium Home Dashboard
 * Purpose: Beautiful home screen inspired by Apple Wallet, Revolut, and Qapital
 * Features: Balance card, spending chart, transactions, bottom sheet for adding expenses
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTheme } from '../contexts/ThemeContext';
import { ExpenseCard } from '../components';
import { apiService } from '../services/api';
import { Expense, MonthlyStats, CategoryType } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

/**
 * DashboardScreen - Main home screen
 */
const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet state
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<CategoryType>('food');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUsingAI, setIsUsingAI] = useState(false);

  // Animation values
  const gradientAnimation = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    loadData();
    // Start gradient animation
    gradientAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const [expensesData, statsData] = await Promise.all([
        apiService.getExpenses(),
        apiService.getMonthlyStats(),
      ]);
      setExpenses(expensesData.slice(0, 5));
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
    fabScale.value = withSpring(0);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    fabScale.value = withSpring(1);
    // Reset form
    setNewExpenseAmount('');
    setNewExpenseCategory('food');
    setNewExpenseDescription('');
    setIsUsingAI(false);
  }, []);

  const handleAddExpense = async (): Promise<void> => {
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!newExpenseDescription.trim()) {
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    setIsAddingExpense(true);

    try {
      await apiService.createExpense({
        amount: parseFloat(newExpenseAmount),
        category: newExpenseCategory,
        description: newExpenseDescription.trim(),
        date: new Date().toISOString(),
        type: 'expense',
      });

      await loadData();
      handleCloseBottomSheet();
      Alert.alert('Success', 'Expense added successfully! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
      console.error(error);
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleAIExpense = async (): Promise<void> => {
    setIsUsingAI(true);

    try {
      const aiExpense = await apiService.mockAIExpense();
      await loadData();
      handleCloseBottomSheet();
      Alert.alert(
        'AI Expense Added! 🤖',
        `Added ${aiExpense.description} for $${aiExpense.amount.toFixed(2)}`
      );
    } catch (error) {
      Alert.alert('Error', 'AI expense generation failed');
      console.error(error);
    } finally {
      setIsUsingAI(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!stats) return [];

    return [
      {
        name: 'Food',
        amount: 485.50,
        color: theme.categories.food,
        legendFontColor: theme.textSecondary,
      },
      {
        name: 'Transport',
        amount: 120.00,
        color: theme.categories.transport,
        legendFontColor: theme.textSecondary,
      },
      {
        name: 'Shopping',
        amount: 289.99,
        color: theme.categories.shopping,
        legendFontColor: theme.textSecondary,
      },
      {
        name: 'Entertainment',
        amount: 95.75,
        color: theme.categories.entertainment,
        legendFontColor: theme.textSecondary,
      },
      {
        name: 'Other',
        amount: 50.00,
        color: theme.categories.other,
        legendFontColor: theme.textSecondary,
      },
    ];
  }, [stats, theme]);

  // Animated gradient style
  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.9 + gradientAnimation.value * 0.1,
    };
  });

  // Animated FAB style
  const animatedFabStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fabScale.value }],
    };
  });

  const categories: Array<{ id: CategoryType; name: string; icon: string }> = [
    { id: 'food', name: 'Food', icon: 'food' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping' },
    { id: 'entertainment', name: 'Entertainment', icon: 'movie' },
    { id: 'health', name: 'Health', icon: 'heart-pulse' },
    { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Premium Balance Card */}
          {stats && (
            <View style={styles.balanceCardContainer}>
              <Animated.View style={[styles.balanceCard, animatedGradientStyle]}>
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark, theme.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientCard}
                >
                  <View style={styles.balanceHeader}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Icon name="wallet" size={24} color="rgba(255, 255, 255, 0.9)" />
                  </View>

                  <Text style={styles.balanceAmount}>
                    ${stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>

                  <View style={styles.balanceSummary}>
                    <View style={styles.summaryItem}>
                      <View style={styles.summaryIcon}>
                        <Icon name="arrow-down" size={16} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.summaryLabel}>Income</Text>
                        <Text style={styles.summaryValue}>${stats.totalIncome.toFixed(2)}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                      <View style={styles.summaryIcon}>
                        <Icon name="arrow-up" size={16} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.summaryLabel}>Expenses</Text>
                        <Text style={styles.summaryValue}>${stats.totalExpenses.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          )}

          {/* Spending Breakdown Chart */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending Breakdown</Text>

            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
              <PieChart
                data={chartData}
                width={width - 48}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="receipt-text-outline" size={64} color={theme.textTertiary} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No transactions yet
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <Animated.View style={[styles.fabContainer, animatedFabStyle]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }, elevation.lg]}
            onPress={handleOpenBottomSheet}
            activeOpacity={0.9}
          >
            <Icon name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Sheet for Adding Expenses */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['85%']}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: theme.card }}
          handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
          onClose={() => {
            fabScale.value = withSpring(1);
          }}
        >
          <BottomSheetScrollView style={styles.bottomSheetContent}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Expense</Text>

            {/* AI Quick Add Button */}
            <TouchableOpacity
              style={[styles.aiButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
              onPress={handleAIExpense}
              disabled={isUsingAI}
            >
              {isUsingAI ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <Icon name="robot" size={24} color={theme.primary} />
                  <Text style={[styles.aiButtonText, { color: theme.primary }]}>
                    ✨ AI Quick Add
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or add manually</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
              <View style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.currencySymbol, { color: theme.text }]}>$</Text>
                <TextInput
                  style={[styles.amountField, { color: theme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="decimal-pad"
                  value={newExpenseAmount}
                  onChangeText={setNewExpenseAmount}
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = newExpenseCategory === cat.id;
                  const categoryColor = theme.categories[cat.id as keyof typeof theme.categories];

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor: isSelected ? categoryColor + '20' : theme.background,
                          borderColor: isSelected ? categoryColor : theme.border,
                        },
                      ]}
                      onPress={() => setNewExpenseCategory(cat.id)}
                    >
                      <Icon name={cat.icon as any} size={24} color={isSelected ? categoryColor : theme.textSecondary} />
                      <Text style={[styles.categoryLabel, { color: isSelected ? categoryColor : theme.textSecondary }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.descriptionInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="What did you spend on?"
                placeholderTextColor={theme.textTertiary}
                value={newExpenseDescription}
                onChangeText={setNewExpenseDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleAddExpense}
              disabled={isAddingExpense}
            >
              {isAddingExpense ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Expense</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </BottomSheetScrollView>
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  balanceCardContainer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradientCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceLabel: {
    ...typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    ...typography.displayMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  balanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryValue: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleLarge,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  seeAll: {
    ...typography.labelMedium,
  },
  chartCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.bodyLarge,
    marginTop: spacing.md,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    padding: spacing.lg,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    marginBottom: spacing.lg,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  aiButtonText: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.headlineMedium,
    fontWeight: '600',
  },
  amountField: {
    ...typography.headlineMedium,
    fontWeight: '600',
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...typography.labelSmall,
    marginTop: spacing.xs,
  },
  descriptionInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 100,
  },
  addButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default DashboardScreen;
