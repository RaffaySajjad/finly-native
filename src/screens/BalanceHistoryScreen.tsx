/**
 * BalanceHistoryScreen - Balance History & Insights
 * Purpose: Shows balance trends, projections, and actionable insights
 * Features: Balance trend chart, cash flow forecast, savings analysis, date filters, period comparison
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { PullToRefreshScrollView } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useBalanceHistory, ComparisonStats } from '../hooks/useBalanceHistory';
import { BalanceChart } from '../components/charts/BalanceChart';
import { BalanceInsightCard } from '../components/trends/BalanceInsightCard';
import { DateRangeFilter, DateRange } from '../components/filters/DateRangeFilter';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom sheet snap points
const COLLAPSED_HEIGHT = 80; // Just shows the handle and period label
const EXPANDED_HEIGHT = 220; // Full filter view

/**
 * PercentageChange - Displays percentage change with icon and color
 */
interface PercentageChangeProps {
  value: number;
  size?: 'small' | 'medium' | 'large';
  inverted?: boolean; // For expenses, lower is better
  showLabel?: boolean;
  labelStyle?: 'badge' | 'inline';
}

const PercentageChange: React.FC<PercentageChangeProps> = ({
  value,
  size = 'small',
  inverted = false,
  showLabel = true,
  labelStyle = 'inline',
}) => {
  const { theme } = useTheme();

  // Determine if this is positive (good) or negative (bad)
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;

  const color = isNeutral
    ? theme.textTertiary
    : isPositive
      ? theme.success
      : theme.expense;

  const iconName = isNeutral
    ? 'minus'
    : value > 0
      ? 'arrow-up'
      : 'arrow-down';

  const fontSize = size === 'large' ? 14 : size === 'medium' ? 12 : 10;
  const iconSize = size === 'large' ? 14 : size === 'medium' ? 12 : 10;

  const formattedValue = Math.abs(value).toFixed(1);

  if (labelStyle === 'badge') {
    return (
      <View style={[
        styles.percentBadge,
        { backgroundColor: color + '20' }
      ]}>
        <Icon name={iconName} size={iconSize} color={color} />
        <Text style={[styles.percentText, { color, fontSize }]}>
          {formattedValue}%
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.percentInline}>
      <Icon name={iconName} size={iconSize} color={color} />
      <Text style={[styles.percentText, { color, fontSize }]}>
        {formattedValue}%
        {showLabel && (
          <Text style={{ color: theme.textTertiary, fontSize: fontSize - 2 }}>
            {' '}vs prev
          </Text>
        )}
      </Text>
    </View>
  );
};

const BalanceHistoryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
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

  // Local state for filter
  const [filterValue, setFilterValue] = useState<DateRange>(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    periodPreset: '30d',
  }));

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  // Format period label (full version)
  const formatPeriodLabel = (): string => {
    if (filterValue.periodPreset && filterValue.periodPreset !== 'custom') {
      const labels: Record<string, string> = {
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        '12w': 'Last 12 Weeks',
        '6m': 'Last 6 Months',
        '1y': 'Last Year',
      };
      return labels[filterValue.periodPreset] || 'Custom Period';
    }
    return 'Custom Period';
  };

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

  // Get comparison label for previous period
  const getComparisonLabel = (): string => {
    if (balanceData?.comparison) {
      return `vs ${balanceData.comparison.previousLabel}`;
    }
    return 'vs previous period';
  };

  // Only show full loading screen when we have no cached data
  if (loading && !balanceData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your balance...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!balanceData || !stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance History</Text>
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

        {/* Bottom Sheet Filter - also shown on empty state */}
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
            <TouchableOpacity
              style={styles.sheetHeader}
              onPress={toggleSheet}
              activeOpacity={0.7}
            >
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
              <DateRangeFilter
                value={filterValue}
                onChange={handleFilterChange}
                compact
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    );
  }

  const comparison = balanceData.comparison;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Balance History</Text>
          {(refreshing || loading) && balanceData && (
            <ActivityIndicator size="small" color={theme.primary} style={styles.headerSpinner} />
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <PullToRefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: EXPANDED_HEIGHT + 20 }]}
        onRefresh={forceRefresh}
      >
        {/* Period Label with Comparison */}
        <View style={styles.periodLabelContainer}>
          <Text style={[styles.periodLabel, { color: theme.textSecondary }]}>
            {formatPeriodLabel()}
          </Text>
          {comparison && (
            <Text style={[styles.comparisonLabel, { color: theme.textTertiary }]}>
              {getComparisonLabel()}
            </Text>
          )}
        </View>

        {/* Current Balance Card */}
        <View style={styles.currentBalanceCardContainer}>
          <View style={[styles.currentBalanceCard, elevation.md]}>
            <LinearGradient
              colors={isDark 
                ? ['#1E4A6F', '#0F2E4A', '#2E5F8F']
                : [theme.primary, theme.primaryDark, theme.primaryLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <View style={styles.balanceHeader}>
                <Text style={styles.currentBalanceLabel}>Current Balance</Text>
                {comparison && (
                  <View style={styles.balanceChangeContainer}>
                    <PercentageChange
                      value={comparison.changes.balance}
                      size="medium"
                      showLabel={false}
                      labelStyle="badge"
                    />
                  </View>
                )}
              </View>
              <Text style={styles.currentBalanceAmount}>
                {formatCurrency(stats.balance)}
              </Text>

              <View style={styles.balanceBreakdown}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Income</Text>
                    {comparison && (
                      <PercentageChange
                        value={comparison.changes.income}
                        size="small"
                        showLabel={false}
                      />
                    )}
                  </View>
                  <Text style={[styles.breakdownValue, { color: '#4ADE80' }]}>
                    +{formatCurrency(balanceData.periodStats?.totalIncome || stats.totalIncome)}
                  </Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Expenses</Text>
                    {comparison && (
                      <PercentageChange
                        value={comparison.changes.expenses}
                        size="small"
                        inverted={true}
                        showLabel={false}
                      />
                    )}
                  </View>
                  <Text style={[styles.breakdownValue, { color: '#F87171' }]}>
                    -{formatCurrency(balanceData.periodStats?.totalExpenses || stats.totalExpenses)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Period Stats Summary with Comparison */}
        {balanceData.periodStats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: theme.success + '20' }]}>
                  <Icon name="trending-up" size={18} color={theme.success} />
                </View>
                {comparison && (
                  <PercentageChange
                    value={comparison.changes.netChange}
                    size="small"
                    showLabel={false}
                  />
                )}
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Net Change</Text>
              <Text style={[
                styles.statValue,
                { color: balanceData.periodStats.netChange >= 0 ? theme.success : theme.expense }
              ]}>
                {balanceData.periodStats.netChange >= 0 ? '+' : ''}
                {formatCurrency(balanceData.periodStats.netChange)}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: theme.warning + '20' }]}>
                  <Icon name="calculator" size={18} color={theme.warning} />
                </View>
                {comparison && (
                  <PercentageChange
                    value={comparison.changes.avgSpending}
                    size="small"
                    inverted={true}
                    showLabel={false}
                  />
                )}
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Daily</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatCurrency(balanceData.periodStats.averageDailySpending)}/day
              </Text>
            </View>
          </View>
        )}

        {/* Period Comparison Summary Card */}
        {comparison && (
          <View style={[
            styles.comparisonCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
          ]}>
            <View style={styles.comparisonHeader}>
              <Icon name="compare-horizontal" size={20} color={theme.primary} />
              <Text style={[styles.comparisonTitle, { color: theme.text }]}>
                Period Comparison
              </Text>
            </View>
            <Text style={[styles.comparisonSubtitle, { color: theme.textSecondary }]}>
              Comparing {balanceData.comparison?.currentLabel} with {balanceData.comparison?.previousLabel}
            </Text>

            <View style={styles.comparisonGrid}>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonItemLabel, { color: theme.textTertiary }]}>
                  Transactions
                </Text>
                <View style={styles.comparisonItemValue}>
                  <Text style={[styles.comparisonItemNumber, { color: theme.text }]}>
                    {balanceData.periodStats.transactionCount}
                  </Text>
                  <PercentageChange
                    value={comparison.changes.transactions}
                    size="small"
                    showLabel={false}
                  />
                </View>
                <Text style={[styles.comparisonItemPrev, { color: theme.textTertiary }]}>
                  prev: {comparison.previousPeriod.transactionCount}
                </Text>
              </View>

              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonItemLabel, { color: theme.textTertiary }]}>
                  Income
                </Text>
                <View style={styles.comparisonItemValue}>
                  <Text style={[styles.comparisonItemNumber, { color: theme.success }]}>
                    {formatCurrency(balanceData.periodStats.totalIncome)}
                  </Text>
                  <PercentageChange
                    value={comparison.changes.income}
                    size="small"
                    showLabel={false}
                  />
                </View>
                <Text style={[styles.comparisonItemPrev, { color: theme.textTertiary }]}>
                  prev: {formatCurrency(comparison.previousPeriod.totalIncome)}
                </Text>
              </View>

              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonItemLabel, { color: theme.textTertiary }]}>
                  Expenses
                </Text>
                <View style={styles.comparisonItemValue}>
                  <Text style={[styles.comparisonItemNumber, { color: theme.expense }]}>
                    {formatCurrency(balanceData.periodStats.totalExpenses)}
                  </Text>
                  <PercentageChange
                    value={comparison.changes.expenses}
                    size="small"
                    inverted={true}
                    showLabel={false}
                  />
                </View>
                <Text style={[styles.comparisonItemPrev, { color: theme.textTertiary }]}>
                  prev: {formatCurrency(comparison.previousPeriod.totalExpenses)}
                </Text>
              </View>

              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonItemLabel, { color: theme.textTertiary }]}>
                  End Balance
                </Text>
                <View style={styles.comparisonItemValue}>
                  <Text style={[styles.comparisonItemNumber, { color: theme.text }]}>
                    {formatCurrency(balanceData.periodStats.endBalance)}
                  </Text>
                  <PercentageChange
                    value={comparison.changes.balance}
                    size="small"
                    showLabel={false}
                  />
                </View>
                <Text style={[styles.comparisonItemPrev, { color: theme.textTertiary }]}>
                  prev: {formatCurrency(comparison.previousPeriod.endBalance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Projection Card */}
        <View
          style={[
            styles.card,
            styles.projectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            elevation.sm,
          ]}
        >
          <View style={styles.projectionHeader}>
            <View style={[
              styles.projectionIconContainer,
              {
                backgroundColor: balanceData.projection.isPositive ? theme.success + '20' : theme.expense + '20',
              }
            ]}>
              <Icon
                name={balanceData.projection.isPositive ? 'trending-up' : 'trending-down'}
                size={20}
                color={balanceData.projection.isPositive ? theme.success : theme.expense}
              />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {balanceData.projection.daysRemaining > 0 ? 'Month End Projection' : 'Period End Balance'}
            </Text>
          </View>
          <Text style={[
            styles.projectionAmount,
            { color: balanceData.projection.isPositive ? theme.success : theme.expense },
          ]}>
            {formatCurrency(balanceData.projection.endOfMonth)}
          </Text>
          <Text style={[styles.projectionSubtext, { color: theme.textSecondary }]}>
            Based on your spending rate of {formatCurrency(balanceData.projection.dailySpendingRate)}/day
          </Text>
          {balanceData.projection.daysRemaining > 0 && (
            <Text style={[styles.projectionSubtext, { color: theme.textSecondary }]}>
              {balanceData.projection.daysRemaining} days remaining this month
            </Text>
          )}
        </View>

        {/* Balance Trend Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Balance Trend</Text>
            {comparison && (
              <View style={styles.chartChange}>
                <PercentageChange
                  value={comparison.changes.balance}
                  size="medium"
                  showLabel={true}
                  labelStyle="badge"
                />
              </View>
            )}
          </View>
          <BalanceChart data={balanceData.dailyBalances} periodLabel={formatPeriodLabelShort} />
        </View>

        {/* Insights */}
        {balanceData.insights && balanceData.insights.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
            <BalanceInsightCard insights={balanceData.insights} />
          </>
        )}

        {/* Transaction Count */}
        {balanceData.periodStats && (
          <View style={[styles.transactionSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="swap-horizontal" size={20} color={theme.primary} />
            <Text style={[styles.transactionSummaryText, { color: theme.textSecondary }]}>
              {balanceData.periodStats.transactionCount} transactions in this period
            </Text>
            {comparison && (
              <PercentageChange
                value={comparison.changes.transactions}
                size="small"
                showLabel={false}
              />
            )}
          </View>
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
          {/* Handle Bar */}
          <TouchableOpacity
            style={styles.sheetHeader}
            onPress={toggleSheet}
            activeOpacity={0.7}
          >
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

          {/* Filter Content */}
          <Animated.View style={[styles.sheetContent, contentOpacity]}>
            <DateRangeFilter
              value={filterValue}
              onChange={handleFilterChange}
              compact
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
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
    paddingBottom: spacing.xl,
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
  periodLabelContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  currentBalanceCardContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  currentBalanceCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradientCard: {
    padding: spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  currentBalanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentBalanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.lg,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.sm,
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  breakdownValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xs,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Comparison Card Styles
  comparisonCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonSubtitle: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  comparisonItem: {
    width: '48%',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
  },
  comparisonItemLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comparisonItemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comparisonItemNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonItemPrev: {
    fontSize: 10,
    marginTop: 2,
  },
  // Percentage Change Styles
  percentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  percentInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  percentText: {
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  projectionCard: {
    marginTop: spacing.sm,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  projectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  projectionAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  projectionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  chartSection: {
    marginTop: spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chartChange: {
    marginRight: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  transactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  transactionSummaryText: {
    fontSize: 14,
  },
});

export default BalanceHistoryScreen;
