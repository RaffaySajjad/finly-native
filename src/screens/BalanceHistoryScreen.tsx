/**
 * BalanceHistoryScreen - Balance History & Insights
 * Purpose: Shows balance trends, projections, and actionable insights
 * Features: Balance trend chart, cash flow forecast, savings analysis
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
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { apiService } from '../services/api';
import { calculateIncomeForPeriod } from '../services/incomeService';
import { getStartingBalance } from '../services/userService';
import { Expense, MonthlyStats } from '../types';
import { PullToRefreshScrollView } from '../components';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

interface BalanceHistoryData {
  dailyBalances: Array<{ date: string; balance: number }>;
  monthlyBalances: Array<{ month: string; balance: number; income: number; expenses: number }>;
  projection: {
    endOfMonth: number;
    daysRemaining: number;
    dailySpendingRate: number;
    isPositive: boolean;
  };
  insights: Array<{
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    description: string;
    icon: string;
  }>;
}

type BalanceHistoryNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * BalanceHistoryScreen - Balance trends and projections
 */
const BalanceHistoryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const { isPremium } = useSubscription();
  const navigation = useNavigation<BalanceHistoryNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<BalanceHistoryData | null>(null);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{ date: string; balance: number; index: number } | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadBalanceHistory();
    }, [])
  );

  useEffect(() => {
    if (balanceData) {
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

      // Start gradient animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnimation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [balanceData]);

  const loadBalanceHistory = async () => {
    try {
      setLoading(true);
      const expenses = await apiService.getExpenses();
      const currentStats = await apiService.getMonthlyStats();
      setStats(currentStats);

      // Calculate daily balances - go back 30 days from today
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30); // Go back 30 days
      startDate.setHours(0, 0, 0, 0);
      
      // Sort expenses by date
      const sortedExpenses = [...expenses].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate balance over time - start from user's starting balance
      let runningBalance = await getStartingBalance();
      const dailyBalances: Array<{ date: string; balance: number }> = [];
      
      // Calculate income and expenses before the start date
      const preStartExpenses = sortedExpenses.filter(e => new Date(e.date) < startDate);
      const preStartExpensesTotal = preStartExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate income from income sources for period before start date
      const preStartIncome = await calculateIncomeForPeriod(new Date(0), new Date(startDate.getTime() - 1));
      
      runningBalance = runningBalance + preStartIncome - preStartExpensesTotal;

      // Calculate daily balances for the last 30 days
      const currentDate = new Date(startDate);
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

      // Get expenses for this day
        const dayExpenses = sortedExpenses.filter(e => {
          const expenseDate = new Date(e.date).toISOString().split('T')[0];
          return expenseDate === dateStr;
        });

        // Subtract expenses from balance
        dayExpenses.forEach(expense => {
          runningBalance -= expense.amount;
        });

        // Calculate income from income sources for this day
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        const dayIncome = await calculateIncomeForPeriod(dayStart, dayEnd);
        runningBalance += dayIncome;

        dailyBalances.push({ date: dateStr, balance: runningBalance });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate monthly balances (last 6 months) - cumulative balance
      const monthlyBalances: Array<{ month: string; balance: number; income: number; expenses: number }> = [];
      let cumulativeBalance = await getStartingBalance();

      // Calculate balance before the first month we're showing
      const firstMonthDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const preFirstMonthExpenses = sortedExpenses.filter(e => new Date(e.date) < firstMonthDate);
      const preFirstMonthExpensesTotal = preFirstMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const preFirstMonthIncome = await calculateIncomeForPeriod(new Date(0), new Date(firstMonthDate.getTime() - 1));
      cumulativeBalance = cumulativeBalance + preFirstMonthIncome - preFirstMonthExpensesTotal;

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        const monthExpenses = sortedExpenses.filter(e => {
          const expenseDate = new Date(e.date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        });

        // Calculate income from income sources for this month
        const monthIncome = await calculateIncomeForPeriod(monthStart, monthEnd);
        
        // Calculate expenses for this month
        const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Update cumulative balance (add income, subtract expenses)
        cumulativeBalance = cumulativeBalance + monthIncome - monthExpensesTotal;
        
        monthlyBalances.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          balance: cumulativeBalance, // End-of-month balance
          income: monthIncome,
          expenses: monthExpensesTotal,
        });
      }

      // Calculate projection based on current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const today = now.getDate();
      const daysRemaining = daysInMonth - today;

      // Calculate spending rate from recent daily balances (last 7 days or available days)
      const recentDays = dailyBalances.slice(-7);
      let totalSpending = 0;
      let daysWithSpending = 0;

      for (let i = 1; i < recentDays.length; i++) {
        const prevBalance = recentDays[i - 1].balance;
        const currBalance = recentDays[i].balance;
        const change = prevBalance - currBalance;
        if (change > 0) { // Only count decreases (spending)
          totalSpending += change;
          daysWithSpending++;
        }
      }

      const dailySpendingRate = daysWithSpending > 0 ? totalSpending / daysWithSpending : 0;
      const projectedEndOfMonth = currentStats.balance - (dailySpendingRate * daysRemaining);
      
      // Generate insights - try AI first, fallback to local
      let insights: Array<{
        id: string;
        type: 'info' | 'warning' | 'success';
        title: string;
        description: string;
        icon: string;
      }> = [];

      const balanceDataForAI = {
        dailyBalances,
        monthlyBalances,
        projection: {
          endOfMonth: projectedEndOfMonth,
          daysRemaining,
          dailySpendingRate,
          isPositive: projectedEndOfMonth >= 0,
        },
      };

      // Try AI-powered insights (for premium users or if available)
      try {
        const aiInsights = await apiService.getBalanceInsights(balanceDataForAI);
        if (aiInsights && aiInsights.length > 0) {
          insights = aiInsights;
        } else {
          throw new Error('No AI insights returned');
        }
      } catch (error) {
        // Fallback to local rule-based insights
        console.log('[BalanceHistory] Using local insights (AI unavailable or failed)');

        // Projection insight
        if (projectedEndOfMonth < 0) {
          insights.push({
            id: 'projection_warning',
            type: 'warning',
            title: '⚠️ Projected Negative Balance',
            description: `At your current spending rate, you'll have ${formatCurrency(Math.abs(projectedEndOfMonth))} less than needed by month end. Consider reducing expenses.`,
            icon: 'alert-circle',
          });
        } else if (projectedEndOfMonth > currentStats.balance * 0.5) {
          insights.push({
            id: 'projection_success',
            type: 'success',
            title: '✅ Great Spending Pace',
            description: `You're on track to end the month with ${formatCurrency(projectedEndOfMonth)}. Keep it up!`,
            icon: 'check-circle',
          });
        } else {
          insights.push({
            id: 'projection_info',
            type: 'info',
            title: '📊 Month-End Projection',
            description: `Based on your current spending rate, you're projected to have ${formatCurrency(projectedEndOfMonth)} by month end.`,
            icon: 'chart-line',
          });
        }

        // Spending rate insight
        if (dailySpendingRate > 0) {
          const monthlyProjection = dailySpendingRate * 30;
          if (monthlyProjection > currentStats.totalIncome * 0.9) {
            insights.push({
              id: 'spending_rate_warning',
              type: 'warning',
              title: 'High Daily Spending',
              description: `You're spending ${formatCurrency(dailySpendingRate)} per day on average. At this rate, you'll exceed your income this month.`,
              icon: 'trending-up',
            });
          } else {
            insights.push({
              id: 'spending_rate_info',
              type: 'info',
              title: 'Daily Spending Rate',
              description: `Your average daily spending is ${formatCurrency(dailySpendingRate)}. This translates to ~${formatCurrency(monthlyProjection)} per month.`,
              icon: 'calendar-clock',
            });
          }
        }

        // Balance trend insight
        if (dailyBalances.length >= 7) {
          const last7Days = dailyBalances.slice(-7);
          const firstBalance = last7Days[0].balance;
          const lastBalance = last7Days[last7Days.length - 1].balance;
          const trend = lastBalance - firstBalance;

          if (trend < -100) {
            insights.push({
              id: 'trend_warning',
              type: 'warning',
              title: 'Declining Balance Trend',
              description: `Your balance decreased by ${formatCurrency(Math.abs(trend))} over the last 7 days. Review recent expenses.`,
              icon: 'trending-down',
            });
          } else if (trend > 100) {
            insights.push({
              id: 'trend_success',
              type: 'success',
              title: 'Growing Balance',
              description: `Your balance increased by ${formatCurrency(trend)} over the last 7 days. Excellent financial management!`,
              icon: 'trending-up',
            });
          }
        }

        // Savings rate insight
        if (currentStats.totalIncome > 0) {
          const savingsRate = (currentStats.balance / currentStats.totalIncome) * 100;
          if (savingsRate >= 20) {
            insights.push({
              id: 'savings_success',
              type: 'success',
              title: 'Excellent Savings Rate',
              description: `You're saving ${savingsRate.toFixed(1)}% of your income. This is above the recommended 20%!`,
              icon: 'piggy-bank',
            });
          } else if (savingsRate < 10) {
            insights.push({
              id: 'savings_warning',
              type: 'warning',
              title: 'Low Savings Rate',
              description: `You're saving ${savingsRate.toFixed(1)}% of your income. Aim for at least 20% for financial security.`,
              icon: 'alert-circle',
            });
          }
        }
      }

      setBalanceData({
        dailyBalances,
        monthlyBalances,
        projection: {
          endOfMonth: projectedEndOfMonth,
          daysRemaining,
          dailySpendingRate,
          isPositive: projectedEndOfMonth >= 0,
        },
        insights,
      });
    } catch (error) {
      console.error('Error loading balance history:', error);
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
            Analyzing your balance...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!balanceData || !stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="wallet-outline" size={80} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No balance data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare line chart data for react-native-gifted-charts
  const chartData = balanceData.dailyBalances.length > 0
    ? balanceData.dailyBalances
    : [{ date: new Date().toISOString().split('T')[0], balance: stats.balance }];

  console.log('[BalanceChart] ===== CHART DATA PREPARATION =====');
  console.log('[BalanceChart] Raw chartData length:', chartData.length);
  console.log('[BalanceChart] First 3 raw data points:', chartData.slice(0, 3).map(d => ({ date: d.date, balance: d.balance })));
  console.log('[BalanceChart] Last 3 raw data points:', chartData.slice(-3).map(d => ({ date: d.date, balance: d.balance })));

  // Format data for gifted-charts LineChart
  // Calculate how many labels to show (max 7 labels for readability)
  const labelInterval = Math.max(1, Math.floor(chartData.length / 7));
  console.log('[BalanceChart] Label interval:', labelInterval);

  const lineData = chartData.map((d, index) => {
    // Show labels for evenly spaced points (first, last, and every Nth point)
    const showLabel = index === 0 ||
      index === chartData.length - 1 ||
      index % labelInterval === 0;

    let label = '';
    if (showLabel) {
      const date = new Date(d.date);
      // Show day number only (e.g., "20", "25", "30")
      label = date.getDate().toString();
    }

    return {
      value: d.balance,
      label: label,
      date: d.date,
      index,
    };
  });

  console.log('[BalanceChart] Formatted lineData length:', lineData.length);
  console.log('[BalanceChart] First 3 formatted points:', lineData.slice(0, 3));
  console.log('[BalanceChart] Last 3 formatted points:', lineData.slice(-3));
  console.log('[BalanceChart] Labels with values:', lineData.filter(d => d.label !== '').map(d => ({ label: d.label, value: d.value })));
  console.log('[BalanceChart] All values array:', lineData.map(d => d.value));

  // Calculate Y-axis range with smart padding
  const allValues = chartData.map(d => d.balance);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;

  const rangePercentage = range > 0 ? (range / Math.abs(maxValue)) * 100 : 0;

  console.log('[BalanceChart] ===== Y-AXIS CALCULATION =====');
  console.log('[BalanceChart] Raw values - min:', minValue, 'max:', maxValue, 'range:', range);
  console.log('[BalanceChart] Range percentage of max:', rangePercentage.toFixed(2) + '%');

  // Smart Y-axis range calculation
  let yAxisMin: number;
  let yAxisMax: number;
  let paddingType = '';

  if (range === 0) {
    // All values are the same - create a small range around the value
    const padding = Math.max(Math.abs(maxValue) * 0.05, 100);
    yAxisMin = minValue - padding;
    yAxisMax = maxValue + padding;
    paddingType = 'identical-values';
    console.log('[BalanceChart] All values identical, padding:', padding);
  } else if (rangePercentage < 1) {
    // Very small range (< 1% of max) - use 50% padding on each side to make trend visible
    const padding = range * 0.5;
    yAxisMin = minValue - padding;
    yAxisMax = maxValue + padding;
    paddingType = 'very-small-range-50%';
    console.log('[BalanceChart] Very small range (<1%), using 50% padding:', padding);
  } else if (rangePercentage < 5) {
    // Small range (1-5% of max) - use 30% padding
    const padding = range * 0.3;
    yAxisMin = minValue - padding;
    yAxisMax = maxValue + padding;
    paddingType = 'small-range-30%';
    console.log('[BalanceChart] Small range (1-5%), using 30% padding:', padding);
  } else {
    // Normal range - use 10% padding
    const padding = range * 0.1;
    yAxisMin = minValue - padding;
    yAxisMax = maxValue + padding;
    paddingType = 'normal-range-10%';
    console.log('[BalanceChart] Normal range, using 10% padding:', padding);
  }

  console.log('[BalanceChart] Before zero-adjustment - yAxisMin:', yAxisMin, 'yAxisMax:', yAxisMax);

  // For very small ranges, don't force zero - keep the range focused on the data
  // Only adjust if we're very close to zero (within 1% of the value)
  if (minValue < 0 && maxValue < 0) {
    // All negative - only cap at zero if we're very close, otherwise keep focused range
    if (yAxisMax > -Math.abs(maxValue) * 0.01) {
      // Very close to zero, cap it
      yAxisMax = Math.min(0, maxValue + range * 0.1);
      console.log('[BalanceChart] All negative, capping max at zero:', yAxisMax);
    } else {
      // Keep the focused range - don't force zero
      console.log('[BalanceChart] All negative, keeping focused range (not forcing zero)');
    }
  } else if (minValue > 0 && maxValue > 0) {
    // All positive - only cap at zero if very close
    if (yAxisMin < Math.abs(minValue) * 0.01) {
      yAxisMin = Math.max(0, minValue - range * 0.1);
      console.log('[BalanceChart] All positive, capping min at zero:', yAxisMin);
    } else {
      console.log('[BalanceChart] All positive, keeping focused range (not forcing zero)');
    }
  }

  console.log('[BalanceChart] Final Y-axis range - min:', yAxisMin, 'max:', yAxisMax);
  console.log('[BalanceChart] Padding type used:', paddingType);
  console.log('[BalanceChart] Effective range:', yAxisMax - yAxisMin);
  console.log('[BalanceChart] Data will occupy:', ((range / (yAxisMax - yAxisMin)) * 100).toFixed(2) + '% of chart height');

  // Format Y-axis labels (label comes as a number string from the library)
  const formatYAxisLabel = (label: string): string => {
    const value = parseFloat(label);
    if (isNaN(value)) return label;

    // Handle negative values
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(1)}k`;
    }
    return `${sign}$${Math.round(absValue)}`;
  };

  // Handle data point press
  const handleDataPointPress = (item: typeof lineData[0]) => {
    setSelectedDataPoint({
      date: item.date,
      balance: item.value,
      index: item.index,
    });
    Animated.spring(tooltipAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Balance History</Text>
        <View style={{ width: 40 }} />
      </View>

      <PullToRefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onRefresh={loadBalanceHistory}
      >
        {/* Current Balance Card */}
        <Animated.View
          style={[
            styles.currentBalanceCardContainer,
            {
              opacity: gradientAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.currentBalanceCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <LinearGradient
              colors={isDark 
                ? ['#1E4A6F', '#0F2E4A', '#2E5F8F'] // Darker blues for dark mode
                : [theme.primary, theme.primaryDark, theme.primaryLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <Text style={styles.currentBalanceLabel}>Current Balance</Text>
              <Text style={styles.currentBalanceAmount}>
                {formatCurrency(stats.balance)}
              </Text>
              <View style={styles.balanceBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Income</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(stats.totalIncome)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Expenses</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(stats.totalExpenses)}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Projection Card */}
        <Animated.View
          style={[
            styles.card,
            styles.projectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
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
            <Text style={[styles.cardTitle, { color: theme.text }]}>Month-End Projection</Text>
          </View>
          <Text style={[
            styles.projectionAmount,
            { color: balanceData.projection.isPositive ? theme.success : theme.expense },
          ]}>
            {formatCurrency(balanceData.projection.endOfMonth)}
          </Text>
          <Text style={[styles.projectionSubtext, { color: theme.textSecondary }]}>
            Based on your current spending rate of {formatCurrency(balanceData.projection.dailySpendingRate)}/day
          </Text>
          <Text style={[styles.projectionSubtext, { color: theme.textSecondary }]}>
            {balanceData.projection.daysRemaining} days remaining this month
          </Text>
        </Animated.View>

        {/* Balance Trend Chart */}
        {balanceData.dailyBalances.length > 0 && (
          <Animated.View
            style={[
              styles.chartCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              elevation.sm,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Balance Trend ({balanceData.dailyBalances.length} Days)
              </Text>
              {selectedDataPoint && (
                <Animated.View
                  style={[
                    styles.chartTooltip,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      opacity: tooltipAnim,
                      transform: [{ scale: tooltipAnim }],
                    },
                  ]}
                >
                  <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
                    {new Date(selectedDataPoint.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={[styles.tooltipBalance, { color: theme.text }]}>
                    {formatCurrency(selectedDataPoint.balance)}
                  </Text>
                </Animated.View>
              )}
            </View>
            <View style={styles.chartContainer}>
              {(() => {
                const chartWidth = width - (spacing.lg * 2) - (spacing.md * 2) - 20;
                const chartSpacing = lineData.length > 1
                  ? (chartWidth - 60) / (lineData.length - 1)
                  : 0;

                console.log('[BalanceChart] ===== CHART CONFIGURATION =====');
                console.log('[BalanceChart] Screen width:', width);
                console.log('[BalanceChart] Chart width:', chartWidth);
                console.log('[BalanceChart] Chart height: 240');
                console.log('[BalanceChart] Data points count:', lineData.length);
                console.log('[BalanceChart] Calculated spacing:', chartSpacing);
                console.log('[BalanceChart] Initial spacing: 20, End spacing: 20');
                console.log('[BalanceChart] Y-axis maxValue:', yAxisMax);
                console.log('[BalanceChart] Theme primary color:', theme.primary);
                console.log('[BalanceChart] Chart props:', {
                  curved: true,
                  areaChart: false,
                  thickness: 3,
                  noOfSections: 5,
                  isAnimated: true,
                });

                return (
                  <LineChart
                    data={lineData}
                    width={chartWidth}
                    height={240}
                    spacing={chartSpacing}
                    thickness={3}
                    color={theme.primary}
                    hideRules={false}
                    rulesType="solid"
                    rulesColor={theme.border}
                    yAxisColor={theme.border}
                    xAxisColor={theme.border}
                    yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
                    xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10, width: 30 }}
                    curved
                    areaChart={false}
                    hideYAxisText={false}
                    yAxisLabelWidth={70}
                    yAxisLabelPrefix=""
                    yAxisLabelSuffix=""
                    maxValue={yAxisMax}
                    noOfSections={5}
                    formatYLabel={formatYAxisLabel}
                    onPress={(item: typeof lineData[0]) => {
                      console.log('[BalanceChart] Data point pressed:', {
                        index: item.index,
                        value: item.value,
                        label: item.label,
                        date: item.date,
                      });
                      handleDataPointPress(item);
                    }}
                    pointerConfig={{
                      pointer1Color: theme.primary,
                      pointerStripUptoDataPoint: true,
                      pointerStripColor: theme.primary + '40',
                      pointerStripWidth: 2,
                      activatePointersOnLongPress: true,
                      autoAdjustPointerLabelPosition: true,
                      shiftPointerLabelX: 0,
                      shiftPointerLabelY: -40,
                      pointerLabelComponent: (items: any[]) => {
                        console.log('[BalanceChart] Tooltip rendering, items:', items);
                        if (!items || items.length === 0) {
                          console.log('[BalanceChart] No items in tooltip');
                          return null;
                        }
                        const item = items[0];
                        console.log('[BalanceChart] Tooltip item:', {
                          index: item.index,
                          value: item.value,
                          date: item.date,
                        });
                        // Find the corresponding data point from lineData to get the date
                        const itemData = lineData[item.index] || lineData.find(d => d.value === item.value);
                        const displayDate = itemData?.date || item.date;
                        console.log('[BalanceChart] Tooltip displayDate:', displayDate);
                        return (
                          <View style={[styles.pointerLabel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={[styles.pointerLabelDate, { color: theme.textSecondary }]}>
                              {displayDate ? new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </Text>
                            <Text style={[styles.pointerLabelText, { color: theme.text }]}>
                              {formatCurrency(item.value)}
                            </Text>
                          </View>
                        );
                      },
                    }}
                    textShiftY={-2}
                    textShiftX={-5}
                    textFontSize={10}
                    textColor={theme.textSecondary}
                    dataPointsColor={theme.primary}
                    dataPointsRadius={4}
                    dataPointsWidth={4}
                    initialSpacing={20}
                    endSpacing={20}
                    backgroundColor={theme.card}
                    isAnimated
                    animationDuration={800}
                    showVerticalLines={false}
                  />
                );
              })()}
            </View>
          </Animated.View>
        )}

        {/* Monthly Balance History */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Balance History</Text>
          {balanceData.monthlyBalances.map((month, index) => (
            <View key={index} style={styles.monthItem}>
              <View style={styles.monthInfo}>
                <Text style={[styles.monthLabel, { color: theme.text }]}>{month.month}</Text>
                <Text style={[styles.monthBalance, { color: theme.textSecondary }]}>
                  Balance: {formatCurrency(month.balance)}
                </Text>
              </View>
              <View style={styles.monthBreakdown}>
                <View style={styles.monthStat}>
                  <Icon name="arrow-down" size={16} color={theme.success} />
                  <Text style={[styles.monthStatText, { color: theme.textSecondary }]}>
                    {formatCurrency(month.income)}
                  </Text>
                </View>
                <View style={styles.monthStat}>
                  <Icon name="arrow-up" size={16} color={theme.expense} />
                  <Text style={[styles.monthStatText, { color: theme.textSecondary }]}>
                    {formatCurrency(month.expenses)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Insights */}
        {balanceData.insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
            {balanceData.insights.map((insight) => (
              <Animated.View
                key={insight.id}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: theme.card,
                    borderColor:
                      insight.type === 'warning'
                        ? theme.expense
                        : insight.type === 'success'
                        ? theme.success
                        : theme.border,
                  },
                  elevation.sm,
                  { opacity: fadeAnim },
                ]}
              >
                <View style={[
                  styles.insightIcon,
                  {
                    backgroundColor:
                      insight.type === 'warning'
                        ? theme.expense + '20'
                        : insight.type === 'success'
                        ? theme.success + '20'
                        : theme.primary + '20',
                  },
                ]}>
                  <Icon
                    name={insight.icon as any}
                    size={24}
                    color={
                      insight.type === 'warning'
                        ? theme.expense
                        : insight.type === 'success'
                        ? theme.success
                        : theme.primary
                    }
                  />
                </View>
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
                  <Text style={[styles.insightDescription, { color: theme.textSecondary }]}>
                    {insight.description}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
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
  },
  scrollContent: {
    padding: spacing.lg,
  },
  currentBalanceCardContainer: {
    marginBottom: spacing.md,
  },
  currentBalanceCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradientCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  currentBalanceLabel: {
    ...typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  currentBalanceAmount: {
    ...typography.displayMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  breakdownValue: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  projectionCard: {
    borderWidth: 1,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  projectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  projectionAmount: {
    ...typography.displaySmall,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  projectionSubtext: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  chartCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    flex: 1,
  },
  chartTooltip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  tooltipDate: {
    ...typography.caption,
    fontSize: 10,
  },
  tooltipBalance: {
    ...typography.titleSmall,
    fontWeight: '700',
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pointerLabel: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  pointerLabelDate: {
    ...typography.caption,
    fontSize: 9,
    marginBottom: 2,
  },
  pointerLabelText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  monthInfo: {
    flex: 1,
  },
  monthLabel: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  monthBalance: {
    ...typography.bodySmall,
  },
  monthBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  monthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthStatText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  insightsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  insightDescription: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
});

export default BalanceHistoryScreen;

