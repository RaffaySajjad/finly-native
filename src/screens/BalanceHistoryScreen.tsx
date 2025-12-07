/**
 * BalanceHistoryScreen - Balance History & Insights
 * Purpose: Shows balance trends, projections, and actionable insights
 * Features: Balance trend chart, cash flow forecast, savings analysis
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { PullToRefreshScrollView } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useBalanceHistory } from '../hooks/useBalanceHistory';
import { BalanceChart } from '../components/charts/BalanceChart';
import { BalanceInsightCard } from '../components/trends/BalanceInsightCard';

const BalanceHistoryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation();
  const { balanceData, stats, loading, loadBalanceHistory } = useBalanceHistory();

  useFocusEffect(
    useCallback(() => {
      loadBalanceHistory();
    }, [loadBalanceHistory])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <PullToRefreshScrollView onRefresh={loadBalanceHistory}>
          <View style={styles.emptyContainer}>
            <Icon name="wallet-outline" size={80} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No balance data available
            </Text>
          </View>
        </PullToRefreshScrollView>
      </SafeAreaView>
    );
  }

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
        <View style={styles.currentBalanceCardContainer}>
          <View style={[styles.currentBalanceCard, elevation.md]}>
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
          </View>
        </View>

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
        </View>

        {/* Balance Trend Chart */}
        <BalanceChart data={balanceData.dailyBalances} />

        {/* Insights */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
        <BalanceInsightCard insights={balanceData.insights} />

      </PullToRefreshScrollView>
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
  headerTitle: {
    // ...typography.h3, 
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    // ...typography.body2,
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
    // ...typography.body1,
    fontSize: 16,
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
  currentBalanceLabel: {
    // ...typography.caption,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  currentBalanceAmount: {
    // ...typography.h1,
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
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.sm,
  },
  breakdownLabel: {
    // ...typography.caption,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  breakdownValue: {
    // ...typography.body1,
    fontSize: 16,
    color: '#FFFFFF',
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
    // ...typography.h3,
    fontSize: 16,
    fontWeight: '600',
  },
  projectionAmount: {
    // ...typography.h2,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  projectionSubtext: {
    // ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    // ...typography.h3,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
});

export default BalanceHistoryScreen;
