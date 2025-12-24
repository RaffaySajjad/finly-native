/**
 * ChartTooltip Component
 * Premium tooltip with smart positioning and elegant design
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { CHART_CONFIG } from './constants';
import { formatChartDate } from './utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChartTooltipProps {
  visible: boolean;
  value: string;
  date?: string;
  label?: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  x: number;
  y: number;
  chartWidth: number;
  chartHeight: number;
  accentColor?: string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  visible,
  value,
  date,
  label,
  secondaryValue,
  secondaryLabel,
  x,
  y,
  chartWidth,
  chartHeight,
  accentColor,
}) => {
  const { theme } = useTheme();

  const { tooltipX, tooltipY, pointerPosition } = useMemo(() => {
    const tooltipWidth = CHART_CONFIG.tooltip.width;
    const tooltipHeight = secondaryValue 
      ? CHART_CONFIG.tooltip.height + 20 
      : CHART_CONFIG.tooltip.height;
    const offset = CHART_CONFIG.tooltip.offsetY;

    let posX = x - tooltipWidth / 2;
    let posY = y - tooltipHeight - offset;
    let pointer: 'bottom' | 'top' = 'bottom';

    const leftBound = 8;
    const rightBound = chartWidth - tooltipWidth - 8;
    
    if (posX < leftBound) {
      posX = leftBound;
    } else if (posX > rightBound) {
      posX = rightBound;
    }

    if (posY < 0) {
      posY = y + offset + 8;
      pointer = 'top';
    }

    return {
      tooltipX: posX,
      tooltipY: posY,
      pointerPosition: pointer,
    };
  }, [x, y, chartWidth, secondaryValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: 150 }),
      transform: [
        { translateX: tooltipX },
        { translateY: tooltipY },
        {
          scale: withSpring(visible ? 1 : 0.9, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  }, [visible, tooltipX, tooltipY]);

  const formattedDate = useMemo(() => {
    if (!date) return label || '';
    return formatChartDate(date, 'medium');
  }, [date, label]);

  if (!visible && !value) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        elevation.md,
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      {pointerPosition === 'top' && (
        <View
          style={[
            styles.pointer,
            styles.pointerTop,
            { borderBottomColor: theme.card },
          ]}
        />
      )}

      <View style={styles.content}>
        {formattedDate && (
          <Text
            style={[styles.dateText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {formattedDate}
          </Text>
        )}

        <Text
          style={[
            styles.valueText,
            { color: accentColor || theme.text },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        {secondaryValue && secondaryLabel && (
          <View style={styles.secondaryRow}>
            <Text
              style={[styles.secondaryLabel, { color: theme.textTertiary }]}
            >
              {secondaryLabel}:
            </Text>
            <Text
              style={[styles.secondaryValue, { color: theme.textSecondary }]}
            >
              {secondaryValue}
            </Text>
          </View>
        )}
      </View>

      {pointerPosition === 'bottom' && (
        <View
          style={[
            styles.pointer,
            styles.pointerBottom,
            { borderTopColor: theme.card },
          ]}
        />
      )}

      {accentColor && (
        <View
          style={[styles.accentBar, { backgroundColor: accentColor }]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CHART_CONFIG.tooltip.width,
    minHeight: CHART_CONFIG.tooltip.height,
    borderRadius: CHART_CONFIG.tooltip.borderRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  dateText: {
    ...typography.caption,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  valueText: {
    ...typography.titleMedium,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  secondaryLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  secondaryValue: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  pointer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pointerTop: {
    top: -6,
    borderBottomWidth: 6,
  },
  pointerBottom: {
    bottom: -6,
    borderTopWidth: 6,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: CHART_CONFIG.tooltip.borderRadius,
    borderBottomLeftRadius: CHART_CONFIG.tooltip.borderRadius,
  },
});

export default ChartTooltip;

