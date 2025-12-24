/**
 * BalanceChart Component
 * Premium balance trend visualization with smooth gesture-based range selection
 * Features: Long-press + drag range selection (stock app style), dynamic Y-axis on scroll
 * Supports single point selection (shows value) and range selection (shows % change)
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface BalanceChartProps {
  data: BalanceDataPoint[];
  periodLabel?: string;
  enableRangeSelection?: boolean;
  enableDynamicYAxis?: boolean;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({
  data,
  periodLabel,
  enableRangeSelection = true,
  enableDynamicYAxis = true,
}) => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, convertFromUSD, getCurrencySymbol } = useCurrency();
  const currencySymbol = getCurrencySymbol();
  
  const chartWidth = SCREEN_WIDTH - 50;
  const chartHeight = CHART_CONFIG.defaultHeight;
  const itemSpacing = data.length <= 7 ? 50 : data.length <= 14 ? 40 : 35;

  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d, index) => ({
      value: convertFromUSD(d.balance),
      originalValue: d.balance,
      label: index % Math.ceil(data.length / 7) === 0 
        ? formatChartDate(d.date, 'short') 
        : '',
      date: d.date,
    }));
  }, [data, convertFromUSD]);

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
    itemSpacing,
    initialSpacing: 20,
    yAxisOffset: CHART_CONFIG.axis.yLabelWidth - 10, // Account for wrapper marginLeft: -10
  });

  const {
    yAxisBounds,
    handleScroll,
  } = useDynamicYAxis({
    data: chartData,
    itemSpacing,
    chartWidth,
    enabled: enableDynamicYAxis,
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

  if (!data || data.length === 0) return null;

  const pointerConfig = {
    pointerStripUptoDataPoint: true,
    pointerStripColor: theme.border,
    pointerStripWidth: 1.5,
    strokeDashArray: [4, 4],
    pointerColor: theme.primary,
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
          <View style={[styles.tooltipAccent, { backgroundColor: theme.primary }]} />
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

  // Determine which point indices to highlight
  const selectedPointIndex = hasSinglePoint ? singlePoint?.index : null;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.card, borderColor: theme.border }
    ]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Balance Trend
          </Text>
          {periodLabel && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {periodLabel}
            </Text>
          )}
        </View>


      </View>

      {/* Chart area with gesture handler */}
      <View style={styles.chartArea}>
        {/* Absolutely positioned badge overlay - Single Point */}
        {hasSinglePoint && (
          <View style={styles.badgeOverlay}>
            <SinglePointBadge
              visible={hasSinglePoint}
              date={singlePointLabels.date}
              value={singlePointLabels.value}
              onClear={clearSelection}
              accentColor={theme.primary}
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
              data={chartData}
              width={chartWidth}
              height={chartHeight}
              spacing={itemSpacing}
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
              scrollToEnd
              onScroll={(e: any) => {
                if (enableDynamicYAxis && e?.nativeEvent?.contentOffset) {
                  handleScroll(e.nativeEvent.contentOffset.x);
                }
              }}
              hideDataPoints={false}
              dataPointsColor={theme.primary}
              dataPointsRadius={CHART_CONFIG.dataPoints.radius}
              pointerConfig={enableRangeSelection ? undefined : pointerConfig}
              showVerticalLines={hasSelection || hasSinglePoint}
              verticalLinesUptoDataPoint
              verticalLinesColor={
                hasSelection 
                  ? (rangeMetrics?.isPositive ? theme.success : theme.expense) + '30'
                  : theme.primary + '30'
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
                  pointColor = theme.primary;
                  pointRadius = CHART_CONFIG.dataPoints.activeRadius + 2;
                } else if (isRangeSelected) {
                  pointColor = rangeMetrics?.isPositive ? theme.success : theme.expense;
                  pointRadius = CHART_CONFIG.dataPoints.activeRadius + 2;
                } else {
                  pointColor = theme.primary + '60';
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


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
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
  hintBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  hintText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
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
  dynamicAxisHint: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default BalanceChart;
