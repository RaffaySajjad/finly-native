/**
 * CategoryBarChart Component
 * Premium horizontal bar chart for category spending breakdown
 * Features: Animated bars, interactive tooltips, sorted by value, premium design
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { CHART_CONFIG } from './constants';
import { formatYAxisLabel } from './utils';
import ChartEmptyState from './ChartEmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

interface CategoryBarChartProps {
  data: CategoryData[];
  title?: string;
  showLegend?: boolean;
  maxBars?: number;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  data,
  title = 'Spending by Category',
  showLegend = true,
  maxBars = 6,
}) => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, convertFromUSD, getCurrencySymbol } = useCurrency();
  const currencySymbol = getCurrencySymbol();
  
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxBars);
  }, [data, maxBars]);

  const totalAmount = useMemo(() => {
    return sortedData.reduce((sum, item) => sum + item.amount, 0);
  }, [sortedData]);

  const chartData = useMemo(() => {
    return sortedData.map((item, index) => ({
      value: convertFromUSD(item.amount),
      label: item.category.length > 8 
        ? item.category.substring(0, 7) + '…' 
        : item.category,
      frontColor: item.color || theme.primary,
      originalAmount: item.amount,
      fullLabel: item.category,
      percentage: totalAmount > 0 
        ? ((item.amount / totalAmount) * 100).toFixed(1) 
        : '0',
      topLabelComponent: () => (
        <Text 
          style={[styles.barTopLabel, { color: theme.textTertiary }]}
          numberOfLines={1}
        >
          {formatCompactCurrency(item.amount)}
        </Text>
      ),
    }));
  }, [sortedData, convertFromUSD, theme, formatCompactCurrency, totalAmount]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.value)) * 1.25;
  }, [chartData]);

  const formatYLabel = useCallback((val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return formatYAxisLabel(num, currencySymbol);
  }, [currencySymbol]);

  // Compact currency formatter for bar top labels (prevents line wrapping)
  const formatCompactCurrency = useCallback((amount: number) => {
    const converted = convertFromUSD(amount);
    if (converted >= 1000000) {
      return `${currencySymbol}${(converted / 1000000).toFixed(1)}M`;
    } else if (converted >= 10000) {
      return `${currencySymbol}${(converted / 1000).toFixed(0)}K`;
    } else if (converted >= 1000) {
      return `${currencySymbol}${(converted / 1000).toFixed(1)}K`;
    }
    return `${currencySymbol}${converted.toFixed(0)}`;
  }, [convertFromUSD, currencySymbol]);

  const handleBarPress = useCallback((item: any, index: number) => {
    setSelectedBar(selectedBar === index ? null : index);
  }, [selectedBar]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <ChartEmptyState
          variant="bar"
          title="No spending data yet"
          subtitle="Add expenses to see your category breakdown"
          compact
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Total: {formatCurrency(totalAmount)}
          </Text>
        </View>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => setViewMode('chart')}
            style={[
              styles.viewToggleButton,
              viewMode === 'chart' && { backgroundColor: theme.primary + '20' },
            ]}
          >
            <Icon 
              name="chart-bar" 
              size={18} 
              color={viewMode === 'chart' ? theme.primary : theme.textTertiary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[
              styles.viewToggleButton,
              viewMode === 'list' && { backgroundColor: theme.primary + '20' },
            ]}
          >
            <Icon 
              name="format-list-bulleted" 
              size={18} 
              color={viewMode === 'list' ? theme.primary : theme.textTertiary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'chart' ? (
        <TouchableOpacity 
          style={styles.chartSection} 
          activeOpacity={1}
          onPress={() => selectedBar !== null && setSelectedBar(null)}
        >
          {/* Floating tooltip badge */}
          {selectedBar !== null && chartData[selectedBar] && (
            <View style={[
              styles.floatingTooltip,
              { backgroundColor: chartData[selectedBar].frontColor },
              elevation.md,
            ]}>
              <Text style={styles.tooltipText}>
                {chartData[selectedBar].fullLabel}: {formatCurrency(chartData[selectedBar].originalAmount)} ({chartData[selectedBar].percentage}%)
              </Text>
            </View>
          )}
          
          <View style={styles.chartWrapper}>
            <BarChart
              data={chartData}
              barWidth={36}
              spacing={28}
              noOfSections={4}
              barBorderRadius={6}
              frontColor={theme.primary}
              yAxisThickness={0}
              xAxisThickness={0.5}
              xAxisColor={theme.border}
              yAxisTextStyle={[styles.axisLabel, { color: theme.textTertiary }]}
              xAxisLabelTextStyle={[styles.xAxisLabel, { color: theme.textSecondary }]}
              height={180}
              width={SCREEN_WIDTH - 80}
              maxValue={maxValue}
              formatYLabel={formatYLabel}
              yAxisLabelWidth={50}
              hideRules={false}
              rulesType="solid"
              rulesColor={theme.border + '30'}
              rulesThickness={0.5}
              showYAxisIndices={false}
              isAnimated
              animationDuration={600}
              onPress={handleBarPress}
              renderTooltip={() => null}
            />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.listSection}>
          {sortedData.map((item, index) => {
            const percentage = totalAmount > 0 
              ? (item.amount / totalAmount) * 100 
              : 0;
            
            return (
              <Animated.View
                key={item.category}
                entering={FadeInDown.delay(index * 50).duration(300)}
              >
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: theme.border }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemLeft}>
                    <View 
                      style={[
                        styles.categoryDot, 
                        { backgroundColor: item.color || theme.primary }
                      ]} 
                    />
                    <Text style={[styles.categoryName, { color: theme.text }]}>
                      {item.category}
                    </Text>
                  </View>
                  
                  <View style={styles.listItemRight}>
                    <Text style={[styles.categoryAmount, { color: theme.text }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                    <View style={styles.percentageContainer}>
                      <View 
                        style={[
                          styles.percentageBar,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <View 
                          style={[
                            styles.percentageFill,
                            { 
                              backgroundColor: item.color || theme.primary,
                              width: `${Math.min(percentage, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.percentageText, { color: theme.textSecondary }]}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}

      {showLegend && viewMode === 'chart' && (
        <View style={styles.legend}>
          {sortedData.slice(0, 4).map((item, index) => (
            <View key={item.category} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendDot, 
                  { backgroundColor: item.color || theme.primary }
                ]} 
              />
              <Text 
                style={[styles.legendText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
          ))}
          {sortedData.length > 4 && (
            <Text style={[styles.legendMore, { color: theme.textTertiary }]}>
              +{sortedData.length - 4} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  viewToggleButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  chartSection: {
    marginTop: spacing.sm,
    position: 'relative',
  },
  chartWrapper: {
    marginLeft: -10,
    overflow: 'hidden',
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  xAxisLabel: {
    fontSize: 9,
    fontWeight: '500',
    width: 60,
    textAlign: 'center',
  },
  barTopLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    minWidth: 40,
  },
  floatingTooltip: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  tooltipText: {
    ...typography.labelSmall,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  listSection: {
    marginTop: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  categoryName: {
    ...typography.bodyMedium,
    fontWeight: '500',
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  categoryAmount: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 4,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentageBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentageText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '500',
    minWidth: 28,
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
    gap: spacing.sm,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    ...typography.caption,
    fontSize: 11,
    maxWidth: 70,
  },
  legendMore: {
    ...typography.caption,
    fontSize: 10,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMedium,
    marginTop: spacing.sm,
  },
});

export default CategoryBarChart;
