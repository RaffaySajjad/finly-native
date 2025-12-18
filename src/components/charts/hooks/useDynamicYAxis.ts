/**
 * useDynamicYAxis Hook
 * Calculates and animates Y-axis bounds based on visible data range
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChartDataPoint, VisibleRange } from '../types';
import { calculateYAxisBounds, calculateVisibleRange } from '../utils';
import { CHART_CONFIG } from '../constants';

interface UseDynamicYAxisOptions {
  data: ChartDataPoint[];
  itemSpacing: number;
  chartWidth: number;
  enabled?: boolean;
  debounceMs?: number;
}

interface YAxisBounds {
  min: number;
  max: number;
  sections: number;
}

interface UseDynamicYAxisReturn {
  yAxisBounds: YAxisBounds;
  visibleRange: VisibleRange;
  handleScroll: (scrollX: number) => void;
  recalculate: () => void;
}

export function useDynamicYAxis({
  data,
  itemSpacing,
  chartWidth,
  enabled = true,
  debounceMs = 100,
}: UseDynamicYAxisOptions): UseDynamicYAxisReturn {
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    startIndex: 0,
    endIndex: Math.min(data.length - 1, 10),
    minValue: 0,
    maxValue: 0,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollX = useRef<number>(0);

  const yAxisBounds = useMemo(() => {
    if (!enabled) {
      return calculateYAxisBounds(data);
    }
    return calculateYAxisBounds(data, visibleRange);
  }, [data, visibleRange, enabled]);

  const updateVisibleRange = useCallback((scrollX: number) => {
    if (!data.length) return;

    const newRange = calculateVisibleRange(
      data.length,
      scrollX,
      itemSpacing,
      chartWidth
    );

    const visibleData = data.slice(newRange.startIndex, newRange.endIndex + 1);
    if (visibleData.length > 0) {
      const values = visibleData.map(d => d.value);
      newRange.minValue = Math.min(...values);
      newRange.maxValue = Math.max(...values);
    }

    setVisibleRange(newRange);
  }, [data, itemSpacing, chartWidth]);

  const handleScroll = useCallback((scrollX: number) => {
    if (!enabled) return;
    
    lastScrollX.current = scrollX;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateVisibleRange(scrollX);
    }, debounceMs);
  }, [enabled, updateVisibleRange, debounceMs]);

  const recalculate = useCallback(() => {
    updateVisibleRange(lastScrollX.current);
  }, [updateVisibleRange]);

  useEffect(() => {
    if (data.length > 0) {
      updateVisibleRange(0);
    }
  }, [data.length, updateVisibleRange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    yAxisBounds,
    visibleRange,
    handleScroll,
    recalculate,
  };
}

export default useDynamicYAxis;

