/**
 * TrendsScreen - Spending Trends & Analytics
 * Purpose: Visualize spending patterns with charts and AI-driven insights
 * Features: Line charts, bar charts, trend analysis, AI insights, spending forecast
 */

import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PullToRefreshScrollView } from '../components';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/api';
import { borderRadius, elevation, spacing, typography } from '../theme';

const { width } = Dimensions.get('window');

interface TrendsData {
  dailySpending: Array<{ date: string; amount: number }>;
  categoryTotals: Array<{ category: string; amount: number; color: string }>;
  weeklyComparison: { thisWeek: number; lastWeek: number; percentChange: number };
  topCategory: { name: string; amount: number; emoji: string };
}

interface ForecastData {
  predictedAmount: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  rateLimit?: {
    remaining: number;
    resetAt: number;
  };
}

/**
 * TrendsScreen - Analytics and trends visualization
 */
const TrendsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, convertFromUSD, convertToUSD } = useCurrency();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{ date: string; amount: number; index: number } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // Scroll to top when tab is pressed while already on this screen
  useScrollToTopOnTabPress(scrollViewRef);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [trends, forecastData] = await Promise.all([
        apiService.getSpendingTrends(forceRefresh), // Skip cache on force refresh
        apiService.getSpendingForecast(forceRefresh),
      ]);

      setTrendsData(trends);
      setForecast(forecastData);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your finances...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trendsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="chart-line-variant" size={80} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No trend data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare line chart data based on timeRange selection
  // Convert amounts from USD (base currency) to display currency for chart
  const now = new Date();
  const getFilteredDailySpending = () => {
    if (timeRange === 'week') {
      // Last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return trendsData.dailySpending.filter(d => {
        const date = new Date(d.date);
        return date >= sevenDaysAgo;
      });
    } else {
      // Last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return trendsData.dailySpending.filter(d => {
        const date = new Date(d.date);
        return date >= thirtyDaysAgo;
      });
    }
  };

  const filteredDailySpending = getFilteredDailySpending();
  const lineChartData = {
    labels: filteredDailySpending.map(d => {
      const date = new Date(d.date);
      // Format as "MM/DD" for better clarity
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    }),
    datasets: [
      {
        // Convert amounts from USD to display currency so chart scales correctly
        data: filteredDailySpending.map(d => convertFromUSD(d.amount)),
        color: (opacity = 1) => theme.primary,
        strokeWidth: 3,
      },
    ],
  };

  // Handle chart data point selection for tooltip
  const handleChartPress = (event: any) => {
    if (!filteredDailySpending.length) return;

    // Calculate which data point was tapped based on touch position
    // This is approximate - react-native-chart-kit doesn't provide exact data point click
    const chartWidth = width - 64;
    const touchX = event.nativeEvent.locationX;
    const dataPointIndex = Math.round((touchX / chartWidth) * (filteredDailySpending.length - 1));
    const clampedIndex = Math.max(0, Math.min(filteredDailySpending.length - 1, dataPointIndex));

    const selectedPoint = filteredDailySpending[clampedIndex];
    setSelectedDataPoint({
      date: selectedPoint.date,
      amount: selectedPoint.amount,
      index: clampedIndex,
    });

    // Position tooltip near the tap location
    setTooltipPosition({
      x: touchX,
      y: event.nativeEvent.locationY - 60, // Offset above touch point
    });
  };

  // Close tooltip when tapping outside
  const handleCloseTooltip = () => {
    setSelectedDataPoint(null);
    setTooltipPosition(null);
  };

  // Prepare bar chart data
  // Convert amounts from USD (base currency) to display currency for chart
  const barChartData = {
    labels: trendsData.categoryTotals.slice(0, 5).map(c => c.category.substring(0, 3)),
    datasets: [
      {
        // Convert amounts from USD to display currency so chart scales correctly
        data: trendsData.categoryTotals.slice(0, 5).map(c => convertFromUSD(c.amount)),
      },
    ],
  };

  const currencySymbol = getCurrencySymbol();

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.primary,
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.border,
      strokeWidth: 1,
    },
    formatYLabel: (value: string) => {
      // Format y-axis labels with abbreviations starting at 1000 to save space
      // Chart data is already converted to display currency
      // Remove any existing currency symbol or formatting from the value string
      const cleanValue = value.replace(/[^\d.-]/g, '');
      const numValue = parseFloat(cleanValue);
      if (isNaN(numValue)) return value;

      const absValue = Math.abs(numValue);
      const sign = numValue < 0 ? '-' : '';

      // Use abbreviations starting at 1000 for y-axis labels (more compact than formatCurrency's 100k threshold)
      if (absValue >= 1000000000) {
        const billions = absValue / 1000000000;
        return `${sign}${currencySymbol}${billions.toFixed(1)}B`;
      }
      if (absValue >= 1000000) {
        const millions = absValue / 1000000;
        return `${sign}${currencySymbol}${millions.toFixed(1)}M`;
      }
      if (absValue >= 1000) {
        const thousands = absValue / 1000;
        return `${sign}${currencySymbol}${thousands.toFixed(1)}k`;
      }

      // For values < 1000, show full number without decimals for compactness
      return `${sign}${currencySymbol}${Math.round(numValue)}`;
    },
  };

  const { weeklyComparison, topCategory } = trendsData;
  const isIncreased = weeklyComparison.percentChange > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]}>Trends</Text>
          </View>
        </View>
      </View>

      <PullToRefreshScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onRefresh={() => loadData(true)} // Skip cache on pull-to-refresh
        refreshing={refreshing}
        onScrollBeginDrag={handleCloseTooltip}
      >
        {/* Spending Forecast Card */}
        {forecast && (
          <Animated.View
            style={[
              styles.forecastCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              elevation.sm,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Icon name="crystal-ball" size={20} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Next Week Forecast</Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.confidenceBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.confidenceText, { color: theme.primary }]}>
                  {forecast.confidence.toUpperCase()} CONFIDENCE
                </Text>
              </View>
              {forecast.rateLimit && forecast.rateLimit.remaining === 0 && (
                <View style={[styles.rateLimitBadge, { backgroundColor: theme.expense + '20' }]}>
                  <Text style={[styles.rateLimitText, { color: theme.expense }]}>
                    AI Forecast Limit Reached
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.forecastAmount, { color: theme.text }]}>
              ~{formatCurrency(forecast.predictedAmount)}
            </Text>
            <Text style={[styles.forecastSubtext, { color: theme.textSecondary }]}>
              Predicted spending based on your recent habits
            </Text>
          </Animated.View>
        )}

        {/* Weekly Comparison Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Comparison</Text>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: isIncreased ? theme.expense + '20' : theme.income + '20' },
              ]}
            >
              <Icon
                name={isIncreased ? 'trending-up' : 'trending-down'}
                size={16}
                color={isIncreased ? theme.expense : theme.income}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: isIncreased ? theme.expense : theme.income },
                ]}
              >
                {Math.abs(weeklyComparison.percentChange)}%
              </Text>
            </View>
          </View>

          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>This Week</Text>
              <Text style={[styles.comparisonValue, { color: theme.text }]}>
                {formatCurrency(weeklyComparison.thisWeek)}
              </Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Last Week</Text>
              <Text style={[styles.comparisonValue, { color: theme.text }]}>
                {formatCurrency(weeklyComparison.lastWeek)}
              </Text>
            </View>
          </View>

          <Text style={[styles.comparisonInsight, { color: theme.textSecondary }]}>
            {isIncreased
              ? `You spent ${weeklyComparison.percentChange}% more than last week`
              : `Great! You saved ${Math.abs(weeklyComparison.percentChange)}% compared to last week`}
          </Text>
        </Animated.View>

        {/* Top Category Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.topCategoryContent}>
            <Text style={styles.topCategoryEmoji}>{topCategory.emoji}</Text>
            <View style={styles.topCategoryText}>
              <Text style={[styles.topCategoryLabel, { color: theme.textSecondary }]}>
                Most spent on
              </Text>
              <Text style={[styles.topCategoryName, { color: theme.text }]}>
                {topCategory.name}
              </Text>
              <Text style={[styles.topCategoryAmount, { color: theme.primary }]}>
                {formatCurrency(topCategory.amount)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Daily Spending Line Chart */}
        <Animated.View
          style={[
            styles.chartCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Spending History</Text>
            <View style={styles.timeRangeContainer}>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === 'week' && { backgroundColor: theme.primary + '20' }]}
                onPress={() => setTimeRange('week')}
              >
                <Text style={[
                  styles.timeRangeText,
                  { color: timeRange === 'week' ? theme.primary : theme.textSecondary }
                ]}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === 'month' && { backgroundColor: theme.primary + '20' }]}
                onPress={() => setTimeRange('month')}
              >
                <Text style={[
                  styles.timeRangeText,
                  { color: timeRange === 'month' ? theme.primary : theme.textSecondary }
                ]}>Month</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Axis Labels */}
          <View style={styles.axisLabelsContainer}>
            <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>Date</Text>
            <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>Amount ({currencySymbol})</Text>
          </View>

          <View style={styles.chartContainer}>
            <TouchableOpacity activeOpacity={1} onPress={handleChartPress}>
              <LineChart
                data={lineChartData}
                width={width - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines
                withOuterLines
                withVerticalLabels
                withHorizontalLabels
                withDots
                withShadow={false}
                fromZero
                yAxisSuffix=""
              />
            </TouchableOpacity>

            {/* Interactive Tooltip */}
            {selectedDataPoint && tooltipPosition && (
              <View
                style={[
                  styles.tooltip,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    left: Math.max(10, Math.min(tooltipPosition.x - 60, width - 140)),
                    top: Math.max(10, Math.min(tooltipPosition.y, 150)),
                  },
                  elevation.md,
                ]}
              >
                <TouchableOpacity
                  style={styles.tooltipCloseButton}
                  onPress={handleCloseTooltip}
                >
                  <Icon name="close" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
                  {new Date(selectedDataPoint.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={[styles.tooltipAmount, { color: theme.text }]}>
                  {formatCurrency(selectedDataPoint.amount)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Category Bar Chart */}
        <Animated.View
          style={[
            styles.chartCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.chartTitle, { color: theme.text }]}>Top Categories</Text>
          <BarChart
            data={barChartData}
            width={width - 64}
            height={220}
            yAxisLabel={currencySymbol}
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              barPercentage: 0.7,
            }}
            style={styles.chart}
            withInnerLines
            showValuesOnTopOfBars
            fromZero
          />
        </Animated.View>

        <View style={{ height: Platform.OS === 'ios' ? spacing.xxxl : spacing.xxl }} />
      </PullToRefreshScrollView>
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
  loadingText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
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
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  insightsList: {
    paddingRight: spacing.lg,
    marginBottom: spacing.lg,
  },
  insightCard: {
    width: width - 80,
    marginRight: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightDescription: {
    ...typography.bodySmall,
  },
  forecastCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    ...typography.labelSmall,
    fontWeight: '700',
    fontSize: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  rateLimitBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  rateLimitText: {
    ...typography.labelSmall,
    fontWeight: '700',
    fontSize: 10,
  },
  forecastAmount: {
    ...typography.displaySmall,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  forecastSubtext: {
    ...typography.bodySmall,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  changeText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  comparisonLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  comparisonValue: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  comparisonInsight: {
    ...typography.bodySmall,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  topCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  topCategoryEmoji: {
    fontSize: 48,
  },
  topCategoryText: {
    flex: 1,
  },
  topCategoryLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  topCategoryName: {
    ...typography.titleLarge,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  topCategoryAmount: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  chartTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeRangeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  timeRangeText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  chartContainer: {
    position: 'relative',
    width: '100%',
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  axisLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  axisLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  tooltip: {
    position: 'absolute',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 120,
    zIndex: 1000,
  },
  tooltipCloseButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    padding: 2,
  },
  tooltipDate: {
    ...typography.caption,
    marginBottom: spacing.xs,
    marginRight: spacing.md,
  },
  tooltipAmount: {
    ...typography.titleSmall,
    fontWeight: '600',
  },
});

export default TrendsScreen;
