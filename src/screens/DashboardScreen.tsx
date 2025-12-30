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
  Animated,
  Easing,
  Platform,
  Modal,
  Keyboard,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../hooks/useAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useAppSelector } from '../store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAppFlow } from '../contexts/AppFlowContext';
import { usePerformance } from '../contexts/PerformanceContext';
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
  NotificationPermissionBanner,
} from '../components';
import { GlowButton, AnimatedCard, ShimmerLoader } from '../components/PremiumComponents';
import { GradientHeader } from '../components/GradientHeader';
import { useSubscription } from '../hooks/useSubscription';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';
import logger from '../utils/logger';
import { Expense, MonthlyStats, Category, UnifiedTransaction } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import * as Haptics from 'expo-haptics';
import FABQuickActions from '../components/FABQuickActions';
import GoalFocusCard from '../components/GoalFocusCard';
import NumberTicker from '../components/NumberTicker';
import { useGoal } from '../hooks/useGoal';
import * as Notifications from 'expo-notifications';
import { convertCurrencyAmountsInText } from '../utils/currencyFormatter';
import { formatDateLabel } from '../utils/dateFormatter';
import { getValidIcon } from '../utils/iconUtils';

const { width } = Dimensions.get('window');

const RECENT_TRANSACTIONS_LIMIT = 10;
const ANIMATION_CYCLE_DURATION = 5000;
const ANIMATION_FADE_DURATION = 800;
const STREAK_BADGE_DISMISSED_KEY = '@finly_streak_badge_dismissed';

interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: UnifiedTransaction[];
}

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
  const { user } = useAppSelector((state) => state.auth); // Access user for streak info
  const { formatCurrency, getCurrencySymbol, currencyCode, convertFromUSD, convertToUSD, showDecimals } = useCurrency();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPremium, getRemainingUsage } = useSubscription();
  const { openBottomSheet, setOnTransactionAdded } = useBottomSheetActions();
  const { showError, showSuccess, showInfo, AlertComponent } = useAlert();
  const optionsSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { goal, goalInfo, syncGoal } = useGoal();
  const { paywallComplete } = useAppFlow();
  
  // Sync goal from user profile if not set locally
  useEffect(() => {
    if (user?.financialGoal && (!goal || goal !== user.financialGoal)) {
      // @ts-ignore - user.financialGoal is string from backend but we need UserGoal type
      syncGoal(user.financialGoal);
    }
  }, [user?.financialGoal, goal, syncGoal]);

  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBalancePill, setShowBalancePill] = useState(false);

  // FAB Quick Actions state
  const [showQuickActions, setShowQuickActions] = useState(false);
  const fabRef = useRef<View>(null);
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Notification permission banner state
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // Debug: Log when banner state changes
  useEffect(() => {
    console.log('[DashboardScreen] showNotificationBanner changed to:', showNotificationBanner);
  }, [showNotificationBanner]);

  useEffect(() => {
    console.log('[DashboardScreen] showNotificationBanner changed to:', showNotificationBanner);
  }, [showNotificationBanner]);

  // Streak Badge Animation
  const [showStreakBadge, setShowStreakBadge] = useState(false);
  const badgeScale = useRef(new Animated.Value(0)).current;

  // Check if streak was updated today and verify persistence
  useEffect(() => {
    const checkStreakVisibility = async () => {
      if (user?.streakUpdatedAt) {
        const lastUpdated = new Date(user.streakUpdatedAt);
        const today = new Date();
        const isToday = lastUpdated.getDate() === today.getDate() &&
          lastUpdated.getMonth() === today.getMonth() &&
          lastUpdated.getFullYear() === today.getFullYear();

        if (isToday && user.streakCount && user.streakCount > 0) {
          try {
            // Check if dismissed today
            const dismissedDate = await AsyncStorage.getItem(STREAK_BADGE_DISMISSED_KEY);
            const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

            if (dismissedDate !== todayStr) {
              setShowStreakBadge(true);
              // Animate badge in
              Animated.spring(badgeScale, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }).start();

              // Loop pulse animation
              Animated.loop(
                Animated.sequence([
                  Animated.timing(badgeScale, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                  }),
                  Animated.timing(badgeScale, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                  }),
                ])
              ).start();
              return;
            }
          } catch (error) {
            console.error('Error reading streak badge persistence:', error);
          }
        }
      }
      setShowStreakBadge(false);
    };

    checkStreakVisibility();
  }, [user?.streakUpdatedAt, user?.streakCount]);

  // Animation values
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  
  // Staggered Entry Animations
  const fadeAnim1 = useRef(new Animated.Value(0)).current; // Balance Card & Goal
  const fadeAnim2 = useRef(new Animated.Value(0)).current; // Transactions

  // Scroll tracking for balance pill
  const scrollY = useRef(new Animated.Value(0)).current;
  const balanceCardY = useRef<number>(0);
  const balanceCardHeight = useRef<number>(0);
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(0.9)).current;



  useEffect(() => {
    initializeApp();
    // Notifications are now handled globally by useNotificationObserver in AppNavigator

    return () => {
      // notificationService.removeNotificationListeners();
    };
  }, []);

  // Notification logic moved to useNotificationObserver hook

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

      // Check if we should show notification permission banner
      const checkNotificationPermission = async () => {
        // Only show after paywall is complete to avoid timing conflicts
        if (!paywallComplete) {
          console.log('[DashboardScreen] Paywall not complete yet, skipping notification banner');
          return;
        }

        // Check if banner has been shown before
        const hasBeenShown = await notificationService.hasPermissionBannerBeenShown();
        console.log('[DashboardScreen] Notification banner check:', { hasBeenShown, paywallComplete });

        if (hasBeenShown) {
          console.log('[DashboardScreen] Banner already shown, skipping');
          return;
        }

        // Check current permission status
        const permissionStatus = await notificationService.getPermissionStatus();
        console.log('[DashboardScreen] Permission status:', permissionStatus);

        // Show if permission is not granted (undetermined OR denied)
        // This allows 'denied' users to see our educational banner and 'Open Settings' path
        if (permissionStatus !== 'granted') {
          console.log('[DashboardScreen] Showing notification banner in 1 second...');
          // Small delay to let the screen settle
          setTimeout(() => {
            setShowNotificationBanner(true);
            console.log('[DashboardScreen] Banner state set to true');
          }, 1000);
        }
      };

      checkNotificationPermission();
    }, [paywallComplete])
  );

  // Scroll to top when tab is pressed while already on this screen
  useScrollToTopOnTabPress(scrollViewRef);

  // Register callback to refresh when transaction is added
  useEffect(() => {
    setOnTransactionAdded(() => {
      logger.debug('[DashboardScreen] Transaction added, refreshing data...');
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

    // Staggered Entry Sequence
    Animated.stagger(200, [
      Animated.timing(fadeAnim1, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1)),
      }),
      Animated.timing(fadeAnim2, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
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
      const [transactionsResponse, categoriesData, statsData] = await Promise.all([
        apiService.getUnifiedTransactions({
          limit: RECENT_TRANSACTIONS_LIMIT,
          includeTotal: true
        }),
        apiService.getCategories(skipCache),
        apiService.getMonthlyStats(skipCache),
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


  // Handle FAB long press - show quick actions
  const handleFABLongPress = () => {
    if (fabRef.current) {
      fabRef.current.measure((x, y, width, height, pageX, pageY) => {
        setFabPosition({
          x: pageX + width / 2,
          y: pageY,
        });
        setShowQuickActions(true);
      });
    }
  };

  // Quick actions configuration
  const quickActions = [
    {
      id: 'voice-entry',
      label: 'Record Transaction',
      icon: 'microphone',
      onPress: () => {
        navigation.navigate('VoiceTransaction');
      },
    },
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      icon: 'camera',
      onPress: () => {
        navigation.navigate('ReceiptUpload');
      },
    },
  ];

  const handleTransactionLongPress = (transaction: UnifiedTransaction) => {
    if (transaction.type === 'expense') {
      setSelectedTransaction(transaction);
      optionsSheetRef.current?.expand();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        showSuccess('Done', 'Transaction removed.');
      }
    } catch (error) {
      showError('Error', 'Failed to delete transaction');
      console.error(error);
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
          logger.debug('[BalancePill] Visibility change:', {
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

  const handleNotificationPermissionGranted = () => {
    setShowNotificationBanner(false);
    showSuccess('Notifications Enabled', 'You\'ll now receive smart insights and updates!');
  };

  const handleNotificationPermissionDenied = () => {
    setShowNotificationBanner(false);
  };

  // Handle balance card layout to measure position
  const handleBalanceCardLayout = (event: any) => {
    const { y, height } = event.nativeEvent.layout;
    balanceCardY.current = y;
    balanceCardHeight.current = height;
    logger.debug('[BalancePill] Card measured:', { y, height, threshold: y + height - 60 });
  };

  // Scroll back to balance card when pill is tapped
  const handlePillPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
        <GradientHeader />

        {/* Header with Trends and Settings buttons */}
        <View style={[styles.header, { marginTop: insets.top }]}>
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
                    top: 0, // Reset top since we are inside the header view which has margin
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
                    // Background handled by LinearGradient
                    { overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0 } // Reset padding/border for container
                  ]}
                >
                  <LinearGradient
                    colors={isDark ? ['#1A3A52', '#0D2438', '#1E4A6F'] : ['#4F46E5', '#4A90E2', '#0EA5E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      gap: spacing.xs,
                    }}
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
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
            <View style={styles.headerRight}>
              {Platform.OS === 'android' && <IconButton
                icon="lightbulb-on"
                onPress={() => navigation.navigate('Insights')}
                color={theme.primary}
              />}
              <View>
                <IconButton
                  icon="cog"
                  onPress={async () => {
                    navigation.navigate('Settings');
                    if (showStreakBadge) {
                      setShowStreakBadge(false);
                      try {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
                        await AsyncStorage.setItem(STREAK_BADGE_DISMISSED_KEY, todayStr);
                      } catch (error) {
                        console.error('Error saving streak badge persistence:', error);
                      }
                    }
                  }}
                />
                {showStreakBadge && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      padding: 2,
                      transform: [{ scale: badgeScale }],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1.41,
                      elevation: 2,
                    }}
                  >
                    <LinearGradient
                      colors={['#FF4500', '#FFD700']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="fire" size={12} color="#FFF" />
                        <Icon name="plus" size={8} color="#FFF" style={{ marginLeft: -2, marginTop: -4 }} />
                      </View>
                    </LinearGradient>
                  </Animated.View>
                )}
              </View>
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('BalanceHistory');
                }}
              >
                <Animated.View style={[styles.balanceCard, {
                  opacity: Animated.multiply(
                    gradientAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                    fadeAnim1
                  ),
                  transform: [
                    { translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                    { scale: 1 }
                  ]
                }]}>
                  <GradientCard
                    colors={isDark ? ['#1A3A52', '#0D2438', '#1E4A6F'] : ['#4F46E5', '#4A90E2', '#0EA5E9']}
                    startPoint={{ x: 0, y: 0 }}
                    endPoint={{ x: 1, y: 1 }}
                    contentStyle={styles.gradientCard}
                  >
                    <View style={styles.balanceHeader}>
                      <Text style={styles.balanceLabel}>Total Balance</Text>
                    </View>

                    <NumberTicker
                      value={(() => {
                        // 1. Prioritize backend-calculated base balance if currency matches anchor
                        if (stats.baseBalance !== undefined && stats.baseCurrency === currencyCode) {
                          return stats.baseBalance;
                        }

                        // 2. Secondary: If user has preserved original balance locally, calculate native amount
                        if (
                          user?.originalBalanceAmount !== undefined &&
                          user?.originalBalanceAmount !== null &&
                          user?.originalBalanceCurrency === currencyCode &&
                          stats
                        ) {
                          const incomeNative = convertFromUSD(stats.totalIncome);
                          const expensesNative = convertFromUSD(stats.totalExpenses);
                          return user.originalBalanceAmount + incomeNative - expensesNative;
                        }

                        // 3. Fallback: Standard conversion from USD balance
                        return convertFromUSD(stats.balance);
                      })()}
                      style={styles.balanceAmount}
                      prefix={getCurrencySymbol()}
                      decimalPlaces={showDecimals ? 2 : 0}
                    />

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


                  </GradientCard>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {/* Goal Focus Card - shows goal-specific metrics */}
          {goal && stats && (
            <View style={styles.section}>
              <GoalFocusCard
                metrics={{
                  budgetsOnTrack: categories.filter(c => c.budgetLimit && (c.totalSpent ?? 0) <= Number(c.budgetLimit)).length,
                  budgetsOverBudget: categories.filter(c => c.budgetLimit && (c.totalSpent ?? 0) > Number(c.budgetLimit)).length,
                  totalBudgets: categories.filter(c => c.budgetLimit).length,
                  daysRemaining: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
                  savingsRate: stats.savingsRate || 0,
                  monthlySavings: Math.max(0, stats.totalIncome - stats.totalExpenses),
                  monthlyIncome: stats.totalIncome,
                  transactionCount: transactions.length,
                  topCategory: categories.length > 0 ? categories.sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))[0]?.name : undefined,
                  topCategoryAmount: categories.length > 0 ? categories.sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))[0]?.totalSpent : undefined,
                  monthlyExpenses: stats.totalExpenses,
                  potentialSavings: 0,
                }}
                formatCurrency={formatCurrency}
                categories={categories}
              />
            </View>
          )}

          {/* Smart Insight Section with Staggered Animation */}
          <Animated.View style={{
            opacity: fadeAnim2,
            transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }}>
            {/* AI Insights & Notifications - Integrated into Dashboard flow */}
          </Animated.View>

          {/* Transactions Section */}
          <Animated.View
            style={[
              styles.section,
              {
                marginBottom: insets.bottom + 80,
                marginTop: spacing.sm,
                opacity: fadeAnim2,
                transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
              }
            ]}
          >
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
                    variant="transactions"
                    title="No transactions yet"
                  />
            )}
          </Animated.View>
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



        {/* iOS-only Add Transaction FAB */}
        {/* iOS-only Add Transaction FAB */}
        {Platform.OS === 'ios' && (
          <View
            ref={fabRef}
            style={[
              styles.addTransactionFAB,
              {
                position: 'absolute',
                right: spacing.lg, // Assuming it's right-aligned based on typical iOS usage, or check styles
                // But wait, the original code had styles.addTransactionFAB which likely had position absolute.
                // Let's check styles below. Assuming styles.addTransactionFAB handles positioning.
                // The original code passed styles.addTransactionFAB and dynamic bottom.
                // We need to wrap it in a View for measuring or ref the TouchableOpacity directly if possible.
                // TouchableOpacity ref might not have measure on all versions/types properly typed, but View does.
                // Let's wrap in a View to be safe for layout measurement, but keep styling on TouchableOpacity?
                // Actually, let's just ref the TouchableOpacity as View which is common practices or cast it.
                // The safest way for measure is often a View wrapper if styling permits.
                // Let's use the layout from the styles. The styles.addTransactionFAB is likely absolute.
                // Let's check the styles first? No, I'll just ref the TouchableOpacity and cast or use View wrapper with pointerEvents="box-none" and same style layout.
                // Actually, let's strictly follow the plan: "Attach ref={fabRef} and onLongPress={handleFABLongPress} to the iOS FAB."
              },
              {
                backgroundColor: 'transparent', // Wrapper doesn't need color
                bottom: Math.max(insets.bottom, 12) + 70,
                // We need the wrapper to be positioned like the button to measure it correctly
              }
            ]}
            pointerEvents="box-none"
          >
            {/* 
               Wait, duplicating styles on wrapper might be complex if styles.addTransactionFAB does heavy lifting.
               Let's just ref the TouchableOpacity.
            */}
          </View>
        )}

        {/* RE-WRITING THE COMPONENT BLOCK CAREFULLY */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            ref={fabRef}
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
            onLongPress={handleFABLongPress}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ['#1A3A52', '#0D2438', '#1E4A6F'] : ['#4F46E5', '#4A90E2', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <FABQuickActions
          visible={showQuickActions}
          onClose={() => setShowQuickActions(false)}
          actions={quickActions}
          fabPosition={fabPosition}
        />

        {/* Notification Permission Banner - shown on first launch */}
        <NotificationPermissionBanner
          visible={showNotificationBanner}
          onClose={() => setShowNotificationBanner(false)}
          onPermissionGranted={handleNotificationPermissionGranted}
          onPermissionDenied={handleNotificationPermissionDenied}
        />
        {AlertComponent}
      </View>
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
  },
  sectionTitle: {
    ...typography.titleLarge,
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
    maxWidth: 200, // Prevent overlap with header icons on wide devices
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
