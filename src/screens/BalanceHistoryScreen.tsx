/**
 * BalanceHistoryScreen - Balance Analytics & Insights
 * Purpose: Shows balance trends, projections, and actionable insights
 * Features: Clean balance overview, trend chart, collapsible details, date filters
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientHeader } from '../components/GradientHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from '../store';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { PullToRefreshScrollView } from '../components';
import { CountingNumber, GlassCard } from '../components/PremiumComponents';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import { useBalanceHistory, ComparisonStats } from '../hooks/useBalanceHistory';
import { BalanceChart } from '../components/charts/BalanceChart';
import { BalanceInsightCard } from '../components/trends/BalanceInsightCard';
import { DateRangeFilter, DateRange } from '../components/filters/DateRangeFilter';
import { useRef, useEffect } from 'react';
import NumberTicker from '../components/NumberTicker';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useAlert } from '../hooks/useAlert';
import { apiService } from '../services/api';
import { Category } from '../types';
import {
  PrimaryButton,
  CurrencyInput,
  BottomSheetBackground,
  IconButton
} from '../components';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom sheet snap points
const COLLAPSED_HEIGHT = 80;
const EXPANDED_HEIGHT = 220;

/**
 * ChangeIndicator - Compact percentage change display
 * Caps display at 999% to prevent layout overflow
 */
interface ChangeIndicatorProps {
  value: number;
  inverted?: boolean;
  size?: 'sm' | 'md';
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({ value, inverted = false, size = 'sm' }) => {
  const { theme } = useTheme();
  
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;
  
  const color = isNeutral ? theme.textTertiary : isPositive ? theme.success : theme.expense;
  const iconName = isNeutral ? 'minus' : value > 0 ? 'trending-up' : 'trending-down';
  const iconSize = size === 'md' ? 12 : 10;
  const fontSize = size === 'md' ? 11 : 10;

  // Cap display value for readability
  const absValue = Math.abs(value);
  const displayValue = absValue > 999 ? '999+' : absValue.toFixed(2);

  return (
    <View style={[styles.changeIndicator, { backgroundColor: color + '15' }]}>
      <Icon name={iconName} size={iconSize} color={color} />
      <Text style={[styles.changeText, { color, fontSize }]}>
        {displayValue}%
      </Text>
    </View>
  );
};

/**
 * StatItem - Compact stat display
 */
interface StatItemProps {
  label: string;
  value: string;
  change?: number;
  inverted?: boolean;
  valueColor?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, change, inverted, valueColor }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statItemLabel, { color: theme.textTertiary }]}>{label}</Text>
      <View style={styles.statItemRow}>
        <Text style={[styles.statItemValue, { color: valueColor || theme.text }]} numberOfLines={1}>
          {value}
        </Text>
        {change !== undefined && <ChangeIndicator value={change} inverted={inverted} />}
      </View>
    </View>
  );
};

/**
 * formatCompactCurrency - Format currency with k/M suffix for large numbers
 * Used in compact spaces like Period Comparison grid
 * @param value - USD amount (will be converted by formatCurrency internally)
 * @param symbol - Currency symbol to prepend
 * @param exchangeRate - Exchange rate for conversion
 */
const formatCompactValue = (value: number, symbol: string, exchangeRate: number = 1): string => {
  const convertedValue = value * exchangeRate;
  const absValue = Math.abs(convertedValue);
  const sign = convertedValue < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}${symbol}${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}${symbol}${(absValue / 1000).toFixed(1)}k`;
  }
  return `${sign}${symbol}${absValue.toFixed(0)}`;
};

const BalanceHistoryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const { formatCurrency, getCurrencySymbol, exchangeRate, convertFromUSD, convertToUSD, currencyCode, showDecimals } = useCurrency();
  const { showError, showInfo, showSuccess } = useAlert();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  
  // Helper for compact currency in tight spaces
  const compactCurrency = useCallback((value: number) => {
    return formatCompactValue(value, getCurrencySymbol(), exchangeRate || 1);
  }, [getCurrencySymbol, exchangeRate]);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    balanceData,
    stats,
    loading,
    refreshing,
    dateRange,
    loadBalanceHistory,
    updateDateRange,
    forceRefresh,
  } = useBalanceHistory();

  // Bottom sheet state
  const sheetHeight = useSharedValue(COLLAPSED_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Collapsible details state
  const [showDetails, setShowDetails] = useState(false);

  // Local state for filter
  const [filterValue, setFilterValue] = useState<DateRange>(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    periodPreset: '30d',
  }));

  // Balance adjustment state
  const [newBalance, setNewBalance] = useState('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const balanceAdjustSheetRef = useRef<BottomSheet>(null);
  const balanceSheetSnapPoints = useMemo(() => ['45%', '65%'], []);

  /**
   * getSmartBalance - Calculates the currently displayed balance to ensure precision
   * Matches logic used in Dashboard for consistency
   */
  const getSmartBalance = useCallback(() => {
    if (!stats) return 0;

    // 1. Prioritize backend-calculated base balance if currency matches anchor
    if (stats.baseBalance !== undefined && stats.baseCurrency === currencyCode) {
      return stats.baseBalance;
    }

    // 2. Secondary: If user has preserved original balance locally, calculate native amount
    if (
      user?.originalBalanceAmount !== undefined &&
      user?.originalBalanceAmount !== null &&
      user?.originalBalanceCurrency === currencyCode
    ) {
      const incomeNative = convertFromUSD(stats.totalIncome);
      const expensesNative = convertFromUSD(stats.totalExpenses);
      return user.originalBalanceAmount + incomeNative - expensesNative;
    }

    // 3. Fallback: Standard conversion from USD balance (stats.balance is in USD)
    return convertFromUSD(stats.balance);
  }, [stats, currencyCode, user, convertFromUSD]);

  const handleAdjustBalance = async () => {
    if (!newBalance || isNaN(parseFloat(newBalance))) {
      showInfo('Check Amount', 'Please double-check the balance amount entered.');
      return;
    }

    setIsAdjustingBalance(true);
    try {
      // Calculate current balance exactly as displayed
      const currentBalanceInDisplayCurrency = getSmartBalance();
      const newDisplayBalance = parseFloat(newBalance);

      // Calculate difference directly in display currency to avoid floating point noise
      const differenceInDisplayCurrency = newDisplayBalance - currentBalanceInDisplayCurrency;

      // Convert difference to USD for backend storage
      const differenceInUSD = convertToUSD(differenceInDisplayCurrency);

      // If difference is negligible in display currency (less than 0.01), just close
      if (Math.abs(differenceInDisplayCurrency) < 0.01) {
        balanceAdjustSheetRef.current?.close();
        return;
      }

      // Call backend to adjust balance via transaction
      await apiService.adjustBalanceByTransaction({
        amount: differenceInDisplayCurrency,
        currency: currencyCode,
        amountInUSD: differenceInUSD,
      });

      await forceRefresh();
      balanceAdjustSheetRef.current?.close();
      setNewBalance('');
      showSuccess('Success', 'Balance updated successfully! 🎉');
    } catch (error) {
      showError('Error', 'Failed to adjust balance');
      console.error(error);
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  const handleOpenBalanceAdjust = () => {
    if (stats) {
      // Use getSmartBalance to ensure pre-fill matches display exactly
      const displayBalance = getSmartBalance();
      // Format to 2 decimal places to ensure string parity with the input
      setNewBalance(displayBalance.toFixed(2));
      balanceAdjustSheetRef.current?.expand();
    }
  };

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);



  useFocusEffect(
    useCallback(() => {
      loadBalanceHistory();
    }, [loadBalanceHistory])
  );

  // Handle filter change
  const handleFilterChange = useCallback((newRange: DateRange) => {
    setFilterValue(newRange);
    updateDateRange({
      startDate: newRange.startDate,
      endDate: newRange.endDate,
    });
  }, [updateDateRange]);

  // Format period label (short version for bottom sheet header)
  const formatPeriodLabelShort = useMemo((): string => {
    if (filterValue.periodPreset && filterValue.periodPreset !== 'custom') {
      const labels: Record<string, string> = {
        '7d': '7 Days',
        '30d': '30 Days',
        '12w': '12 Weeks',
        '6m': '6 Months',
        '1y': '1 Year',
      };
      return labels[filterValue.periodPreset] || 'Custom';
    }
    return 'Custom';
  }, [filterValue.periodPreset]);

  // Toggle bottom sheet expanded state
  const toggleSheet = useCallback(() => {
    triggerHaptic();
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    sheetHeight.value = withTiming(newExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [isExpanded, sheetHeight, triggerHaptic]);

  // Toggle details visibility
  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerHaptic();
    setShowDetails(prev => !prev);
  }, [triggerHaptic]);

  // Pan gesture for dragging the bottom sheet
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newHeight = isExpanded
        ? EXPANDED_HEIGHT - event.translationY
        : COLLAPSED_HEIGHT - event.translationY;
      sheetHeight.value = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, newHeight));
    })
    .onEnd((event) => {
      const shouldExpand = isExpanded
        ? event.translationY < 50 || event.velocityY < -500
        : event.translationY < -30 || event.velocityY < -500;

      runOnJS(setIsExpanded)(shouldExpand);
      runOnJS(triggerHaptic)();
      sheetHeight.value = withTiming(shouldExpand ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    });

  // Animated styles for bottom sheet
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetHeight.value,
      [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const handleRotation = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          sheetHeight.value,
          [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
          [0, 180],
          Extrapolate.CLAMP
        )}deg`,
      },
    ],
  }));

  // Only show full loading screen when we have no cached data
  if (loading && !balanceData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <GradientHeader />
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your balance...
          </Text>
        </View>
      </View>
    );
  }

  if (!balanceData || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <GradientHeader />
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <PullToRefreshScrollView onRefresh={forceRefresh} contentContainerStyle={{ paddingBottom: EXPANDED_HEIGHT + 20 }}>
          <View style={styles.emptyContainer}>
            <Icon name="wallet-outline" size={80} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No balance data available
            </Text>
          </View>
        </PullToRefreshScrollView>

        {/* Bottom Sheet Filter */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom,
              },
              sheetAnimatedStyle,
            ]}
          >
            <TouchableOpacity style={styles.sheetHeader} onPress={toggleSheet} activeOpacity={0.7}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
              <View style={styles.sheetHeaderContent}>
                <View style={styles.sheetTitleRow}>
                  <Icon name="filter-variant" size={20} color={theme.primary} />
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    {formatPeriodLabelShort}
                  </Text>
                </View>
                <Animated.View style={handleRotation}>
                  <Icon name="chevron-up" size={24} color={theme.textSecondary} />
                </Animated.View>
              </View>
            </TouchableOpacity>
            <Animated.View style={[styles.sheetContent, contentOpacity]}>
              <DateRangeFilter value={filterValue} onChange={handleFilterChange} compact />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }

  const comparison = balanceData.comparison;
  const periodStats = balanceData.periodStats;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance Analytics</Text>
          {(refreshing || loading) && balanceData && (
            <ActivityIndicator size="small" color={theme.primary} style={styles.headerSpinner} />
          )}
        </View>
        <IconButton
          icon="pencil"
          size={20}
          onPress={handleOpenBalanceAdjust}
          containerStyle={{ width: 40, height: 40, backgroundColor: theme.surface }}
        />
      </View>

      <PullToRefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: EXPANDED_HEIGHT + 40 }]}
        onRefresh={forceRefresh}
      >
        {/* Hero Balance Card - Simplified */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={styles.heroCardContainer}>
            <LinearGradient
              colors={isDark 
                ? ['#1A3A52', '#0D2438', '#1E4A6F']
                : ['#4F46E5', '#4A90E2', '#0EA5E9']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroCard, elevation.md]}
            >
              {/* Period Badge */}
              <View style={styles.periodBadge}>
                <Icon name="calendar-range" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.periodBadgeText}>{formatPeriodLabelShort}</Text>
              </View>

              {/* Balance */}
              <View style={styles.balanceRow}>
                <View style={styles.balanceMain}>
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                  <NumberTicker
                    value={getSmartBalance()}
                    style={styles.balanceAmount}
                    prefix={getCurrencySymbol()}
                    decimalPlaces={showDecimals ? 2 : 0}
                  />
                </View>
                {comparison && (
                  <View style={styles.balanceChange}>
                    <View style={[
                      styles.balanceChangeBadge,
                      { backgroundColor: comparison.changes.balance >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }
                    ]}>
                      <Icon 
                        name={comparison.changes.balance >= 0 ? 'trending-up' : 'trending-down'} 
                        size={16} 
                        color={comparison.changes.balance >= 0 ? '#4ADE80' : '#F87171'} 
                      />
                      <Text style={[
                        styles.balanceChangeText,
                        { color: comparison.changes.balance >= 0 ? '#4ADE80' : '#F87171' }
                      ]}>
                        {Math.abs(comparison.changes.balance).toFixed(2)}%
                      </Text>
                    </View>
                    <Text style={styles.balanceChangeLabel}>vs prev period</Text>
                  </View>
                )}
              </View>

              {/* Projection Teaser */}
              {balanceData.projection && (
                <View style={styles.projectionTeaser}>
                  <Icon name="crystal-ball" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.projectionTeaserText}>
                    Month-end projection: {formatCurrency(balanceData.projection.endOfMonth)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quick Stats Row - Horizontal Scroll */}
        {periodStats && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickStatsScrollContent}
              style={styles.quickStatsScroll}
            >
              <View style={[styles.quickStatsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <StatItem 
                  label="Income" 
                  value={`+${formatCurrency(periodStats.totalIncome)}`}
                  valueColor={theme.success}
                  change={comparison?.changes.income}
                />
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <StatItem 
                  label="Expenses" 
                  value={`-${formatCurrency(periodStats.totalExpenses)}`}
                  valueColor={theme.expense}
                  change={comparison?.changes.expenses}
                  inverted
                />
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <StatItem 
                  label="Net" 
                  value={`${periodStats.netChange >= 0 ? '+' : ''}${formatCurrency(periodStats.netChange)}`}
                  valueColor={periodStats.netChange >= 0 ? theme.success : theme.expense}
                  change={comparison?.changes.netChange}
                />
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Balance Trend Chart */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <BalanceChart data={balanceData.dailyBalances} periodLabel={formatPeriodLabelShort} />
        </Animated.View>

        {/* Insights - Prominent placement */}
        {balanceData.insights && balanceData.insights.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <View style={styles.sectionHeader}>
              <Icon name="lightbulb-outline" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
            </View>
            <BalanceInsightCard insights={balanceData.insights} />
          </Animated.View>
        )}

        {/* Expandable Details Section */}
        {comparison && periodStats && (
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <TouchableOpacity 
              style={[
                styles.detailsToggle, 
                { backgroundColor: theme.card, borderColor: theme.border },
                showDetails && styles.detailsToggleExpanded,
              ]}
              onPress={toggleDetails}
              activeOpacity={0.7}
            >
              <View style={styles.detailsToggleLeft}>
                <Icon name="chart-box-outline" size={20} color={theme.primary} />
                <Text style={[styles.detailsToggleText, { color: theme.text }]}>
                  Period Comparison
                </Text>
              </View>
              <View style={styles.detailsToggleRight}>
                <Text style={[styles.detailsToggleHint, { color: theme.textTertiary }]}>
                  {periodStats.transactionCount} transactions
                </Text>
                <Icon 
                  name={showDetails ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={theme.textSecondary} 
                />
              </View>
            </TouchableOpacity>

            {/* Collapsible Details Content */}
            {showDetails && (
              <View style={[styles.detailsContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
                  {comparison.currentLabel} vs {comparison.previousLabel}
                </Text>
                
                <View style={styles.detailsGrid}>
                  <View style={styles.detailsItem}>
                    <Text style={[styles.detailsItemLabel, { color: theme.textTertiary }]}>Transactions</Text>
                    <View style={styles.detailsItemRow}>
                      <Text style={[styles.detailsItemValue, { color: theme.text }]}>
                        {periodStats.transactionCount}
                      </Text>
                      <ChangeIndicator value={comparison.changes.transactions} size="md" />
                    </View>
                    <Text style={[styles.detailsItemPrev, { color: theme.textTertiary }]}>
                      Prev: {comparison.previousPeriod.transactionCount}
                    </Text>
                  </View>

                  <View style={styles.detailsItem}>
                    <Text style={[styles.detailsItemLabel, { color: theme.textTertiary }]}>End Balance</Text>
                    <View style={styles.detailsItemRow}>
                      <Text style={[styles.detailsItemValue, { color: theme.text }]}>
                        {compactCurrency(periodStats.endBalance)}
                      </Text>
                      <ChangeIndicator value={comparison.changes.balance} size="md" />
                    </View>
                    <Text style={[styles.detailsItemPrev, { color: theme.textTertiary }]}>
                      Prev: {compactCurrency(comparison.previousPeriod.endBalance)}
                    </Text>
                  </View>

                  <View style={styles.detailsItem}>
                    <Text style={[styles.detailsItemLabel, { color: theme.textTertiary }]}>Avg Daily</Text>
                    <View style={styles.detailsItemRow}>
                      <Text style={[styles.detailsItemValue, { color: theme.text }]}>
                        {compactCurrency(periodStats.averageDailySpending)}
                      </Text>
                      <ChangeIndicator value={comparison.changes.avgSpending} inverted size="md" />
                    </View>
                    <Text style={[styles.detailsItemPrev, { color: theme.textTertiary }]}>
                      Rate: {compactCurrency(balanceData.projection?.dailySpendingRate || 0)}/d
                    </Text>
                  </View>

                  <View style={styles.detailsItem}>
                    <Text style={[styles.detailsItemLabel, { color: theme.textTertiary }]}>Savings</Text>
                    <View style={styles.detailsItemRow}>
                      <Text style={[
                        styles.detailsItemValue, 
                        { color: periodStats.netChange >= 0 ? theme.success : theme.expense }
                      ]}>
                        {periodStats.totalIncome > 0 
                          ? `${Math.round((periodStats.netChange / periodStats.totalIncome) * 100)}%`
                          : 'N/A'
                        }
                      </Text>
                    </View>
                    <Text style={[styles.detailsItemPrev, { color: theme.textTertiary }]}>
                      of income
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        )}

      </PullToRefreshScrollView>

      {/* Bottom Sheet Filter */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom,
            },
            sheetAnimatedStyle,
          ]}
        >
          <TouchableOpacity style={styles.sheetHeader} onPress={toggleSheet} activeOpacity={0.7}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeaderContent}>
              <View style={styles.sheetTitleRow}>
                <Icon name="filter-variant" size={20} color={theme.primary} />
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  {formatPeriodLabelShort}
                </Text>
              </View>
              <Animated.View style={handleRotation}>
                <Icon name="chevron-up" size={24} color={theme.textSecondary} />
              </Animated.View>
            </View>
          </TouchableOpacity>
          <Animated.View style={[styles.sheetContent, contentOpacity]}>
            <DateRangeFilter value={filterValue} onChange={handleFilterChange} compact />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

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
    </View>
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
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpinner: {
    marginLeft: spacing.xs,
  },
  scrollContent: {
    paddingTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
  },

  // Hero Card Styles
  heroCardContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  periodBadgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceMain: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceChange: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  balanceChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  balanceChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceChangeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  projectionTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  projectionTeaserText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  // Quick Stats - Horizontal Scroll
  quickStatsScroll: {
    marginBottom: spacing.md,
  },
  quickStatsScrollContent: {
    paddingHorizontal: spacing.md,
  },
  quickStatsCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  currencyInputField: {
    paddingVertical: spacing.md,
  },
  statItem: {
    minWidth: 110,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },

  // Change Indicator
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  changeText: {
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Details Toggle
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  detailsToggleExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  detailsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailsToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsToggleHint: {
    fontSize: 12,
  },

  // Details Content
  detailsContent: {
    marginHorizontal: spacing.md,
    marginTop: -1,
    padding: spacing.sm,
    paddingTop: spacing.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  detailsSubtitle: {
    fontSize: 11,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailsItem: {
    width: '48%',
    padding: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  detailsItemLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailsItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsItemPrev: {
    fontSize: 10,
    marginTop: 2,
  },

  // Bottom Sheet Styles
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    ...elevation.lg,
  },
  sheetHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetContent: {
    flex: 1,
  },
});

export default BalanceHistoryScreen;
