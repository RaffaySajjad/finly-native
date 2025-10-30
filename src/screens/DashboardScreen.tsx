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
  Platform,
  Modal,
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
import { useCurrency } from '../contexts/CurrencyContext';
import { ExpenseCard, ExpenseOptionsSheet, SkeletonCard, ConfettiCelebration, BottomSheetBackground, PremiumBadge, UpgradePrompt } from '../components';
import { useSubscription } from '../hooks/useSubscription';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { Expense, MonthlyStats, CategoryType, Insight, Category, PaymentMethod, Tag } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

/**
 * DashboardScreen - Main home screen
 */
const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPremium, getRemainingUsage, requiresUpgrade } = useSubscription();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const optionsSheetRef = useRef<BottomSheet>(null);
  const balanceAdjustSheetRef = useRef<BottomSheet>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Balance adjustment state
  const [newBalance, setNewBalance] = useState('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);

  // Bottom sheet state for adding expenses
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<CategoryType>('food');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [newExpenseTags, setNewExpenseTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
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
      const [expensesData, categoriesData, statsData, insightsData, tagsData] = await Promise.all([
        apiService.getExpenses(),
        apiService.getCategories(),
        apiService.getMonthlyStats(),
        apiService.getInsights(),
        tagsService.getTags(),
      ]);
      setExpenses(expensesData.slice(0, 5));
      setCategories(categoriesData);
      setStats(statsData);
      setInsights(insightsData);
      setAvailableTags(tagsData);

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
    setNewExpensePaymentMethod(undefined);
    setNewExpenseTags([]);
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
        paymentMethod: newExpensePaymentMethod || undefined,
        tags: newExpenseTags.length > 0 ? newExpenseTags : undefined,
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
        `Added ${aiExpense.description} for ${formatCurrency(aiExpense.amount)}`
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

  const handleAdjustBalance = async () => {
    if (!newBalance || isNaN(parseFloat(newBalance))) {
      Alert.alert('Invalid Amount', 'Please enter a valid balance');
      return;
    }

    setIsAdjustingBalance(true);
    try {
      const newBalanceValue = parseFloat(newBalance);
      await apiService.adjustBalance(newBalanceValue, 'Manual balance adjustment');
      await loadData(); // Refresh all data
      balanceAdjustSheetRef.current?.close();
      setNewBalance('');
      Alert.alert('Success', 'Balance updated successfully! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to adjust balance');
      console.error(error);
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  const handleOpenBalanceAdjust = () => {
    if (stats) {
      setNewBalance(stats.balance.toString());
      balanceAdjustSheetRef.current?.expand();
    }
  };

  // Chart data - calculated from actual category spending
  const chartData = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Filter categories with spending > 0 and map to chart format
    const data = categories
      .filter(cat => cat.totalSpent > 0)
      .map(cat => ({
        name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
        amount: cat.totalSpent,
        color: theme.categories[cat.id as keyof typeof theme.categories],
        legendFontColor: theme.textSecondary,
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending

    return data;
  }, [categories, theme]);

  const categoriesList: Array<{ id: CategoryType; name: string; icon: string }> = [
    { id: 'food', name: 'Food', icon: 'food' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping' },
    { id: 'entertainment', name: 'Entertainment', icon: 'movie' },
    { id: 'health', name: 'Health', icon: 'heart-pulse' },
    { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  const PAYMENT_METHODS: Array<{ id: PaymentMethod; name: string; icon: string }> = [
    { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
    { id: 'debit_card', name: 'Debit Card', icon: 'card' },
    { id: 'cash', name: 'Cash', icon: 'cash' },
    { id: 'check', name: 'Check', icon: 'receipt' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bank-transfer' },
    { id: 'digital_wallet', name: 'Digital Wallet', icon: 'wallet' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  const handleCreateTag = async (): Promise<void> => {
    if (!newTagName.trim()) {
      Alert.alert('Invalid Tag', 'Please enter a tag name');
      return;
    }

    try {
      const newTag = await tagsService.createTag(newTagName.trim());
      setAvailableTags([...availableTags, newTag]);
      setNewExpenseTags([...newExpenseTags, newTag.id]);
      setNewTagName('');
      setShowCreateTagModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag. Please try again.');
      console.error('Error creating tag:', error);
    }
  };

  const handleToggleTag = (tagId: string): void => {
    if (newExpenseTags.includes(tagId)) {
      setNewExpenseTags(newExpenseTags.filter(id => id !== tagId));
    } else {
      setNewExpenseTags([...newExpenseTags, tagId]);
    }
  };

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
          {/* Premium Status Banner */}
          {!isPremium && (
            <View style={styles.premiumBanner}>
              <View style={[styles.premiumBannerContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.premiumBadgeContainer}>
                  <PremiumBadge size="small" />
                </View>
                <Text style={[styles.premiumBannerText, { color: theme.text }]}>
                  {getRemainingUsage('receiptScanning')} receipt scans remaining this month
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Subscription')}
                  style={styles.upgradeLink}
                >
                  <Text style={[styles.upgradeLinkText, { color: theme.primary }]}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Premium Balance Card */}
          {stats && (
            <View style={styles.balanceCardContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenBalanceAdjust}
                onLongPress={() => navigation.navigate('BalanceHistory')}
              >
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
                      <Icon name="pencil" size={24} color="rgba(255, 255, 255, 0.9)" />
                    </View>

                    <Text style={styles.balanceAmount}>
                      {formatCurrency(stats.balance)}
                    </Text>

                    <View style={styles.balanceSummary}>
                      <View style={styles.summaryItem}>
                        <View style={styles.summaryIcon}>
                          <Icon name="arrow-down" size={16} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text style={styles.summaryLabel}>Income</Text>
                          <Text style={styles.summaryValue}>{formatCurrency(stats.totalIncome)}</Text>
                        </View>
                      </View>

                      <View style={styles.summaryDivider} />

                      <View style={styles.summaryItem}>
                        <View style={styles.summaryIcon}>
                          <Icon name="arrow-up" size={16} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text style={styles.summaryLabel}>Expenses</Text>
                          <Text style={styles.summaryValue}>{formatCurrency(stats.totalExpenses)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.viewHistoryHint}>
                      <Text style={styles.viewHistoryText}>Tap to edit • Long press for history →</Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
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

            {chartData.length > 0 ? (
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
            ) : (
              <View style={[styles.chartCard, styles.emptyChartCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
                <Icon name="chart-pie" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
                  No spending data yet
                </Text>
                <Text style={[styles.emptyChartSubtext, { color: theme.textTertiary }]}>
                  Add expenses to see your spending breakdown
                </Text>
              </View>
            )}
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TransactionsList')}>
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
                  onPress={() => navigation.navigate('TransactionDetails', { expense })}
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
              bottom: Math.max(insets.bottom, 12) + (Platform.select({ ios: 70, android: 10 }) ?? 70),
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Transaction</Text>

            {/* Quick Add Options */}
            <View style={styles.quickAddButtons}>
              <View style={styles.aiButtonContainer}>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (requiresUpgrade('voiceEntry')) {
                      setShowUpgradePrompt(true);
                      return;
                    }
                    navigation.navigate('VoiceTransaction');
                  }}
                  disabled={isUsingAI}
                >
                  {isUsingAI ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                        <Icon name="microphone" size={22} color="#FFFFFF" />
                        <Text style={styles.aiButtonText}>
                        🎤 Voice Entry
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {!isPremium && (
                  <View style={styles.premiumBadgeOverlay}>
                    <View style={[
                      styles.premiumIconBadge,
                      {
                        backgroundColor: theme.warning,
                      }
                    ]}>
                      <Icon name="crown" size={12} color="#1A1A1A" />
                    </View>
                  </View>
                )}
              </View>

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
                {!isPremium && (
                  <View style={styles.scanButtonBadge}>
                    <Text style={styles.scanButtonBadgeText}>
                      {getRemainingUsage('receiptScanning')} left
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Bulk Add Option */}
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                bottomSheetRef.current?.close();
                setTimeout(() => {
                  if (requiresUpgrade('bulkEntry')) {
                    setShowUpgradePrompt(true);
                    return;
                  }
                  navigation.navigate('BulkTransaction');
                }, 300);
              }}
            >
              <Icon name="file-multiple" size={20} color={theme.primary} />
              <Text style={[styles.bulkButtonText, { color: theme.text }]}>
                📋 Bulk Add
              </Text>
              {!isPremium && (
                <View style={styles.bulkBadge}>
                  <View style={[
                    styles.premiumIconBadge,
                    {
                      backgroundColor: theme.warning,
                    }
                  ]}>
                    <Icon name="crown" size={12} color="#1A1A1A" />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
              <Text style={styles.dividerText}>OR ADD MANUALLY</Text>
              <View style={[styles.dividerLine, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
              <View style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.currencySymbol, { color: theme.text }]}>{getCurrencySymbol()}</Text>
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
                {categoriesList.map((cat) => {
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

            {/* Payment Method Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Payment Method (Optional)</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
                onPress={() => setShowPaymentMethodPicker(true)}
              >
                <View style={styles.pickerButtonContent}>
                  {newExpensePaymentMethod ? (
                    <>
                      <Icon
                        name={PAYMENT_METHODS.find(pm => pm.id === newExpensePaymentMethod)?.icon as any}
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                        {PAYMENT_METHODS.find(pm => pm.id === newExpensePaymentMethod)?.name}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon name="credit-card-outline" size={18} color={theme.textSecondary} />
                      <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                        Select payment method
                      </Text>
                    </>
                  )}
                </View>
                <Icon name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tags Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tags (Optional)</Text>
                <TouchableOpacity
                  onPress={() => setShowCreateTagModal(true)}
                  style={styles.addTagButton}
                >
                  <Icon name="plus-circle" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>

              {/* Selected Tags */}
              {newExpenseTags.length > 0 && (
                <View style={styles.selectedTagsContainer}>
                  {newExpenseTags.map((tagId) => {
                    const tag = availableTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <TouchableOpacity
                        key={tagId}
                        style={[
                          styles.tagChip,
                          { backgroundColor: tag.color + '20', borderColor: tag.color },
                        ]}
                        onPress={() => setNewExpenseTags(newExpenseTags.filter(id => id !== tagId))}
                      >
                        <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.name}</Text>
                        <Icon name="close" size={12} color={tag.color} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Tags Picker */}
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
                onPress={() => setShowTagsPicker(true)}
              >
                <View style={styles.pickerButtonContent}>
                  <Icon name="tag-multiple-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                    {newExpenseTags.length > 0 ? `Add more tags` : 'Add tags'}
                  </Text>
                </View>
                <Icon name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
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
        {/* <ConfettiCelebration
          active={showConfetti}
          onAnimationEnd={() => setShowConfetti(false)}
        /> */}

        {/* Upgrade Prompt */}
        <UpgradePrompt
          visible={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          feature="Voice & AI Transaction Entry"
        />

        {/* Payment Method Picker Modal */}
        <Modal
          visible={showPaymentMethodPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPaymentMethodPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Payment Method</Text>
                <TouchableOpacity onPress={() => setShowPaymentMethodPicker(false)}>
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScrollView}>
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    !newExpensePaymentMethod && { backgroundColor: theme.primary + '10' },
                  ]}
                  onPress={() => {
                    setNewExpensePaymentMethod(undefined);
                    setShowPaymentMethodPicker(false);
                  }}
                >
                  <Icon name="close-circle" size={20} color={theme.textSecondary} />
                  <Text style={[styles.modalOptionText, { color: theme.textSecondary }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: theme.border },
                      newExpensePaymentMethod === method.id && { backgroundColor: theme.primary + '10' },
                    ]}
                    onPress={() => {
                      setNewExpensePaymentMethod(method.id);
                      setShowPaymentMethodPicker(false);
                    }}
                  >
                    <Icon name={method.icon as any} size={20} color={theme.primary} />
                    <Text style={[styles.modalOptionText, { color: theme.text }]}>
                      {method.name}
                    </Text>
                    {newExpensePaymentMethod === method.id && (
                      <Icon name="check" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Tags Picker Modal */}
        <Modal
          visible={showTagsPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTagsPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Tags</Text>
                <TouchableOpacity onPress={() => setShowTagsPicker(false)}>
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScrollView}>
                {availableTags.map((tag) => {
                  const isSelected = newExpenseTags.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: theme.border },
                        isSelected && { backgroundColor: tag.color + '10' },
                      ]}
                      onPress={() => handleToggleTag(tag.id)}
                    >
                      <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.modalOptionText, { color: theme.text }]}>
                        {tag.name}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={20} color={tag.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {availableTags.length === 0 && (
                  <View style={styles.emptyTagsContainer}>
                    <Text style={[styles.emptyTagsText, { color: theme.textSecondary }]}>
                      No tags yet. Create one to get started!
                    </Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.createTagButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowTagsPicker(false);
                  setShowCreateTagModal(true);
                }}
              >
                <Icon name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.createTagButtonText}>Create New Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Create Tag Modal */}
        <Modal
          visible={showCreateTagModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowCreateTagModal(false);
            setNewTagName('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.createTagModalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Tag</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateTagModal(false);
                    setNewTagName('');
                  }}
                >
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.tagInput,
                  { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                ]}
                placeholder="Tag name (e.g., Business, Personal)"
                placeholderTextColor={theme.textTertiary}
                value={newTagName}
                onChangeText={setNewTagName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.border }]}
                  onPress={() => {
                    setShowCreateTagModal(false);
                    setNewTagName('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                  onPress={handleCreateTag}
                >
                  <Text style={styles.modalButtonTextPrimary}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Balance Adjustment Bottom Sheet */}
        <BottomSheet
          ref={balanceAdjustSheetRef}
          index={-1}
          snapPoints={['40%']}
          enablePanDownToClose
          backgroundComponent={BottomSheetBackground}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        >
          <BottomSheetScrollView
            style={styles.bottomSheetContent}
            contentContainerStyle={styles.bottomSheetContentContainer}
          >
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>Adjust Balance</Text>
            <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary }]}>
              Update your current balance. A transaction will be created to reflect this change.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Balance</Text>
              <View style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.currencySymbol, { color: theme.text }]}>{getCurrencySymbol()}</Text>
                <TextInput
                  style={[styles.amountInputField, { color: theme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="decimal-pad"
                  value={newBalance}
                  onChangeText={setNewBalance}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleAdjustBalance}
              disabled={isAdjustingBalance}
            >
              {isAdjustingBalance ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Update Balance</Text>
              )}
            </TouchableOpacity>
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
  viewHistoryHint: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  viewHistoryText: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
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
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyChartCard: {
    paddingVertical: spacing.xl,
    minHeight: 220,
    justifyContent: 'center',
  },
  emptyChartText: {
    ...typography.titleMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyChartSubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
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
  typeToggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  typeToggleText: {
    ...typography.labelMedium,
    fontWeight: '600',
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
  aiButtonContainer: {
    flex: 1,
    position: 'relative',
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
  premiumBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  premiumBadgeContainer: {
    alignSelf: 'center',
  },
  premiumBannerText: {
    ...typography.bodySmall,
    flex: 1,
  },
  upgradeLink: {
    paddingHorizontal: spacing.sm,
  },
  upgradeLinkText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  premiumBadgeOverlay: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  premiumIconBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  scanButtonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  scanButtonBadgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    position: 'relative',
    gap: spacing.xs,
  },
  bulkButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  bulkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  addTagButton: {
    padding: spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pickerButtonText: {
    ...typography.bodyMedium,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
  tagChipText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.md,
  },
  createTagModalContent: {
    maxHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  modalOptionText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyTagsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTagsText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  createTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createTagButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInput: {
    ...typography.bodyMedium,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {
    // backgroundColor handled inline
  },
  modalButtonText: {
    ...typography.labelLarge,
  },
  modalButtonTextPrimary: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  bottomSheetSubtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
  },
  amountInputField: {
    flex: 1,
    ...typography.titleMedium,
    paddingVertical: spacing.md,
  },
  saveButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default DashboardScreen;
