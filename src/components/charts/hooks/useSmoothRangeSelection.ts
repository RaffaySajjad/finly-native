/**
 * useSmoothRangeSelection Hook
 * Enterprise-grade gesture-based selection for charts
 * 
 * COORDINATE SYSTEM:
 * - GestureDetector wraps chartWrapper which has marginLeft: -10
 * - LineChart has yAxisLabelWidth (50px) + initialSpacing (20px)
 * - So first data point is at x = yAxisOffset (from wrapper) + initialSpacing
 * 
 * GESTURES:
 * - Single finger long-press (50ms): Shows tooltip for touched point
 * - Two-finger pan: Shows percent change between start and current point
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RangeSelection, RangeChangeMetrics, ChartDataPoint } from '../types';
import { calculateRangeMetrics } from '../utils';

interface UseSmoothRangeSelectionOptions {
  data: ChartDataPoint[];
  enabled?: boolean;
  chartWidth: number;
  itemSpacing: number;
  initialSpacing?: number;
  /** 
   * Offset from the GestureDetector wrapper to where data points start.
   * Typically: yAxisLabelWidth (50) + wrapperMarginLeft adjustment (10) = 60
   * For charts without the -10 margin adjustment, use yAxisLabelWidth (50)
   */
  yAxisOffset?: number;
  onRangeChange?: (metrics: RangeChangeMetrics | null) => void;
  onSinglePointSelect?: (point: ChartDataPoint | null, index: number) => void;
}

interface SelectionState {
  startIdx: number;
  endIdx: number;
  isActive: boolean;
  isTwoFinger: boolean;
}

interface SinglePointInfo {
  index: number;
  value: number;
  originalValue?: number;
  date?: string;
  label?: string;
}

interface UseSmoothRangeSelectionReturn {
  hasSelection: boolean;
  hasSinglePoint: boolean;
  isSelecting: boolean;
  selection: RangeSelection;
  singlePoint: SinglePointInfo | null;
  metrics: RangeChangeMetrics | null;
  gesture: ReturnType<typeof Gesture.Exclusive>;
  clearSelection: () => void;
}

/**
 * Convert touch x-coordinate to data point index
 * 
 * @param x - Touch x position relative to GestureDetector wrapper
 * @param itemSpacing - Spacing between data points
 * @param initialSpacing - Chart's initialSpacing prop (space before first point)
 * @param yAxisOffset - Offset for Y-axis labels + wrapper margin adjustments
 * @param dataLength - Number of data points
 */
function xPositionToIndex(
  x: number,
  itemSpacing: number,
  initialSpacing: number,
  yAxisOffset: number,
  dataLength: number
): number {
  'worklet';
  // x is relative to the GestureDetector wrapper
  // Data points start at: yAxisOffset + initialSpacing
  // Each subsequent point is at: yAxisOffset + initialSpacing + (index * itemSpacing)
  const dataAreaStart = yAxisOffset + initialSpacing;
  const adjustedX = x - dataAreaStart;
  const index = Math.round(adjustedX / itemSpacing);
  return Math.max(0, Math.min(index, dataLength - 1));
}

export function useSmoothRangeSelection({
  data,
  enabled = true,
  chartWidth,
  itemSpacing,
  initialSpacing = 20,
  yAxisOffset = 40, // Default: 50 (yAxisLabelWidth) - 10 (wrapper marginLeft)
  onRangeChange,
  onSinglePointSelect,
}: UseSmoothRangeSelectionOptions): UseSmoothRangeSelectionReturn {
  
  const [selectionState, setSelectionState] = useState<SelectionState>({
    startIdx: -1,
    endIdx: -1,
    isActive: false,
    isTwoFinger: false,
  });
  
  const lastHapticIndex = useRef<number>(-1);

  // Haptic feedback
  const triggerHaptic = useCallback((style: 'light' | 'medium' = 'light') => {
    Haptics.impactAsync(
      style === 'medium' 
        ? Haptics.ImpactFeedbackStyle.Medium 
        : Haptics.ImpactFeedbackStyle.Light
    );
  }, []);

  // State update functions (called from worklets via runOnJS)
  const updateSinglePoint = useCallback((index: number) => {
    setSelectionState({
      startIdx: index,
      endIdx: index,
      isActive: true,
      isTwoFinger: false,
    });
  }, []);

  const updateRangeSelection = useCallback((startIdx: number, endIdx: number) => {
    setSelectionState({
      startIdx,
      endIdx,
      isActive: true,
      isTwoFinger: true,
    });
  }, []);

  const clearSelectionInternal = useCallback(() => {
    setSelectionState({
      startIdx: -1,
      endIdx: -1,
      isActive: false,
      isTwoFinger: false,
    });
    lastHapticIndex.current = -1;
    onRangeChange?.(null);
    onSinglePointSelect?.(null, -1);
  }, [onRangeChange, onSinglePointSelect]);

  const onPointCrossed = useCallback((index: number) => {
    if (index !== lastHapticIndex.current) {
      lastHapticIndex.current = index;
      triggerHaptic('light');
    }
  }, [triggerHaptic]);

  // Shared values for worklet communication
  const startIdx = useSharedValue(-1);
  const endIdx = useSharedValue(-1);

  // GESTURE 1: Single-finger long press for tooltip
  // Tooltip persists after touch ends - user must tap close or select another point
  const singleFingerGesture = useMemo(() => {
    return Gesture.LongPress()
      .enabled(enabled)
      .minDuration(50) // Quick activation
      .maxDistance(30) // Allow slight finger movement
      .numberOfPointers(1) // EXACTLY one finger
      .onStart((event) => {
        'worklet';
        const index = xPositionToIndex(
          event.x,
          itemSpacing,
          initialSpacing,
          yAxisOffset,
          data.length
        );
        
        startIdx.value = index;
        endIdx.value = index;
        
        runOnJS(triggerHaptic)('light');
        runOnJS(updateSinglePoint)(index);
      })
      .onEnd(() => {
        'worklet';
        // Don't clear selection - let tooltip persist after touch ends
        // User can dismiss by tapping the close button or selecting another point
        startIdx.value = -1;
        endIdx.value = -1;
        // Note: We intentionally do NOT call clearSelectionInternal() here
        // This allows the tooltip to remain visible after the long press ends
      });
  }, [enabled, data.length, itemSpacing, initialSpacing, yAxisOffset, triggerHaptic, updateSinglePoint]);

  // GESTURE 2: Two-finger pan for range comparison
  const twoFingerGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .minPointers(2)
      .maxPointers(2)
      .minDistance(0)
      .onBegin((event) => {
        'worklet';
        const index = xPositionToIndex(
          event.x,
          itemSpacing,
          initialSpacing,
          yAxisOffset,
          data.length
        );
        
        startIdx.value = index;
        endIdx.value = index;
        
        runOnJS(triggerHaptic)('medium');
        runOnJS(updateRangeSelection)(index, index);
      })
      .onUpdate((event) => {
        'worklet';
        const currentIndex = xPositionToIndex(
          event.x,
          itemSpacing,
          initialSpacing,
          yAxisOffset,
          data.length
        );
        
        if (currentIndex !== endIdx.value) {
          endIdx.value = currentIndex;
          runOnJS(onPointCrossed)(currentIndex);
          runOnJS(updateRangeSelection)(startIdx.value, currentIndex);
        }
      })
      .onEnd(() => {
        'worklet';
        startIdx.value = -1;
        endIdx.value = -1;
        runOnJS(clearSelectionInternal)();
      })
      .onFinalize(() => {
        'worklet';
        startIdx.value = -1;
        endIdx.value = -1;
        runOnJS(clearSelectionInternal)();
      });
  }, [enabled, data.length, itemSpacing, initialSpacing, yAxisOffset, triggerHaptic, updateRangeSelection, onPointCrossed, clearSelectionInternal]);

  // Combine gestures using Exclusive - two-finger wins if detected, otherwise single-finger
  // Order matters: first gesture in array wins if both could handle the event
  const combinedGesture = useMemo(() => {
    return Gesture.Exclusive(twoFingerGesture, singleFingerGesture);
  }, [twoFingerGesture, singleFingerGesture]);

  // Public clear selection
  const clearSelection = useCallback(() => {
    setSelectionState({
      startIdx: -1,
      endIdx: -1,
      isActive: false,
      isTwoFinger: false,
    });
    startIdx.value = -1;
    endIdx.value = -1;
    lastHapticIndex.current = -1;
    onRangeChange?.(null);
    onSinglePointSelect?.(null, -1);
  }, [onRangeChange, onSinglePointSelect]);

  // Derived state
  const { startIdx: stateStartIdx, endIdx: stateEndIdx, isActive, isTwoFinger } = selectionState;
  
  const hasAnySelection = stateStartIdx >= 0 && stateEndIdx >= 0;
  const hasSelection = hasAnySelection && stateStartIdx !== stateEndIdx && isTwoFinger;
  const hasSinglePoint = hasAnySelection && !isTwoFinger;
  const isSelecting = isActive;

  // Normalized indices for range selection
  const normalizedStart = hasSelection ? Math.min(stateStartIdx, stateEndIdx) : null;
  const normalizedEnd = hasSelection ? Math.max(stateStartIdx, stateEndIdx) : null;

  // Single point info
  const singlePoint: SinglePointInfo | null = useMemo(() => {
    if (!hasSinglePoint || stateStartIdx < 0 || stateStartIdx >= data.length) {
      return null;
    }
    
    const point = data[stateStartIdx];
    return {
      index: stateStartIdx,
      value: point.value,
      originalValue: point.originalValue,
      date: point.date,
      label: point.label,
    };
  }, [hasSinglePoint, stateStartIdx, data]);

  // Range selection object
  const selection: RangeSelection = useMemo(() => {
    if (normalizedStart === null || normalizedEnd === null) {
      return {
        startIndex: null,
        endIndex: null,
        startValue: null,
        endValue: null,
        startDate: undefined,
        endDate: undefined,
      };
    }

    const startPoint = data[normalizedStart];
    const endPoint = data[normalizedEnd];

    return {
      startIndex: normalizedStart,
      endIndex: normalizedEnd,
      startValue: startPoint?.value ?? null,
      endValue: endPoint?.value ?? null,
      startDate: startPoint?.date,
      endDate: endPoint?.date,
    };
  }, [data, normalizedStart, normalizedEnd]);

  // Range metrics
  const metrics: RangeChangeMetrics | null = useMemo(() => {
    if (selection.startValue === null || selection.endValue === null) {
      return null;
    }
    return calculateRangeMetrics(selection.startValue, selection.endValue);
  }, [selection.startValue, selection.endValue]);

  return {
    hasSelection,
    hasSinglePoint,
    isSelecting,
    selection,
    singlePoint,
    metrics,
    gesture: combinedGesture,
    clearSelection,
  };
}

export default useSmoothRangeSelection;



