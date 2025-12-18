/**
 * RangeSelectionBadge Component
 * Displays the percentage change between two selected points (Yahoo Finance style)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { RangeChangeMetrics } from './types';

interface RangeSelectionBadgeProps {
  visible: boolean;
  metrics: RangeChangeMetrics | null;
  startLabel: string;
  endLabel: string;
  startFormatted: string;
  endFormatted: string;
  onClear: () => void;
}

export const RangeSelectionBadge: React.FC<RangeSelectionBadgeProps> = ({
  visible,
  metrics,
  startLabel,
  endLabel,
  startFormatted,
  endFormatted,
  onClear,
}) => {
  const { theme } = useTheme();

  if (!visible || !metrics) return null;

  const changeColor = metrics.isPositive ? theme.success : theme.expense;
  const changeIcon = metrics.isPositive ? 'trending-up' : 'trending-down';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.md,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.periodContainer}>
          <Text style={[styles.periodLabel, { color: theme.textTertiary }]}>
            {startLabel}
          </Text>
          <Icon
            name="arrow-right"
            size={14}
            color={theme.textTertiary}
            style={styles.arrow}
          />
          <Text style={[styles.periodLabel, { color: theme.textTertiary }]}>
            {endLabel}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
        >
          <Icon name="close" size={16} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.valuesRow}>
          <View style={styles.valueColumn}>
            <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>
              From
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {startFormatted}
            </Text>
          </View>
          
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: changeColor + '15' },
            ]}
          >
            <Icon name={changeIcon} size={18} color={changeColor} />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {metrics.formattedChange}
            </Text>
          </View>
          
          <View style={[styles.valueColumn, styles.valueColumnEnd]}>
            <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>
              To
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {endFormatted}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.accentBar, { backgroundColor: changeColor }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodLabel: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  arrow: {
    marginHorizontal: 6,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueColumn: {
    flex: 1,
  },
  valueColumnEnd: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    ...typography.titleSmall,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
    marginHorizontal: spacing.sm,
  },
  changeText: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});

export default RangeSelectionBadge;

