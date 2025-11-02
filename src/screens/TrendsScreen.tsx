/**
 * TrendsScreen - Spending Trends & Analytics
 * Purpose: Visualize spending patterns with charts and insights
 * Features: Line charts, bar charts, trend analysis
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/api';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AIAssistantFAB } from '../components';

const { width } = Dimensions.get('window');

interface TrendsData {
  dailySpending: Array<{ date: string; amount: number }>;
  categoryTotals: Array<{ category: string; amount: number; color: string }>;
  weeklyComparison: { thisWeek: number; lastWeek: number; percentChange: number };
  topCategory: { name: string; amount: number; emoji: string };
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadTrendsData();
    }, [])
  );

  useEffect(() => {
    if (trendsData) {
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
  }, [trendsData]);

  const loadTrendsData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSpendingTrends();
      setTrendsData(data);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your spending...
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
    color: (opacity = 1) => theme.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    labelColor: (opacity = 1) => theme.textSecondary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Spending Trends</Text>
        <TouchableOpacity onPress={loadTrendsData}>
          <Icon name="refresh" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
          <Text style={[styles.chartTitle, { color: theme.text }]}>Last 7 Days</Text>
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

        {/* Category Breakdown List */}
        <View style={styles.categoryList}>
          <Text style={[styles.listTitle, { color: theme.text }]}>All Categories</Text>
          {trendsData.categoryTotals.map((cat, index) => {
            const total = trendsData.categoryTotals.reduce((sum, c) => sum + c.amount, 0);
            const percentage = total > 0 ? (cat.amount / total) * 100 : 0;

            return (
              <Animated.View
                key={cat.category}
                style={[
                  styles.categoryItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  elevation.sm,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 50 + index * 10],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>{cat.category}</Text>
                  <Text style={[styles.categoryPercentage, { color: theme.textSecondary }]}>
                    {percentage.toFixed(1)}% of total
                  </Text>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.text }]}>
                  {formatCurrency(cat.amount)}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  headerTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
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
    marginBottom: spacing.md,
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
  chartTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  categoryList: {
    marginTop: spacing.md,
  },
  listTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPercentage: {
    ...typography.caption,
  },
  categoryAmount: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
});

export default TrendsScreen;

