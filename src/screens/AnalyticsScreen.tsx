/**
 * AnalyticsScreen Component
 * Advanced analytics with year over year comparisons and predictions
 * Premium feature with refactored chart system
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import {
  PremiumBadge,
  UpgradePrompt,
  Header,
  ToggleSelector,
  EmptyState,
  ProgressBar,
} from '../components';
import { 
  ChartContainer, 
  useRangeSelection,
  useDynamicYAxis,
  RangeSelectionBadge,
  CHART_CONFIG,
  formatYAxisLabel,
  formatChartDate,
} from '../components/charts';
import { apiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface ChartDataPoint {
  value: number;
  label?: string;
  date?: string;
  originalValue?: number;
}

const AnalyticsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, getCurrencySymbol, convertFromUSD } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { requiresUpgrade } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');
  
  const currencySymbol = getCurrencySymbol();
  const chartWidth = width - 64;
  const chartHeight = 200;

  useEffect(() => {
    if (requiresUpgrade('advancedInsights')) {
      setShowUpgradePrompt(true);
    }
  }, []);

  const rawMonthlyData = useMemo(() => [
    { date: '2024-01-15', amount: 1200 },
    { date: '2024-02-15', amount: 1350 },
    { date: '2024-03-15', amount: 1400 },
    { date: '2024-04-15', amount: 1100 },
    { date: '2024-05-15', amount: 1500 },
    { date: '2024-06-15', amount: 1450 },
  ], []);

  const chartData: ChartDataPoint[] = useMemo(() => {
    return rawMonthlyData.map((item, index) => ({
      value: convertFromUSD(item.amount),
      label: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
      date: item.date,
      originalValue: item.amount,
    }));
  }, [rawMonthlyData, convertFromUSD]);

  const {
    selection,
    metrics: rangeMetrics,
    hasSelection,
    isSelecting,
    selectPoint,
    clearSelection,
  } = useRangeSelection({
    data: chartData,
    enabled: true,
  });

  const {
    yAxisBounds,
    handleScroll,
  } = useDynamicYAxis({
    data: chartData,
    itemSpacing: 50,
    chartWidth,
    enabled: true,
  });

  const formatYLabel = useCallback((val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return formatYAxisLabel(num, currencySymbol);
  }, [currencySymbol]);

  const handleDataPointClick = useCallback((item: any, index: number) => {
    selectPoint(index);
  }, [selectPoint]);

  const selectionLabels = useMemo(() => {
    if (!hasSelection || selection.startIndex === null) {
      return { start: '', end: '', startFormatted: '', endFormatted: '' };
    }

    const startPoint = chartData[selection.startIndex!];
    const endPoint = chartData[selection.endIndex!];

    return {
      start: startPoint?.date ? formatChartDate(startPoint.date, 'medium') : '',
      end: endPoint?.date ? formatChartDate(endPoint.date, 'medium') : '',
      startFormatted: formatCurrency(startPoint?.originalValue || 0),
      endFormatted: formatCurrency(endPoint?.originalValue || 0),
    };
  }, [hasSelection, selection, chartData, formatCurrency]);

  const categoryData = [
    { name: 'Food', amount: 485.50, percentage: 35, color: theme.categories.food },
    { name: 'Transport', amount: 120.00, percentage: 9, color: theme.categories.transport },
    { name: 'Shopping', amount: 289.99, percentage: 21, color: theme.categories.shopping },
    { name: 'Entertainment', amount: 95.75, percentage: 7, color: theme.categories.entertainment },
    { name: 'Other', amount: 50.00, percentage: 4, color: theme.categories.other },
  ];

  const pointerConfig = {
    pointerStripUptoDataPoint: true,
    pointerStripColor: theme.border,
    pointerStripWidth: 1.5,
    strokeDashArray: [4, 4],
    pointerColor: theme.primary,
    radius: CHART_CONFIG.dataPoints.radius,
    pointerLabelWidth: 140,
    pointerLabelHeight: 90,
    activatePointersOnLongPress: false,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any) => {
      const item = items[0];
      if (!item) return null;

      return (
        <View style={[
          styles.tooltip,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          elevation.md,
        ]}>
          <View style={[styles.tooltipAccent, { backgroundColor: theme.primary }]} />
          <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
            {item.date ? formatChartDate(item.date, 'medium') : item.label || ''}
          </Text>
          <Text style={[styles.tooltipValue, { color: theme.text }]}>
            {formatCurrency(item.originalValue)}
          </Text>
          <Text style={[styles.tooltipHint, { color: theme.textTertiary }]}>
            {isSelecting ? 'Tap another point' : 'Tap to compare'}
          </Text>
        </View>
      );
    },
  };

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
          subtitle="Unlock advanced trends, year over year comparisons, and predictive insights to grow your wealth."
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Analytics"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.periodSelector}>
          <ToggleSelector
            options={[
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
            ]}
            selectedValue={selectedPeriod}
            onValueChange={(value) => {
              clearSelection();
              setSelectedPeriod(value as 'month' | 'year');
            }}
            fullWidth
          />
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ChartContainer
            title="Spending Trend"
            subtitle="Tap two points to compare"
            showBorder
            animateEntry={false}
          >
            {hasSelection && rangeMetrics && (
              <RangeSelectionBadge
                visible={hasSelection}
                metrics={rangeMetrics}
                startLabel={selectionLabels.start}
                endLabel={selectionLabels.end}
                startFormatted={selectionLabels.startFormatted}
                endFormatted={selectionLabels.endFormatted}
                onClear={clearSelection}
              />
            )}

            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={chartWidth}
                height={chartHeight}
                spacing={50}
                initialSpacing={20}
                endSpacing={20}
                color={theme.primary}
                thickness={CHART_CONFIG.line.thickness}
                startFillColor={theme.primary}
                endFillColor={theme.primary}
                startOpacity={CHART_CONFIG.area.startOpacity}
                endOpacity={CHART_CONFIG.area.endOpacity}
                areaChart
                curved
                curvature={CHART_CONFIG.line.curveIntensity}
                hideRules={false}
                rulesType="solid"
                rulesColor={theme.border + '50'}
                rulesThickness={0.5}
                yAxisColor="transparent"
                xAxisColor={theme.border}
                xAxisThickness={0.5}
                yAxisTextStyle={[styles.axisLabel, { color: theme.textTertiary }]}
                xAxisLabelTextStyle={[styles.axisLabel, { color: theme.textTertiary }]}
                yAxisLabelWidth={CHART_CONFIG.axis.yLabelWidth}
                maxValue={yAxisBounds.max}
                mostNegativeValue={yAxisBounds.min}
                noOfSections={yAxisBounds.sections}
                formatYLabel={formatYLabel}
                hideDataPoints={false}
                dataPointsColor={theme.primary}
                dataPointsRadius={CHART_CONFIG.dataPoints.radius}
                focusEnabled={true}
                showDataPointOnFocus={true}
                focusedDataPointColor={theme.primary}
                focusedDataPointRadius={CHART_CONFIG.dataPoints.activeRadius}
                onFocus={handleDataPointClick}
                delayBeforeUnFocus={3000}
                pointerConfig={pointerConfig}
                showVerticalLines={hasSelection}
                verticalLinesUptoDataPoint
                verticalLinesColor={
                  hasSelection
                    ? (rangeMetrics?.isPositive ? theme.expense : theme.success) + '30'
                    : theme.border + '30'
                }
                customDataPoint={(item: any, index: number) => {
                  const isSelected = selection.startIndex === index || selection.endIndex === index;
                  if (!isSelected) return null;

                  const pointColor = rangeMetrics?.isPositive ? theme.expense : theme.success;

                  return (
                    <View
                      style={[
                        styles.customDataPoint,
                        {
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: pointColor,
                          borderWidth: 2,
                          borderColor: theme.card,
                        },
                        elevation.sm,
                      ]}
                    />
                  );
                }}
              />
            </View>
          </ChartContainer>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ChartContainer
            title="Category Breakdown"
            animateEntry={false}
          >
            {categoryData.map((category, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: category.color || theme.primary },
                    ]}
                  />
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {category.name}
                  </Text>
                </View>
                <View style={styles.categoryStats}>
                  <ProgressBar
                    progress={category.percentage}
                    color={category.color || theme.primary}
                  />
                  <Text style={[styles.categoryAmount, { color: theme.text }]}>
                    {formatCurrency(category.amount)}
                  </Text>
                </View>
              </View>
            ))}
          </ChartContainer>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={[
            styles.comparisonCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
          ]}>
            <View style={styles.comparisonHeader}>
              <Icon name="compare-horizontal" size={20} color={theme.primary} />
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Year over Year
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                  Last Year
                </Text>
                <Text style={[styles.comparisonValue, { color: theme.text }]}>
                  {formatCurrency(1200)}
                </Text>
              </View>
              <View style={[styles.comparisonArrow, { backgroundColor: theme.expense + '15' }]}>
                <Icon name="arrow-right" size={20} color={theme.expense} />
              </View>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                  This Year
                </Text>
                <Text style={[styles.comparisonValue, { color: theme.text }]}>
                  {formatCurrency(1350)}
                </Text>
              </View>
            </View>
            <View style={[styles.changeIndicator, { backgroundColor: theme.expense + '15' }]}>
              <Icon name="trending-up" size={16} color={theme.expense} />
              <Text style={[styles.comparisonChange, { color: theme.expense }]}>
                +12.5% increase in spending
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View style={[
            styles.predictionCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.sm,
          ]}>
            <View style={[styles.predictionIcon, { backgroundColor: theme.primary + '15' }]}>
              <Icon name="crystal-ball" size={28} color={theme.primary} />
            </View>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Predictive Insights
            </Text>
            <Text style={[styles.predictionText, { color: theme.textSecondary }]}>
              Based on your spending patterns, you're projected to spend approximately{' '}
              <Text style={{ color: theme.expense, fontWeight: '700' }}>
                {formatCurrency(1400)}
              </Text>
              {' '}next month.
            </Text>
            <View style={[styles.predictionTip, { backgroundColor: theme.success + '10' }]}>
              <Icon name="lightbulb-outline" size={16} color={theme.success} />
              <Text style={[styles.predictionTipText, { color: theme.success }]}>
                Reduce dining out to save ~{formatCurrency(150)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  periodSelector: {
    marginBottom: spacing.lg,
  },
  chartWrapper: {
    marginLeft: -10,
    marginTop: spacing.sm,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tooltip: {
    width: 140,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tooltipAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  tooltipDate: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  tooltipValue: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  tooltipHint: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  customDataPoint: {
    position: 'absolute',
    top: -4,
    left: -4,
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
  categoryAmount: {
    ...typography.titleSmall,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  comparisonCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonValue: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  comparisonArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  comparisonChange: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  predictionCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  predictionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  predictionText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  predictionTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  predictionTipText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
});

export default AnalyticsScreen;
