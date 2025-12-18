/**
 * BalanceChart Component
 * Premium balance trend visualization with range selection and dynamic Y-axis
 * Features: Two-point selection with % change (Yahoo Finance style), dynamic Y-axis on scroll
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { ChartDataPoint } from './types';
import { CHART_CONFIG } from './constants';
import { formatYAxisLabel, formatChartDate, calculateRangeMetrics } from './utils';
import { useRangeSelection } from './hooks/useRangeSelection';
import { useDynamicYAxis } from './hooks/useDynamicYAxis';
import { RangeSelectionBadge } from './RangeSelectionBadge';

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
  const spacing = data.length <= 7 ? 50 : data.length <= 14 ? 40 : 35;

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

  const {
    selection,
    metrics: rangeMetrics,
    hasSelection,
    isSelecting,
    selectPoint,
    clearSelection,
  } = useRangeSelection({
    data: chartData,
    enabled: enableRangeSelection,
  });

  const {
    yAxisBounds,
    handleScroll,
  } = useDynamicYAxis({
    data: chartData,
    itemSpacing: spacing,
    chartWidth,
    enabled: enableDynamicYAxis,
  });

  const formatYLabel = useCallback((val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return formatYAxisLabel(num, currencySymbol);
  }, [currencySymbol]);

  const handleDataPointClick = useCallback((item: any, index: number) => {
    if (enableRangeSelection) {
      selectPoint(index);
    }
  }, [enableRangeSelection, selectPoint]);

  const getDataPointColor = useCallback((index: number) => {
    if (!enableRangeSelection) return theme.primary;
    
    if (selection.startIndex === index || selection.endIndex === index) {
      return isDark ? '#60A5FA' : theme.primary;
    }
    
    if (hasSelection && 
        selection.startIndex !== null && 
        selection.endIndex !== null &&
        index > selection.startIndex && 
        index < selection.endIndex) {
      return theme.primary + '80';
    }
    
    return theme.primary;
  }, [enableRangeSelection, selection, hasSelection, theme, isDark]);

  const getDataPointRadius = useCallback((index: number) => {
    if (selection.startIndex === index || selection.endIndex === index) {
      return CHART_CONFIG.dataPoints.activeRadius;
    }
    return CHART_CONFIG.dataPoints.radius;
  }, [selection]);

  const selectionLabels = useMemo(() => {
    if (!hasSelection || !selection.startIndex === null) {
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
    activatePointersOnLongPress: !enableRangeSelection,
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
          {enableRangeSelection && (
            <Text style={[styles.tooltipHint, { color: theme.textTertiary }]}>
              {isSelecting ? 'Tap another point' : 'Tap to select'}
            </Text>
          )}
        </View>
      );
    },
  };

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
        
        {enableRangeSelection && !hasSelection && (
          <View style={[styles.hintBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.hintText, { color: theme.primary }]}>
              Tap two points to compare
            </Text>
          </View>
        )}
      </View>

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
          spacing={spacing}
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
          focusEnabled={true}
          showDataPointOnFocus={true}
          focusedDataPointColor={isDark ? '#60A5FA' : theme.primary}
          focusedDataPointRadius={CHART_CONFIG.dataPoints.activeRadius}
          onFocus={handleDataPointClick}
          delayBeforeUnFocus={3000}
          pointerConfig={pointerConfig}
          showVerticalLines={hasSelection}
          verticalLinesUptoDataPoint
          verticalLinesColor={
            hasSelection 
              ? (rangeMetrics?.isPositive ? theme.success : theme.expense) + '30'
              : theme.border + '30'
          }
          verticalLinesThickness={1}
          verticalLinesStrokeDashArray={[4, 4]}
          customDataPoint={(item: any, index: number) => {
            const isSelected = selection.startIndex === index || selection.endIndex === index;
            const isInRange = hasSelection && 
              selection.startIndex !== null && 
              selection.endIndex !== null &&
              index >= selection.startIndex && 
              index <= selection.endIndex;
            
            if (!isSelected && !isInRange) return null;
            
            const pointColor = isSelected 
              ? (rangeMetrics?.isPositive ? theme.success : theme.expense)
              : theme.primary + '60';
            const pointRadius = isSelected 
              ? CHART_CONFIG.dataPoints.activeRadius + 2
              : CHART_CONFIG.dataPoints.radius;
            
            return (
              <View
                style={[
                  styles.customDataPoint,
                  {
                    width: pointRadius * 2,
                    height: pointRadius * 2,
                    borderRadius: pointRadius,
                    backgroundColor: pointColor,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: theme.card,
                  },
                  isSelected && elevation.sm,
                ]}
              />
            );
          }}
        />
      </View>

      {enableDynamicYAxis && (
        <Text style={[styles.dynamicAxisHint, { color: theme.textTertiary }]}>
          Scroll to see dynamic Y-axis adjustment
        </Text>
      )}
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
  tooltipHint: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
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
