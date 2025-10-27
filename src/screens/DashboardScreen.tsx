/**
 * DashboardScreen - Premium Home Dashboard
 * Purpose: Beautiful home screen with balance, chart, transactions, and AI insights
 * Features: Real-time updates, edit/delete transactions, smart insights
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
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { ExpenseCard, ExpenseOptionsSheet, SkeletonCard, ConfettiCelebration, BottomSheetBackground } from '../components';
import { apiService } from '../services/api';
import { Expense, MonthlyStats, CategoryType, Insight } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

/**
 * DashboardScreen - Main home screen
 */
const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const optionsSheetRef = useRef<BottomSheet>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Bottom sheet state for adding expenses
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<CategoryType>('food');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUsingAI, setIsUsingAI] = useState(false);

  // Animation values
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const insightOpacity = useRef(new Animated.Value(0)).current;

  // Initialize app data on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    // Start gradient animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in insights
    Animated.timing(insightOpacity, {
      toValue: 1,
      duration: 800,
      delay: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const initializeApp = async (): Promise<void> => {
    try {
      await apiService.initialize();
      await loadData();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const loadData = async (): Promise<void> => {
    try {
      const [expensesData, statsData, insightsData] = await Promise.all([
        apiService.getExpenses(),
        apiService.getMonthlyStats(),
        apiService.getInsights(),
      ]);
      setExpenses(expensesData.slice(0, 5));
      setStats(statsData);
      setInsights(insightsData);

      // Trigger confetti for achievements
      const hasAchievement = insightsData.some(insight => insight.type === 'achievement');
      if (hasAchievement && !loading) {
        setTimeout(() => setShowConfetti(true), 500);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0); // Open at 85%
    Animated.spring(fabScale, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
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

      await loadData(); // Refresh all data
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
      await loadData(); // Refresh all data
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

  const handleExpenseLongPress = (expense: Expense) => {
    setSelectedExpense(expense);
    optionsSheetRef.current?.expand();
  };

  const handleEditExpense = (expense: Expense) => {
    navigation.navigate('AddExpense', { expense });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      await apiService.deleteExpense(expense.id);
      await loadData(); // Refresh all data
      Alert.alert('Deleted', 'Transaction deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete transaction');
      console.error(error);
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
              <Animated.View style={[styles.balanceCard, {
                opacity: gradientAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }]}>
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

          {/* Smart Insight Section */}
          {insights.length > 0 && (
            <Animated.View style={[styles.smartInsightContainer, { opacity: insightOpacity }]}>
              <Text style={[styles.smartInsightTitle, { color: theme.text }]}>💡 Smart Insight</Text>
              <TouchableOpacity
                style={[
                  styles.smartInsightCard,
                  { backgroundColor: theme.card, borderColor: insights[0].color + '40' },
                  elevation.sm,
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.insightIconContainer, { backgroundColor: insights[0].color + '15' }]}>
                  <Icon name={insights[0].icon as any} size={24} color={insights[0].color} />
                </View>
                <View style={styles.smartInsightContent}>
                  <Text style={[styles.smartInsightCardTitle, { color: theme.text }]}>
                    {insights[0].title}
                  </Text>
                  <Text style={[styles.smartInsightCardDescription, { color: theme.textSecondary }]}>
                    {insights[0].description}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
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

            {loading ? (
              // Show skeleton loaders while loading
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : expenses.length > 0 ? (
              expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onLongPress={() => handleExpenseLongPress(expense)}
                />
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
        <Animated.View
          style={[
            styles.fabContainer,
            {
              bottom: 60 + Math.max(insets.bottom, 8) + 16,
              transform: [{ scale: fabScale }]
            }
          ]}
        >
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
          backgroundComponent={BottomSheetBackground}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
          onClose={() => {
            Animated.spring(fabScale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          }}
        >
          <BottomSheetScrollView
            style={styles.bottomSheetContent}
            contentContainerStyle={styles.bottomSheetContentContainer}
          >
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Expense</Text>

            {/* Quick Add Options */}
            <View style={styles.quickAddButtons}>
              <TouchableOpacity
                style={[styles.aiButton, { backgroundColor: theme.primary }]}
                onPress={handleAIExpense}
                disabled={isUsingAI}
              >
                {isUsingAI ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="robot" size={22} color="#FFFFFF" />
                    <Text style={styles.aiButtonText}>
                      ✨ AI Quick Add
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: theme.income }]}
                onPress={() => {
                  bottomSheetRef.current?.close();
                  setTimeout(() => navigation.navigate('ReceiptUpload'), 300);
                }}
              >
                <Icon name="camera-outline" size={22} color="#FFFFFF" />
                <Text style={styles.scanButtonText}>
                  📸 Scan Receipt
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
              <Text style={styles.dividerText}>OR ADD MANUALLY</Text>
              <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
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
          </BottomSheetScrollView>
        </BottomSheet>

        {/* Expense Options Sheet */}
        {selectedExpense && (
          <ExpenseOptionsSheet
            expense={selectedExpense}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            onClose={() => setSelectedExpense(null)}
          />
        )}

        {/* Confetti Celebration */}
        <ConfettiCelebration
          active={showConfetti}
          onAnimationEnd={() => setShowConfetti(false)}
        />
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
  smartInsightContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  smartInsightTitle: {
    ...typography.titleMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  smartInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  smartInsightContent: {
    flex: 1,
  },
  smartInsightCardTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  smartInsightCardDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
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
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  aiButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: spacing.md,
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
    marginHorizontal: -spacing.xs / 2,
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    margin: spacing.xs / 2,
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
  quickAddButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  scanButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DashboardScreen;
