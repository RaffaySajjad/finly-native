/**
 * Chart Utilities
 * Helper functions for chart calculations and formatting
 */

import { ChartDataPoint, RangeChangeMetrics, VisibleRange } from './types';
import { Y_AXIS_PADDING_RATIO, MIN_Y_AXIS_RANGE, CHART_CONFIG } from './constants';

/**
 * Calculate Y-axis bounds for a dataset with smart padding
 */
export function calculateYAxisBounds(
  data: ChartDataPoint[],
  visibleRange?: VisibleRange,
  useNormalizedRange = false
): { min: number; max: number; sections: number } {
  if (useNormalizedRange) {
    return { min: 0, max: 100, sections: 4 };
  }

  if (!data || data.length === 0) {
    return { min: 0, max: 100, sections: 4 };
  }
  let values: number[];
  
  if (visibleRange) {
    values = data
      .slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map(d => d.value);
  } else {
    values = data.map(d => d.value);
  }

  if (values.length === 0) {
    return { min: 0, max: 100, sections: 4 };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  let range = maxValue - minValue;

  // Handle zero-range or small range cases
  if (range < 0.01) {
    range = MIN_Y_AXIS_RANGE;
  }

  const padding = range * Y_AXIS_PADDING_RATIO;

  // Stabilize bounds: Avoid negative minimum if all data is positive
  let adjustedMin = minValue - padding;
  if (minValue >= 0 && adjustedMin < 0) {
    adjustedMin = 0;
  }
  
  const adjustedMax = maxValue + padding;

  return {
    min: adjustedMin,
    max: adjustedMax,
    sections: CHART_CONFIG.axis.numberOfSections || 4,
  };
}

/**
 * Calculate metrics for range selection
 */
export function calculateRangeMetrics(
  startValue: number,
  endValue: number
): RangeChangeMetrics {
  const absoluteChange = endValue - startValue;
  const percentageChange = startValue !== 0 
    ? ((endValue - startValue) / Math.abs(startValue)) * 100 
    : 0;
  
  const isPositive = absoluteChange >= 0;
  
  const sign = isPositive ? '+' : '';
  const formattedPercentage = Math.abs(percentageChange) > 999 
    ? '999+' 
    : percentageChange.toFixed(2);
  const formattedChange = `${sign}${formattedPercentage}%`;

  return {
    absoluteChange,
    percentageChange,
    isPositive,
    formattedChange,
  };
}

/**
 * Format Y-axis label with smart abbreviation
 */
export function formatYAxisLabel(value: number, currencySymbol = ''): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${currencySymbol}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${currencySymbol}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 10_000) {
    return `${sign}${currencySymbol}${(absValue / 1_000).toFixed(0)}k`;
  }
  if (absValue >= 1_000) {
    return `${sign}${currencySymbol}${(absValue / 1_000).toFixed(1)}k`;
  }
  
  return `${sign}${currencySymbol}${Math.round(absValue)}`;
}

/**
 * Format date for chart labels
 */
export function formatChartDate(
  dateString: string,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const date = new Date(dateString);
  
  switch (format) {
    case 'long':
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case 'medium':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'short':
    default:
      return date.getDate().toString();
  }
}

/**
 * Calculate visible data range based on scroll position
 */
export function calculateVisibleRange(
  totalItems: number,
  scrollX: number,
  itemWidth: number,
  viewportWidth: number,
  buffer = 2
): VisibleRange {
  const itemsInView = Math.ceil(viewportWidth / itemWidth);
  const scrolledItems = Math.floor(scrollX / itemWidth);
  
  const startIndex = Math.max(0, scrolledItems - buffer);
  const endIndex = Math.min(totalItems - 1, scrolledItems + itemsInView + buffer);

  return {
    startIndex,
    endIndex,
    minValue: 0,
    maxValue: 0,
  };
}

/**
 * Interpolate color between two colors
 */
export function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate nice tick values for Y-axis
 */
export function generateNiceTicks(
  min: number,
  max: number,
  count: number
): number[] {
  const range = max - min;
  const roughStep = range / (count - 1);
  
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  let niceStep: number;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  else niceStep = 10;
  
  niceStep *= magnitude;
  
  const niceMin = Math.floor(min / niceStep) * niceStep;
  
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    ticks.push(niceMin + i * niceStep);
  }
  
  return ticks;
}

/**
 * Determine if a value represents a significant change
 */
export function isSignificantChange(
  percentageChange: number,
  threshold = 5
): boolean {
  return Math.abs(percentageChange) >= threshold;
}

/**
 * Normalize data to a 0-100 range for SVG rendering stability
 */
export function normalizeData(
  data: ChartDataPoint[]
): { normalizedData: ChartDataPoint[]; min: number; max: number; range: number } {
  if (!data || data.length === 0) {
    return { normalizedData: [], min: 0, max: 100, range: 100 };
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1; // Avoid division by zero

  const normalizedData = data.map(d => ({
    ...d,
    value: ((d.value - min) / range) * 100,
  }));

  return { normalizedData, min, max, range };
}

