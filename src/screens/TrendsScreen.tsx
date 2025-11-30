/**
 * TrendsScreen - Spending Trends & Analytics
 * Purpose: Visualize spending patterns with charts and AI-driven insights
 * Features: Line charts, bar charts, trend analysis, AI insights, spending forecast
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/api';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { PullToRefreshScrollView } from '../components';
import { Insight } from '../types';

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
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

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
        apiService.getSpendingTrends(),
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

  const renderInsightItem = ({ item }: { item: Insight }) => (
    <View
      style={[
        styles.insightCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={[styles.insightIconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.insightDescription, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </View>
  );

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

  // Prepare line chart data
  const last7Days = trendsData.dailySpending.slice(-7);
  const lineChartData = {
    labels: last7Days.map(d => {
      const date = new Date(d.date);
      return date.getDate().toString();
    }),
    datasets: [
      {
        data: last7Days.map(d => d.amount),
        color: (opacity = 1) => theme.primary,
        strokeWidth: 3,
      },
    ],
  };

  // Prepare bar chart data
  const barChartData = {
    labels: trendsData.categoryTotals.slice(0, 5).map(c => c.category.substring(0, 3)),
    datasets: [
      {
        data: trendsData.categoryTotals.slice(0, 5).map(c => c.amount),
      },
    ],
  };

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
  };

  const { weeklyComparison, topCategory } = trendsData;
  const isIncreased = weeklyComparison.percentChange > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        {/* <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity> */}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Spending Trends</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          disabled={refreshing || (forecast?.rateLimit?.remaining === 0)}
        >
          <Icon
            name="refresh"
            size={24}
            color={
              refreshing || (forecast?.rateLimit?.remaining === 0)
                ? theme.textTertiary
                : theme.primary
            }
          />
        </TouchableOpacity>
      </View>

      <PullToRefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onRefresh={() => loadData(false)}
        refreshing={refreshing}
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
          />
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
            yAxisLabel="$"
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

        <View style={{ height: 100 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    left: spacing.md,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
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
  chart: {
    borderRadius: borderRadius.md,
  },
});

export default TrendsScreen;
