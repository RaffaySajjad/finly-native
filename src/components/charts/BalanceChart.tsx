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
import { formatYAxisLabel, formatChartDate, normalizeData } from './utils';
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
  curved?: boolean;
  showArea?: boolean;
}

const MAX_CHART_POINTS = 40;

export const BalanceChart: React.FC<BalanceChartProps> = ({
  data,
  periodLabel,
  enableRangeSelection = true,
  enableDynamicYAxis = false,
  curved = true,
  showArea = true,
}) => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, convertFromUSD, getCurrencySymbol } = useCurrency();
  const currencySymbol = getCurrencySymbol();
  
  const chartWidth = SCREEN_WIDTH - 50;
  const chartHeight = CHART_CONFIG.defaultHeight;

  // 1. Convert all points to display currency and sample if needed
  const processedPoints = useMemo(() => {
    const allPoints = data.map((d, index) => ({
      value: convertFromUSD(d.balance),
      originalValue: d.balance,
      date: d.date,
      index,
    }));

    let sampled = allPoints;
    if (allPoints.length > MAX_CHART_POINTS) {
      const step = Math.ceil(allPoints.length / MAX_CHART_POINTS);
      sampled = [];
      for (let i = 0; i < allPoints.length; i += step) {
        sampled.push(allPoints[i]);
      }
      if (sampled[sampled.length - 1].date !== allPoints[allPoints.length - 1].date) {
        sampled.push(allPoints[allPoints.length - 1]);
      }
    }
    return sampled;
  }, [data, convertFromUSD]);

  // 2. Normalize values to 0-100 for SVG stability
  const { normalizedData, min: rawMin, max: rawMax, range: rawRange } = useMemo(() => {
    // Map to the internal type expected by utils
    const points = processedPoints.map(p => ({
      ...p,
      value: p.value as number,
    })) as ChartDataPoint[];

    return normalizeData(points);
  }, [processedPoints]);

  // 3. Final chart data with labels
  const chartData: ChartDataPoint[] = useMemo(() => {
    const labelInterval = Math.ceil(normalizedData.length / 7);
    return normalizedData.map((p: ChartDataPoint, i: number) => ({
      ...p,
      label: i % labelInterval === 0 ? formatChartDate(p.date || '', 'short') : '',
    }));
  }, [normalizedData]);

  const itemSpacing = chartData.length <= 7 ? 40 : chartData.length <= 30 ? 30 : 25;

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


  const formatYLabel = useCallback((val: string) => {
    const normalizedVal = parseFloat(val);
    if (isNaN(normalizedVal)) return val;

    // Map internal 0-100 back to raw balance
    const originalRawValue = rawMin + (normalizedVal / 100) * rawRange;
    return formatYAxisLabel(originalRawValue, currencySymbol);
  }, [rawMin, rawRange, currencySymbol]);

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
              initialSpacing={10}
              endSpacing={10}
              color={theme.primary}
              thickness={4}
              startFillColor={theme.primary}
              endFillColor={theme.primary}
              startOpacity={0.2}
              endOpacity={0.05}
              areaChart={showArea}
              curved={curved}
              curvature={0.25}
              hideRules={false}
              rulesType="solid"
              rulesColor={theme.border + '20'}
              rulesThickness={1}
              yAxisColor="transparent"
              xAxisColor={theme.border}
              xAxisThickness={1}
              yAxisTextStyle={[styles.axisLabel, { color: theme.textTertiary }]}
              xAxisLabelTextStyle={[styles.axisLabel, { color: theme.textTertiary }]}
              yAxisLabelWidth={CHART_CONFIG.axis.yLabelWidth}
              maxValue={101}
              mostNegativeValue={-1}
              noOfSections={4}
              formatYLabel={formatYLabel}
              hideDataPoints={false}
              dataPointsColor={theme.primary}
              dataPointsRadius={4}
              focusEnabled={false}
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
    overflow: 'hidden',
    height: 300,
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
    height: 220,
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
