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
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import { calculateIncomeForPeriod } from '../services/incomeService';
import { getStartingBalance } from '../services/userService';
import { Expense, MonthlyStats } from '../types';
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
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<BalanceHistoryNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<BalanceHistoryData | null>(null);
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const gradientAnimation = useRef(new Animated.Value(0)).current;

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

      // Calculate daily balances
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      // Sort expenses by date
      const sortedExpenses = [...expenses].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate balance over time
      let runningBalance = await getStartingBalance(); // Start with user's starting balance
      const dailyBalances: Array<{ date: string; balance: number }> = [];
      
      // Calculate income and expenses before this month
      const preMonthExpenses = sortedExpenses.filter(e => new Date(e.date) < startOfMonth);
      const preMonthExpensesTotal = preMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate income from income sources for period before this month
      const preMonthStart = new Date(0); // Start from beginning
      const preMonthIncome = await calculateIncomeForPeriod(preMonthStart, new Date(startOfMonth.getTime() - 1));
      
      runningBalance = runningBalance + preMonthIncome - preMonthExpensesTotal;

      // Calculate daily balances for current month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Add transactions for this day
        const dayExpenses = sortedExpenses.filter(e => {
          const expenseDate = new Date(e.date).toISOString().split('T')[0];
          return expenseDate === dateStr;
        });

        // All expenses are expenses now - subtract from balance
        dayExpenses.forEach(expense => {
          runningBalance -= expense.amount;
        });

        // Calculate income from income sources for this day
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        const dayIncome = await calculateIncomeForPeriod(dayStart, dayEnd);
        runningBalance += dayIncome;

        dailyBalances.push({ date: dateStr, balance: runningBalance });
      }

      // Calculate monthly balances (last 6 months)
      const monthlyBalances: Array<{ month: string; balance: number; income: number; expenses: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthExpenses = sortedExpenses.filter(e => {
          const expenseDate = new Date(e.date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        });

        // Calculate income from income sources for this month
        const monthIncome = await calculateIncomeForPeriod(monthStart, monthEnd);
        
        // All expenses are expenses now
        const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        const monthBalance = monthIncome - monthExpensesTotal;
        
        monthlyBalances.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          balance: monthBalance,
          income: monthIncome,
          expenses: monthExpensesTotal,
        });
      }

      // Calculate projection
      const today = now.getDate();
      const daysRemaining = daysInMonth - today;
      const currentMonthExpenses = dailyBalances
        .slice(0, today)
        .reduce((sum, d, idx) => {
          if (idx === 0) return sum;
          const prevBalance = dailyBalances[idx - 1].balance;
          const currBalance = d.balance;
          return sum + Math.max(0, prevBalance - currBalance); // Only count spending, not income
        }, 0);
      
      const dailySpendingRate = today > 0 ? currentMonthExpenses / today : 0;
      const projectedEndOfMonth = currentStats.balance - (dailySpendingRate * daysRemaining);
      
      // Generate insights
      const insights: Array<{
        id: string;
        type: 'info' | 'warning' | 'success';
        title: string;
        description: string;
        icon: string;
      }> = [];

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
            icon: 'alert',
          });
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

  // Prepare line chart data for last 30 days
  const last30Days = balanceData.dailyBalances.slice(-30);
  const lineChartData = {
    labels: last30Days.map((d, idx) => {
      // Show every 5th day label
      if (idx % 5 === 0 || idx === last30Days.length - 1) {
        const date = new Date(d.date);
        return (date.getDate()).toString();
      }
      return '';
    }),
    datasets: [
      {
        data: last30Days.map(d => Math.max(0, d.balance)), // Ensure non-negative for chart
        color: (opacity = 1) => theme.primary,
        strokeWidth: 3,
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
              colors={[theme.primary, theme.primaryDark, theme.primaryLight]}
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
        <Animated.View
          style={[
            styles.chartCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.chartTitle, { color: theme.text }]}>Balance Trend (Last 30 Days)</Text>
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
            fromZero={false}
          />
        </Animated.View>

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

