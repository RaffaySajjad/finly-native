/**
 * DashboardScreen component
 * Purpose: Main screen showing financial overview, recent expenses, and quick actions
 * Displays monthly stats, recent transactions, and a floating action button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { ExpenseCard, StatCard } from '../components';
import { apiService } from '../services/api';
import { Expense, MonthlyStats } from '../types';
import { typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * DashboardScreen - Main home screen of the app
 * Shows financial overview and recent transactions
 */
const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads dashboard data from API
   */
  const loadData = async (): Promise<void> => {
    try {
      const [expensesData, statsData] = await Promise.all([
        apiService.getExpenses(),
        apiService.getMonthlyStats(),
      ]);
      setExpenses(expensesData.slice(0, 5)); // Show only recent 5
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handles pull-to-refresh
   */
  const onRefresh = (): void => {
    setRefreshing(true);
    loadData();
  };

  /**
   * Navigates to Add Expense screen
   */
  const handleAddExpense = (): void => {
    navigation.navigate('AddExpense');
  };

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Good morning</Text>
          <Text style={[styles.title, { color: theme.text }]}>Financial Overview</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Balance Card */}
        {stats && (
          <View style={styles.balanceCard}>
            <View
              style={[
                styles.balanceCardInner,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={[styles.balanceLabel, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Current Balance
              </Text>
              <Text style={[styles.balanceAmount, { color: '#FFFFFF' }]}>
                ${stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.balanceMonth, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                {currentMonth}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <StatCard
                label="Income"
                amount={stats.totalIncome}
                icon="arrow-down"
                color={theme.income}
              />
              <StatCard
                label="Expenses"
                amount={stats.totalExpenses}
                icon="arrow-up"
                color={theme.expense}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Savings"
                amount={stats.savings}
                icon="piggy-bank"
                color={theme.success}
                subtitle={`${stats.savingsRate}% saved`}
              />
              <StatCard
                label="To Budget"
                amount={stats.balance - stats.savings}
                icon="wallet"
                color={theme.info}
              />
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt-text-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No transactions yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography.bodyMedium,
    marginBottom: 2,
  },
  title: {
    ...typography.headlineMedium,
  },
  balanceCard: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  balanceCardInner: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  balanceLabel: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  balanceMonth: {
    ...typography.bodyMedium,
  },
  statsContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleLarge,
  },
  seeAll: {
    ...typography.labelMedium,
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
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
});

export default DashboardScreen;

