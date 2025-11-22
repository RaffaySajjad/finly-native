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
  Keyboard,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import {
  ExpenseCard,
  ExpenseOptionsSheet,
  SkeletonCard,
  ConfettiCelebration,
  BottomSheetBackground,
  PremiumBadge,
  CurrencyInput,
  SpendingBreakdown,
  SectionHeader,
  EmptyState,
  IconButton,
  PrimaryButton,
  InputGroup,
  GradientCard,
  PullToRefreshScrollView,
} from '../components';
import { useSubscription } from '../hooks/useSubscription';
import { apiService } from '../services/api';
import { Expense, MonthlyStats, Insight, Category, UnifiedTransaction } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';

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
  const { isPremium, getRemainingUsage } = useSubscription();
  const { openBottomSheet } = useBottomSheet();
  const optionsSheetRef = useRef<BottomSheet>(null);
  const balanceAdjustSheetRef = useRef<BottomSheet>(null);
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Balance adjustment state
  const [newBalance, setNewBalance] = useState('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation values
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const insightOpacity = useRef(new Animated.Value(0)).current;

  // Dynamic snap points based on keyboard
  const balanceSheetSnapPoints = useMemo(() => {
    if (keyboardHeight > 0) {
      // When keyboard is visible, calculate snap point to keep input visible
      const screenHeight = Dimensions.get('window').height;
      const sheetHeight = 300; // Approximate content height
      const snapPoint = ((sheetHeight + keyboardHeight + 20) / screenHeight) * 100;
      return [`${Math.min(snapPoint, 90)}%`]; // Cap at 90%
    }
    return ['45%']; // Default when keyboard is hidden
  }, [keyboardHeight]);

  // Initialize app data on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Handle keyboard show/hide for bottom sheet
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
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
      const [transactionsData, categoriesData, statsData, insightsData] = await Promise.all([
        apiService.getUnifiedTransactions({ limit: 5 }),
        apiService.getCategories(),
        apiService.getMonthlyStats(),
        apiService.getInsights(),
      ]);
      setTransactions(transactionsData);
      setCategories(categoriesData);
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


  const handleTransactionLongPress = (transaction: UnifiedTransaction) => {
    if (transaction.type === 'expense') {
      setSelectedTransaction(transaction);
      optionsSheetRef.current?.expand();
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handleEditTransaction = (transaction: UnifiedTransaction) => {
    setSelectedTransaction(null);
    if (transaction.type === 'expense') {
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
      navigation.navigate('AddExpense', { expense });
    }
  };

  const handleDeleteTransaction = async (transaction: UnifiedTransaction) => {
    setSelectedTransaction(null);
    try {
      if (transaction.type === 'expense') {
        await apiService.deleteExpense(transaction.id);
        await loadData(); // Refresh all data
        Alert.alert('Deleted', 'Transaction deleted successfully');
      }
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

        {/* Header with Trends and Settings buttons */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="crown"
              onPress={() => navigation.navigate('Subscription')}
              color={theme.warning}
            />
          </View>
          <View style={styles.headerRight}>
            <IconButton
              icon="chart-line"
              onPress={() => navigation.navigate('Trends')}
              color={theme.primary}
            />
            <IconButton
              icon="cog"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        <PullToRefreshScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onRefresh={loadData}
        >
          {/* Premium Status Banner */}
          {/* {!isPremium && (
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
          )} */}

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
                  <GradientCard
                    colors={[theme.primary, theme.primaryDark, theme.primaryLight]}
                    contentStyle={styles.gradientCard}
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
                  </GradientCard>
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

          {/* Spending Breakdown */}
          <View style={styles.section}>
            <SpendingBreakdown categories={categories} />
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <SectionHeader
              title="Recent Transactions"
              showSeeAll
              onSeeAllPress={() => navigation.navigate('TransactionsList')}
            />

            {loading ? (
              // Show skeleton loaders while loading
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : transactions.length > 0 ? (
              <FlatList
                data={transactions.slice(0, 20)}
                renderItem={({ item: transaction }) => (
                  <ExpenseCard
                      transaction={transaction}
                      onPress={() => {
                        navigation.navigate('TransactionDetails', { transaction });
                      }}
                      onLongPress={() => handleTransactionLongPress(transaction)}
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={5}
                  updateCellsBatchingPeriod={50}
                  windowSize={5}
                  initialNumToRender={5}
                  ListEmptyComponent={
                    <EmptyState
                      icon="receipt-text-outline"
                      title="No transactions yet"
                    />
                  }
                  ListFooterComponent={
                    transactions.length > 20 ? (
                      <TouchableOpacity
                        style={[styles.viewAllFooter, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('TransactionsList')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.viewAllFooterText, { color: theme.text }]}>
                          +{transactions.length - 20} more transactions
                        </Text>
                        <Icon name="chevron-right" size={20} color={theme.primary} />
                      </TouchableOpacity>
                    ) : null
                  }
                />
            ) : (
                  <EmptyState
                    icon="receipt-text-outline"
                    title="No transactions yet"
                  />
            )}
          </View>
        </PullToRefreshScrollView>

        {/* Expense Options Sheet */}
        {selectedTransaction && selectedTransaction.type === 'expense' && (
          <ExpenseOptionsSheet
            expense={{
              id: selectedTransaction.id,
              amount: selectedTransaction.amount,
              categoryId: selectedTransaction.category!.id,
              category: selectedTransaction.category!,
              description: selectedTransaction.description,
              date: selectedTransaction.date,
              paymentMethod: selectedTransaction.paymentMethod,
              notes: selectedTransaction.notes,
              tags: selectedTransaction.tags,
              createdAt: selectedTransaction.createdAt,
              updatedAt: selectedTransaction.updatedAt || selectedTransaction.createdAt,
            }}
            onEdit={() => handleEditTransaction(selectedTransaction)}
            onDelete={() => handleDeleteTransaction(selectedTransaction)}
            onClose={() => setSelectedTransaction(null)}
          />
        )}

        {/* Confetti Celebration */}
        {/* <ConfettiCelebration
          active={showConfetti}
          onAnimationEnd={() => setShowConfetti(false)}
        /> */}

        {/* Balance Adjustment Bottom Sheet */}
        <BottomSheet
          ref={balanceAdjustSheetRef}
          index={-1}
          snapPoints={balanceSheetSnapPoints}
          enablePanDownToClose
          backgroundComponent={BottomSheetBackground}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
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
                <CurrencyInput
                  value={newBalance}
                  onChangeText={setNewBalance}
                  placeholder="0.00"
                  placeholderTextColor={theme.textTertiary}
                  showSymbol={true}
                  allowDecimals={true}
                  inputStyle={styles.currencyInputField}
                  TextInputComponent={BottomSheetTextInput}
                />
              </View>
            </View>

            <PrimaryButton
              label="Update Balance"
              onPress={handleAdjustBalance}
              loading={isAdjustingBalance}
              fullWidth
            />
          </BottomSheetScrollView>
        </BottomSheet>

        {/* iOS-only Add Transaction FAB */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.addTransactionFAB,
              {
                backgroundColor: theme.primary,
                bottom: Math.max(insets.bottom, 12) + 70,
              },
              elevation.lg,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              openBottomSheet();
            }}
            activeOpacity={0.9}
          >
            <Icon name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
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
    paddingBottom: spacing.md,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    padding: spacing.md,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addTransactionFAB: {
    position: 'absolute',
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  currencyInputField: {
    paddingVertical: spacing.md,
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
  viewAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  viewAllFooterText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
});

export default DashboardScreen;
