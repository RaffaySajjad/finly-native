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
import * as Haptics from 'expo-haptics';
import { SpendingChart } from '../components/charts/SpendingChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { ForecastCard } from '../components/trends/ForecastCard';
import { WeeklyComparisonCard } from '../components/trends/WeeklyComparisonCard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '../components/GradientHeader';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PullToRefreshScrollView } from '../components';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/api';
import { borderRadius, elevation, spacing, typography } from '../theme';
import { springPresets } from '../theme/AnimationConfig';

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
  const insets = useSafeAreaInsets();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  // We don't need formatCurrency here as it's passed to children or used inside them
  // but we might need it for top level stuff if any.
  // Actually the logic for filteredDailySpending etc moves to child or simplifies here.

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const hasAnimated = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useScrollToTopOnTabPress(scrollViewRef);

  useEffect(() => {
    if (trendsData && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [trendsData]);

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        if (!trendsData) setLoading(true);
      }

      const [trends, forecastData] = await Promise.all([
        apiService.getSpendingTrends(forceRefresh),
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

  const getFilteredSpending = () => {
    if (!trendsData) return [];
    const now = new Date();
    const days = timeRange === 'week' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return trendsData.dailySpending.filter(d => new Date(d.date) >= cutoff);
  };

  if (loading && !trendsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
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
        <View style={styles.centerContainer}>
          <Icon name="chart-line-variant" size={60} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No trend data available</Text>
          <TouchableOpacity onPress={() => loadData(true)} style={styles.retryButton}>
            <Text style={{ color: theme.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Trends</Text>
      </View>

      <PullToRefreshScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Forecast */}
          {forecast && <ForecastCard data={forecast} />}

          {/* Weekly Comparison */}
          <WeeklyComparisonCard data={trendsData.weeklyComparison} />

          {/* Spending Chart */}
          <SpendingChart
            data={getFilteredSpending()}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          {/* Top Category Chart */}
          <CategoryBarChart data={trendsData.categoryTotals} />

          {/* Top Category Highlight (Optional - kept if user liked the emoji/detail view) */}
          {/* The bar chart sort of covers this, but the card specifically calling out the TOP ONE is nice context. */}
          {/* I'll omit it to de-clutter as the Bar Chart handles visual ranking well. 
            */}

          <View style={{ height: Platform.OS === 'ios' ? spacing.xxxl : spacing.xxl }} />
        </Animated.View>
      </PullToRefreshScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.headlineMedium,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodyMedium,
  },
  emptyText: {
    marginTop: spacing.md,
    ...typography.bodyMedium,
  },
  retryButton: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  scrollContent: {
    padding: spacing.md,
  }
});

export default TrendsScreen;
