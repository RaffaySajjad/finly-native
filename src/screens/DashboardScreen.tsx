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
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  TransactionCard,
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
import { syncWidgetData } from '../services/widgetSync';
import { Expense, MonthlyStats, Insight, Category, UnifiedTransaction } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const RECENT_TRANSACTIONS_LIMIT = 10;
const ANIMATION_CYCLE_DURATION = 5000;
const ANIMATION_FADE_DURATION = 800;


interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: UnifiedTransaction[];
}

/**
 * Format date for display (same as InsightsScreen and CategoryDetailsScreen)
 */
const formatDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    // Check if it's within the last 7 days
    const daysDiff = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      // Check if it's in the past year
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      if (date.getFullYear() < today.getFullYear()) {
        // Past year - include year: "26 November, 2024"
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } else {
        // Current year but more than 7 days ago - no year: "26 November"
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long'
        });
      }
    }
  }
};

/**
 * Group transactions by date
 */
const groupTransactionsByDate = (transactions: UnifiedTransaction[]): GroupedTransactions[] => {
  // First, ensure transactions are sorted by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const grouped: Record<string, UnifiedTransaction[]> = {};

  sortedTransactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(transaction);
  });

  // Convert to array and sort by date (newest first)
  return Object.entries(grouped)
    .map(([date, transactions]) => ({
      date,
      dateLabel: formatDateLabel(transactions[0].date),
      transactions: transactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
};

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

/**
 * DashboardScreen - Main home screen
 */
const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, getCurrencySymbol, currencyCode, convertFromUSD, convertToUSD } = useCurrency();
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPremium, getRemainingUsage } = useSubscription();
  const { openBottomSheet, setOnTransactionAdded } = useBottomSheet();
  const optionsSheetRef = useRef<BottomSheet>(null);
  const balanceAdjustSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBalancePill, setShowBalancePill] = useState(false);

  // Balance adjustment state
  const [newBalance, setNewBalance] = useState('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation values
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const insightOpacity = useRef(new Animated.Value(0)).current;
  
  // Scroll tracking for balance pill
  const scrollY = useRef(new Animated.Value(0)).current;
  const balanceCardY = useRef<number>(0);
  const balanceCardHeight = useRef<number>(0);
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(0.9)).current;

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

  // Refresh data when screen gains focus - use cache for faster load
  useFocusEffect(
    useCallback(() => {
      loadData(false); // Use cache by default
    }, [])
  );

  // Scroll to top when tab is pressed while already on this screen
  useScrollToTopOnTabPress(scrollViewRef);

  // Register callback to refresh when transaction is added
  useEffect(() => {
    setOnTransactionAdded(() => {
      console.log('[DashboardScreen] Transaction added, refreshing data...');
        loadData(true); // Skip cache when transaction is added to show latest data
      });

    // Cleanup on unmount
    return () => {
      setOnTransactionAdded(null);
    };
  }, [setOnTransactionAdded]);

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


  // ... other imports

  // Balance Pill Animation Loop
  const [pillDisplayMode, setPillDisplayMode] = useState<'balance' | 'summary'>('balance');
  const pillContentOpacity = useRef(new Animated.Value(1)).current;
  const isAnimationLoopActive = useRef(false);
  const { animateBalancePill } = usePreferences();

  useEffect(() => {
    // If preference is off, reset to balance and stop
    if (!animateBalancePill) {
      isAnimationLoopActive.current = false;
      pillContentOpacity.setValue(1);
      setPillDisplayMode('balance');
      return;
    }

    if (!showBalancePill) {
      isAnimationLoopActive.current = false;
      // Reset after a delay to avoid flicker if user is just scrolling quickly
      const timeout = setTimeout(() => {
        if (!isAnimationLoopActive.current) {
          pillContentOpacity.setValue(1);
          setPillDisplayMode('balance');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Prevent multiple loops from starting
    if (isAnimationLoopActive.current) return;
    isAnimationLoopActive.current = true;

    let abortController = new AbortController();

    const cycleAnimation = async () => {
      if (!isAnimationLoopActive.current) return;

      // Wait initial duration
      await new Promise(resolve => setTimeout(resolve, ANIMATION_CYCLE_DURATION));
      if (!isAnimationLoopActive.current || abortController.signal.aborted) return;

      // Fade out
      Animated.timing(pillContentOpacity, {
        toValue: 0,
        duration: ANIMATION_FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !isAnimationLoopActive.current) return;

        // Change content
        setPillDisplayMode(prev => prev === 'balance' ? 'summary' : 'balance');

        // Fade in
        Animated.timing(pillContentOpacity, {
          toValue: 1,
          duration: ANIMATION_FADE_DURATION,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && isAnimationLoopActive.current) {
            cycleAnimation();
          }
        });
      });
    };

    cycleAnimation();

    return () => {
      isAnimationLoopActive.current = false;
      abortController.abort();
      pillContentOpacity.setValue(1);
      // We don't reset pillDisplayMode here to prevent flashing back to balance while scrolling
    };
  }, [showBalancePill, animateBalancePill]);

  const initializeApp = async (): Promise<void> => {
    try {
      await apiService.initialize();
      await loadData();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const loadData = async (skipCache: boolean = false): Promise<void> => {
    try {
      const [transactionsResponse, categoriesData, statsData, insightsResponse] = await Promise.all([
        apiService.getUnifiedTransactions({
          limit: RECENT_TRANSACTIONS_LIMIT,
          includeTotal: true
        }),
        apiService.getCategories(skipCache),
        apiService.getMonthlyStats(skipCache),
        apiService.getInsights({ limit: 5, forceRefresh: skipCache }), // Get first 5 insights for dashboard
      ]);

      // Handle paginated response with total count
      if (typeof transactionsResponse === 'object' && 'transactions' in transactionsResponse) {
        setTransactions(transactionsResponse.transactions);
        setTotalTransactions(transactionsResponse.total);
      } else {
        // Fallback for backward compatibility (array response)
        const transactionsArray = transactionsResponse as UnifiedTransaction[];
        setTransactions(transactionsArray);
        setTotalTransactions(transactionsArray.length);
      }

      setCategories(categoriesData);
      setStats(statsData);

      // Handle both old cached format (array) and new paginated format
      const insightsData = Array.isArray(insightsResponse)
        ? insightsResponse
        : (insightsResponse?.insights || []);
      setInsights(insightsData);

      // Sync widget data after loading stats
      syncWidgetData(currencyCode, getCurrencySymbol()).catch(err => {
        console.error('[Dashboard] Error syncing widget data:', err);
      });

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

  // Update grouped transactions when transactions change
  // No need to slice since we're already fetching exactly RECENT_TRANSACTIONS_LIMIT
  useEffect(() => {
    const grouped = groupTransactionsByDate(transactions);
    setGroupedTransactions(grouped);
  }, [transactions]);


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
      openBottomSheet(expense);
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
      // Convert the entered balance from display currency to USD
      const newBalanceInDisplayCurrency = parseFloat(newBalance);
      const newBalanceInUSD = convertToUSD(newBalanceInDisplayCurrency);
      const currentBalanceInUSD = stats?.balance || 0;
      const difference = newBalanceInUSD - currentBalanceInUSD;

      // If difference is negligible, just close
      if (Math.abs(difference) < 0.01) {
        balanceAdjustSheetRef.current?.close();
        return;
      }

      if (difference > 0) {
        // Income: Create income transaction
        await apiService.createIncomeTransaction({
          amount: difference,
          description: 'Balance Adjustment',
          date: new Date(),
          originalAmount: convertFromUSD(difference),
          originalCurrency: currencyCode,
        });
      } else {
        // Expense: Create expense transaction
        // Find a suitable category (Other, Misc, or first available)
        const adjustmentCategory = categories.find(c =>
          c.name.toLowerCase().includes('other') ||
          c.name.toLowerCase().includes('misc') ||
          c.name.toLowerCase().includes('general')
        ) || categories[0];

        if (!adjustmentCategory) {
          throw new Error('No categories available to create adjustment expense');
        }

        await apiService.addExpense({
          amount: Math.abs(difference),
          categoryId: adjustmentCategory.id,
          description: 'Balance Adjustment',
          date: new Date(),
          originalAmount: convertFromUSD(Math.abs(difference)),
          originalCurrency: currencyCode,
        });
      }

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
      // Convert balance from USD to display currency for editing
      const displayBalance = convertFromUSD(stats.balance);
      setNewBalance(displayBalance.toString());
      balanceAdjustSheetRef.current?.expand();
    }
  };

  // Handle scroll to show/hide balance pill
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false, // We need to read the value for calculations
      listener: (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.y;
        
        // Show pill when balance card is scrolled out of view
        // Use a simpler threshold: show when scrolled past the balance card
        const headerHeight = 60;
        let threshold = 0;
        
        if (balanceCardY.current > 0) {
          // Card has been measured - use actual position
          threshold = balanceCardY.current + balanceCardHeight.current - headerHeight;
        } else {
          // Card not measured yet - use a safe fallback (show after 150px scroll)
          threshold = 150;
        }
        
        const shouldShow = scrollPosition > threshold;
        
        if (shouldShow !== showBalancePill) {
          console.log('[BalancePill] Visibility change:', {
            scrollPosition,
            threshold,
            cardY: balanceCardY.current,
            cardHeight: balanceCardHeight.current,
            shouldShow,
          });
          
          setShowBalancePill(shouldShow);
          
          Animated.parallel([
            Animated.timing(pillOpacity, {
              toValue: shouldShow ? 1 : 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(pillScale, {
              toValue: shouldShow ? 1 : 0.9,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }
  );

  // Handle balance card layout to measure position
  const handleBalanceCardLayout = (event: any) => {
    const { y, height } = event.nativeEvent.layout;
    balanceCardY.current = y;
    balanceCardHeight.current = height;
    console.log('[BalancePill] Card measured:', { y, height, threshold: y + height - 60 });
  };

  // Scroll back to balance card when pill is tapped
  const handlePillPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: theme.text }]}>Home</Text>
            </View>
            {/* Balance Pill - appears when balance card scrolls out of view */}
            {stats && animateBalancePill && (
              <Animated.View
                style={[
                  styles.balancePill,
                  {
                    opacity: Animated.multiply(pillOpacity, pillContentOpacity),
                    transform: [{ scale: pillScale }],
                  },
                ]}
                pointerEvents={showBalancePill ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  onPress={handlePillPress}
                  activeOpacity={0.8}
                  style={[
                    styles.balancePillContent,
                    {
                      backgroundColor: isDark ? '#1E4A6F' : theme.primary,
                    },
                    elevation.sm,
                  ]}
                >
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      // Opacity handled by parent container now
                    }}
                  >
                    {pillDisplayMode === 'balance' ? (
                      <>
                        <Icon name="wallet" size={14} color="#FFFFFF" style={styles.balancePillIcon} />
                        <Text style={styles.balancePillText} numberOfLines={1}>
                          {formatCurrency(stats.balance)}
                        </Text>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                          <Icon name="arrow-down-circle" size={14} color="#4ADE80" style={{ marginRight: 4 }} />
                          <Text style={[styles.balancePillText]} numberOfLines={1}>
                            {formatCurrency(stats.totalIncome)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="arrow-up-circle" size={14} color="#F87171" style={{ marginRight: 4 }} />
                          <Text style={[styles.balancePillText]} numberOfLines={1}>
                            {formatCurrency(stats.totalExpenses)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            )}
            <View style={styles.headerRight}>
              {Platform.OS === 'android' && <IconButton
                icon="lightbulb-on"
                onPress={() => navigation.navigate('Insights')}
                color={theme.primary}
              />}
              <IconButton
                icon="cog"
                onPress={() => navigation.navigate('Settings')}
              />
            </View>
          </View>
        </View>

        <PullToRefreshScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 0 }}
          onRefresh={() => loadData(true)} // Skip cache on pull-to-refresh
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Premium Balance Card */}
          {stats && (
            <View 
              style={styles.balanceCardContainer}
              onLayout={handleBalanceCardLayout}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenBalanceAdjust}
                onLongPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  navigation.navigate('BalanceHistory');
                }}
              >
                <Animated.View style={[styles.balanceCard, {
                  opacity: gradientAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }]}>
                  <GradientCard
                    colors={isDark 
                      ? ['#1E4A6F', '#0F2E4A', '#2E5F8F'] // Darker blues for dark mode
                      : [theme.primary, theme.primaryDark, theme.primaryLight]
                    }
                    contentStyle={styles.gradientCard}
                  >
                    <View style={styles.balanceHeader}>
                      <Text style={styles.balanceLabel}>Total Balance</Text>
                      <Icon name="pencil" size={24} color="rgba(255, 255, 255, 0.9)" />
                    </View>

                    <Text
                      style={[styles.balanceAmount]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {formatCurrency(stats.balance, { disableAbbreviations: true })}
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
                onPress={() => navigation.navigate('Insights')}
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
            ) : groupedTransactions.length > 0 ? (
              <FlatList
                  data={groupedTransactions}
                  renderItem={({ item: group }) => (
                    <View>
                      {/* Date Header */}
                      <View style={[styles.dateHeader, { backgroundColor: theme.background }]}>
                        <Text style={[styles.dateHeaderText, { color: theme.textSecondary }]}>
                          {group.dateLabel}
                        </Text>
                        <View style={[styles.dateHeaderLine, { backgroundColor: theme.border }]} />
                      </View>

                      {/* Transactions for this date */}
                      {group.transactions.map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          onPress={() => {
                            navigation.navigate('TransactionDetails', { transaction });
                          }}
                          onLongPress={() => handleTransactionLongPress(transaction)}
                        />
                    ))}
                  </View>
                )}
                  keyExtractor={(item) => item.date}
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
                  totalTransactions > RECENT_TRANSACTIONS_LIMIT ? (
                    <TouchableOpacity
                      style={[styles.viewAllFooter, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => navigation.navigate('TransactionsList')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.viewAllFooterText, { color: theme.text }]}>
                          +{totalTransactions - RECENT_TRANSACTIONS_LIMIT} more transactions
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  balancePill: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  balancePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 80,
    gap: spacing.xs,
  },
  balancePillIcon: {
    marginRight: 2,
  },
  balancePillText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 2,
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
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
    marginTop: spacing.lg,
    borderWidth: 1,
  },
  viewAllFooterText: {
    ...typography.bodyMedium,
    fontWeight: '600',
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
});

export default DashboardScreen;
