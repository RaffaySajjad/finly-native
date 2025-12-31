/**
 * SpendingChart Component
 * Premium spending trend visualization with smooth gesture-based range selection
 * Features: Time range toggle, long-press + drag comparison, dynamic scaling
 * Supports single point selection (shows value) and range selection (shows % change)
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { ChartDataPoint } from './types';
import { CHART_CONFIG } from './constants';
import { formatYAxisLabel, formatChartDate } from './utils';
import { useSmoothRangeSelection } from './hooks/useSmoothRangeSelection';
import { useDynamicYAxis } from './hooks/useDynamicYAxis';
import { RangeSelectionBadge } from './RangeSelectionBadge';
import { SinglePointBadge } from './SinglePointBadge';
import ChartEmptyState from './ChartEmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpendingChartProps {
  data: Array<{ date: string; amount: number }>;
  timeRange: 'week' | 'month';
  onTimeRangeChange: (range: 'week' | 'month') => void;
  enableRangeSelection?: boolean;
  enableDynamicYAxis?: boolean;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  enableRangeSelection = true,
  enableDynamicYAxis = true,
}) => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, convertFromUSD, getCurrencySymbol } = useCurrency();
  const currencySymbol = getCurrencySymbol();

  const chartWidth = SCREEN_WIDTH - 50;
  const chartHeight = CHART_CONFIG.defaultHeight;
  
  const chartSpacing = useMemo(() => {
    if (timeRange === 'week') {
      return Math.max((chartWidth - 60) / Math.max(data.length - 1, 1), 40);
    }
    return 35;
  }, [timeRange, chartWidth, data.length]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((item, index) => ({
      value: convertFromUSD(item.amount),
      originalValue: item.amount,
      label: timeRange === 'month' && index % 2 !== 0 
        ? '' 
        : formatChartDate(item.date, 'short'),
      date: item.date,
    }));
  }, [data, convertFromUSD, timeRange]);

  // Use the new smooth gesture-based range selection (long-press + drag)
  const {
    selection,
    singlePoint,
    metrics: rangeMetrics,
    hasSelection,
    hasSinglePoint,
    isSelecting,
    gesture,
    clearSelection,
  } = useSmoothRangeSelection({
    data: chartData,
    enabled: enableRangeSelection,
    chartWidth,
    itemSpacing: chartSpacing,
    initialSpacing: 20,
    yAxisOffset: CHART_CONFIG.axis.yLabelWidth - 10, // Account for wrapper marginLeft: -10
  });

  const {
    yAxisBounds,
    handleScroll,
  } = useDynamicYAxis({
    data: chartData,
    itemSpacing: chartSpacing,
    chartWidth,
    enabled: enableDynamicYAxis && timeRange === 'month',
  });

  const formatYLabel = useCallback((val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return formatYAxisLabel(num, currencySymbol);
  }, [currencySymbol]);

  const selectionLabels = useMemo(() => {
    if (!hasSelection || selection.startIndex === null || selection.endIndex === null) {
      return { start: '', end: '', startFormatted: '', endFormatted: '' };
    }

    const startPoint = chartData[selection.startIndex];
    const endPoint = chartData[selection.endIndex];

    return {
      start: startPoint?.date ? formatChartDate(startPoint.date, 'medium') : '',
      end: endPoint?.date ? formatChartDate(endPoint.date, 'medium') : '',
      startFormatted: formatCurrency(startPoint?.originalValue || 0),
      endFormatted: formatCurrency(endPoint?.originalValue || 0),
    };
  }, [hasSelection, selection, chartData, formatCurrency]);

  // Single point label
  const singlePointLabels = useMemo(() => {
    if (!hasSinglePoint || !singlePoint) {
      return { date: '', value: '' };
    }

    return {
      date: singlePoint.date ? formatChartDate(singlePoint.date, 'medium') : '',
      value: formatCurrency(singlePoint.originalValue ?? singlePoint.value),
    };
  }, [hasSinglePoint, singlePoint, formatCurrency]);

  const totalSpending = useMemo(() => {
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const avgSpending = useMemo(() => {
    return data.length > 0 ? totalSpending / data.length : 0;
  }, [totalSpending, data.length]);

  const pointerConfig = {
    pointerStripUptoDataPoint: true,
    pointerStripColor: theme.border,
    pointerStripWidth: 1.5,
    strokeDashArray: [4, 4],
    pointerColor: theme.expense,
    radius: CHART_CONFIG.dataPoints.radius,
    pointerLabelWidth: 140,
    pointerLabelHeight: 90,
    activatePointersOnLongPress: true,
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
          <View style={[styles.tooltipAccent, { backgroundColor: theme.expense }]} />
          <Text style={[styles.tooltipDate, { color: theme.textSecondary }]}>
            {item.date ? formatChartDate(item.date, 'medium') : ''}
          </Text>
          <Text style={[styles.tooltipValue, { color: theme.text }]}>
            {formatCurrency(item.originalValue)}
          </Text>
        </View>
      );
    },
  };

  // Handle time range change - clear selection when changing
  const handleTimeRangeChange = (range: 'week' | 'month') => {
    if (range !== timeRange) {
      clearSelection();
      onTimeRangeChange(range);
    }
  };

  // Determine which point indices to highlight
  const selectedPointIndex = hasSinglePoint ? singlePoint?.index : null;

  // Check if we have data to display
  const hasData = data && data.length > 0;

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.card, borderColor: theme.border }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.text }]}>
            Spending History
          </Text>
          {hasData && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total</Text>
                <Text style={[styles.statValue, { color: theme.expense }]}>
                  {formatCurrency(totalSpending)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Avg/Day</Text>
                <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                  {formatCurrency(avgSpending)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.toggleContainer}>
          {(['week', 'month'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => handleTimeRangeChange(range)}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: timeRange === range 
                    ? theme.primary 
                    : 'transparent',
                  borderColor: timeRange === range 
                    ? theme.primary 
                    : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: timeRange === range 
                      ? '#FFFFFF' 
                      : theme.textSecondary,
                  },
                ]}
              >
                {range === 'week' ? '7D' : '30D'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Empty state when no data */}
      {!hasData && (
        <ChartEmptyState
          variant="line"
          title="No spending data for this period"
          subtitle="Add expenses to see your spending history"
          compact
        />
      )}

      {/* Chart area with gesture handler */}
      {hasData && (
      <View style={styles.chartArea}>
        {/* Absolutely positioned badge overlay - Single Point */}
        {hasSinglePoint && (
          <View style={styles.badgeOverlay}>
            <SinglePointBadge
              visible={hasSinglePoint}
              date={singlePointLabels.date}
              value={singlePointLabels.value}
              onClear={clearSelection}
              accentColor={theme.expense}
            />
          </View>
        )}

        {/* Absolutely positioned badge overlay - Range Selection */}
        {hasSelection && rangeMetrics && (
          <View style={styles.badgeOverlay}>
            <RangeSelectionBadge
              visible={hasSelection}
              metrics={rangeMetrics}
              startLabel={selectionLabels.start}
              endLabel={selectionLabels.end}
              startFormatted={selectionLabels.startFormatted}
              endFormatted={selectionLabels.endFormatted}
              onClear={clearSelection}
            />
          </View>
        )}

        {/* Gesture-enabled chart wrapper */}
        <GestureDetector gesture={gesture}>
          <View style={styles.chartWrapper}>
            <LineChart
              key={timeRange}
              data={chartData}
              width={chartWidth}
              height={chartHeight}
              spacing={chartSpacing}
              initialSpacing={20}
              endSpacing={20}
              color={theme.expense}
              thickness={CHART_CONFIG.line.thickness}
              startFillColor={theme.expense}
              endFillColor={theme.expense}
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
              scrollToEnd={timeRange === 'month'}
              onScroll={(e: any) => {
                if (enableDynamicYAxis && timeRange === 'month' && e?.nativeEvent?.contentOffset) {
                  handleScroll(e.nativeEvent.contentOffset.x);
                }
              }}
              hideDataPoints={false}
              dataPointsColor={theme.expense}
              dataPointsRadius={CHART_CONFIG.dataPoints.radius}
              pointerConfig={enableRangeSelection ? undefined : pointerConfig}
              showVerticalLines={hasSelection || hasSinglePoint}
              verticalLinesUptoDataPoint
              verticalLinesColor={
                hasSelection
                  ? (rangeMetrics?.isPositive ? theme.expense : theme.success) + '30'
                  : theme.expense + '30'
              }
              verticalLinesThickness={1}
              verticalLinesStrokeDashArray={[4, 4]}
              customDataPoint={(item: any, index: number) => {
                const isRangeSelected = selection.startIndex === index || selection.endIndex === index;
                const isSingleSelected = selectedPointIndex === index;
                const isInRange = hasSelection &&
                  selection.startIndex !== null &&
                  selection.endIndex !== null &&
                  index >= selection.startIndex &&
                  index <= selection.endIndex;

                if (!isRangeSelected && !isSingleSelected && !isInRange) return null;

                let pointColor: string;
                let pointRadius: number;

                if (isSingleSelected) {
                  pointColor = theme.expense;
                  pointRadius = CHART_CONFIG.dataPoints.activeRadius + 2;
                } else if (isRangeSelected) {
                  pointColor = theme.expense;
                  pointRadius = CHART_CONFIG.dataPoints.activeRadius + 2;
                } else {
                  pointColor = theme.expense + '60';
                  pointRadius = CHART_CONFIG.dataPoints.radius;
                }

                return (
                  <View
                    style={[
                      styles.customDataPoint,
                      {
                        width: pointRadius * 2,
                        height: pointRadius * 2,
                        borderRadius: pointRadius,
                        backgroundColor: pointColor,
                        borderWidth: (isRangeSelected || isSingleSelected) ? 2 : 0,
                        borderColor: theme.card,
                      },
                      (isRangeSelected || isSingleSelected) && elevation.sm,
                    ]}
                  />
                );
              }}
            />
          </View>
        </GestureDetector>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    gap: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  hintText: {
    ...typography.caption,
    fontSize: 11,
    fontStyle: 'italic',
  },
  chartArea: {
    position: 'relative',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.xs,
  },
  chartWrapper: {
    marginLeft: -10,
    marginRight: -5,
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
  axisLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  customDataPoint: {
    position: 'absolute',
    top: -4,
    left: -4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  emptyStateHint: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default SpendingChart;
