/**
 * useRangeSelection Hook
 * Manages two-point range selection state for charts (Yahoo Finance style)
 */

import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RangeSelection, RangeChangeMetrics, ChartDataPoint } from '../types';
import { calculateRangeMetrics } from '../utils';
import { CHART_HAPTIC_CONFIG } from '../constants';

interface UseRangeSelectionOptions {
  data: ChartDataPoint[];
  enabled?: boolean;
  onRangeChange?: (metrics: RangeChangeMetrics | null) => void;
}

interface UseRangeSelectionReturn {
  selection: RangeSelection;
  metrics: RangeChangeMetrics | null;
  isSelecting: boolean;
  hasSelection: boolean;
  selectPoint: (index: number) => void;
  clearSelection: () => void;
  startIndex: number | null;
  endIndex: number | null;
}

export function useRangeSelection({
  data,
  enabled = true,
  onRangeChange,
}: UseRangeSelectionOptions): UseRangeSelectionReturn {
  const [selection, setSelection] = useState<RangeSelection>({
    startIndex: null,
    endIndex: null,
    startValue: null,
    endValue: null,
    startDate: undefined,
    endDate: undefined,
  });

  const triggerHaptic = useCallback((type: 'selection' | 'rangeComplete') => {
    const intensity = type === 'rangeComplete' 
      ? Haptics.ImpactFeedbackStyle.Medium 
      : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(intensity);
  }, []);

  const selectPoint = useCallback((index: number) => {
    if (!enabled || !data[index]) return;

    const point = data[index];
    
    setSelection(prev => {
      if (prev.startIndex === null) {
        triggerHaptic('selection');
        return {
          startIndex: index,
          endIndex: null,
          startValue: point.value,
          endValue: null,
          startDate: point.date,
          endDate: undefined,
        };
      }
      
      if (prev.endIndex === null && prev.startIndex !== index) {
        triggerHaptic('rangeComplete');
        
        const [startIdx, endIdx] = prev.startIndex < index 
          ? [prev.startIndex, index]
          : [index, prev.startIndex];
        
        const startPoint = data[startIdx];
        const endPoint = data[endIdx];
        
        return {
          startIndex: startIdx,
          endIndex: endIdx,
          startValue: startPoint.value,
          endValue: endPoint.value,
          startDate: startPoint.date,
          endDate: endPoint.date,
        };
      }
      
      triggerHaptic('selection');
      return {
        startIndex: index,
        endIndex: null,
        startValue: point.value,
        endValue: null,
        startDate: point.date,
        endDate: undefined,
      };
    });
  }, [enabled, data, triggerHaptic]);

  const clearSelection = useCallback(() => {
    setSelection({
      startIndex: null,
      endIndex: null,
      startValue: null,
      endValue: null,
      startDate: undefined,
      endDate: undefined,
    });
    onRangeChange?.(null);
  }, [onRangeChange]);

  const metrics = useMemo(() => {
    if (selection.startValue === null || selection.endValue === null) {
      return null;
    }
    
    const result = calculateRangeMetrics(selection.startValue, selection.endValue);
    onRangeChange?.(result);
    return result;
  }, [selection.startValue, selection.endValue, onRangeChange]);

  const isSelecting = selection.startIndex !== null && selection.endIndex === null;
  const hasSelection = selection.startIndex !== null && selection.endIndex !== null;

  return {
    selection,
    metrics,
    isSelecting,
    hasSelection,
    selectPoint,
    clearSelection,
    startIndex: selection.startIndex,
    endIndex: selection.endIndex,
  };
}

export default useRangeSelection;

