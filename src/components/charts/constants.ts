/**
 * Chart Constants
 * Design tokens and configuration values for the premium chart system
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CHART_CONFIG = {
  defaultHeight: 200,
  defaultWidth: SCREEN_WIDTH - 48,
  
  padding: {
    left: 50,
    right: 20,
    top: 20,
    bottom: 30,
  },
  
  spacing: {
    week: 45,
    month: 35,
    '3month': 20,
    year: 12,
    all: 8,
  },
  
  animation: {
    duration: 300,
    tooltipDelay: 50,
    selectionFeedback: 10,
  },
  
  tooltip: {
    width: 140,
    height: 80,
    offsetY: 12,
    borderRadius: 12,
  },
  
  selection: {
    indicatorRadius: 8,
    lineWidth: 2,
    dashArray: [4, 4],
  },
  
  line: {
    thickness: 2.5,
    curveIntensity: 0.2,
  },
  
  area: {
    startOpacity: 0.25,
    endOpacity: 0.02,
  },
  
  axis: {
    yLabelWidth: 50,
    xLabelHeight: 24,
    numberOfSections: 4,
  },
  
  dataPoints: {
    radius: 4,
    activeRadius: 6,
  },
} as const;

export const CHART_HAPTIC_CONFIG = {
  selection: 'light' as const,
  rangeComplete: 'medium' as const,
  scroll: 'light' as const,
};

export const Y_AXIS_PADDING_RATIO = 0.12;
export const MIN_Y_AXIS_RANGE = 100;

