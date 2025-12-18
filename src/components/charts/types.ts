/**
 * Chart Types and Interfaces
 * Shared type definitions for the premium chart system
 */

export interface ChartDataPoint {
  value: number;
  label?: string;
  date?: string;
  originalValue?: number;
  color?: string;
  category?: string;
}

export interface RangeSelection {
  startIndex: number | null;
  endIndex: number | null;
  startValue: number | null;
  endValue: number | null;
  startDate?: string;
  endDate?: string;
}

export interface RangeChangeMetrics {
  absoluteChange: number;
  percentageChange: number;
  isPositive: boolean;
  formattedChange: string;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  minValue: number;
  maxValue: number;
}

export interface TooltipData {
  value: number;
  formattedValue: string;
  date?: string;
  label?: string;
  x: number;
  y: number;
  index: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

export type TimeRange = 'week' | 'month' | '3month' | 'year' | 'all';

export interface ChartTheme {
  lineColor: string;
  areaGradientStart: string;
  areaGradientEnd: string;
  gridColor: string;
  labelColor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  selectionColor: string;
  positiveColor: string;
  negativeColor: string;
}

