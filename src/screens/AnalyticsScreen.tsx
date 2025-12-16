/**
 * AnalyticsScreen Component
 * Purpose: Advanced analytics with year-over-year comparisons and predictions
 * Premium feature
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { 
  PremiumBadge, 
  UpgradePrompt, 
  Header, 
  ToggleSelector, 
  ChartCard, 
  EmptyState,
  PrimaryButton,
  ProgressBar,
} from '../components';
import { apiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (requiresUpgrade('advancedInsights')) {
      setShowUpgradePrompt(true);
    }
  }, []);

  // Mock analytics data
  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [1200, 1350, 1400, 1100, 1500, 1450],
        color: (opacity = 1) => theme.primary,
      },
    ],
  };

  const categoryData = [
    { name: 'Food', amount: 485.50, percentage: 35 },
    { name: 'Transport', amount: 120.00, percentage: 9 },
    { name: 'Shopping', amount: 289.99, percentage: 21 },
    { name: 'Entertainment', amount: 95.75, percentage: 7 },
    { name: 'Other', amount: 50.00, percentage: 4 },
  ];

  if (requiresUpgrade('advancedInsights')) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Advanced Analytics"
          showBackButton
          onBackPress={() => navigation.goBack()}
          rightComponent={<PremiumBadge size="small" />}
        />

        <EmptyState
          icon="chart-line"
          title="See the Full Picture"
          subtitle="Unlock advanced trends, year-over-year comparisons, and predictive insights to grow your wealth."
          actionLabel="Unlock Finly Pro"
          onActionPress={() => navigation.navigate('Subscription')}
        />

        <UpgradePrompt
          visible={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          feature="Advanced Analytics"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      <Header
        title="Analytics"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <ToggleSelector
            options={[
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
            ]}
            selectedValue={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as 'month' | 'year')}
            fullWidth
          />
        </View>

        {/* Spending Trend Chart */}
        <ChartCard title="Spending Trend">
          <LineChart
            data={monthlyData}
            width={width - 64}
            height={220}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 0,
              color: (opacity = 1) => theme.primary,
              labelColor: (opacity = 1) => theme.textSecondary,
            }}
            bezier
            style={styles.chart}
          />
        </ChartCard>

        {/* Category Breakdown */}
        <ChartCard title="Category Breakdown">
          {categoryData.map((category, index) => (
            <View key={index} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: theme.categories[category.name.toLowerCase() as keyof typeof theme.categories] || theme.primary },
                  ]}
                />
                <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
              </View>
              <View style={styles.categoryStats}>
                <ProgressBar
                  progress={category.percentage}
                  color={theme.categories[category.name.toLowerCase() as keyof typeof theme.categories] || theme.primary}
                />
                <Text style={[styles.categoryAmount, { color: theme.text }]}>
                  {formatCurrency(category.amount)}
                </Text>
              </View>
            </View>
          ))}
        </ChartCard>

        {/* Year-over-Year Comparison */}
        <View style={[styles.comparisonCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Year-over-Year</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Last Year</Text>
              <Text style={[styles.comparisonValue, { color: theme.text }]}>{formatCurrency(1200)}</Text>
            </View>
            <Icon name="arrow-right" size={24} color={theme.textTertiary} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>This Year</Text>
              <Text style={[styles.comparisonValue, { color: theme.success }]}>{formatCurrency(1350)}</Text>
            </View>
          </View>
          <Text style={[styles.comparisonChange, { color: theme.expense }]}>
            +12.5% increase
          </Text>
        </View>

        {/* Predictive Insights */}
        <View style={[styles.predictionCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="crystal-ball" size={32} color={theme.primary} />
          <Text style={[styles.chartTitle, { color: theme.text }]}>Predictive Insights</Text>
          <Text style={[styles.predictionText, { color: theme.textSecondary }]}>
            Based on your spending patterns, you're projected to spend approximately {formatCurrency(1400)} next month.
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  categoryRow: {
    marginBottom: spacing.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  categoryAmount: {
    ...typography.titleSmall,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  comparisonCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  comparisonValue: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  comparisonChange: {
    ...typography.bodyMedium,
    textAlign: 'center',
    fontWeight: '600',
  },
  predictionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  predictionText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    ...typography.titleLarge,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  upgradeButton: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  upgradeButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AnalyticsScreen;

