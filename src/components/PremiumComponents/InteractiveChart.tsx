/**
 * InteractiveChart Component
 * Purpose: Premium animated chart for expense/income visualization
 * Features: Touch interactions, animated transitions, performance-aware rendering
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { spacing, borderRadius, typography } from '../../theme';
import { brandGradients, glowEffects } from '../../theme/DesignTokens';
import { springPresets } from '../../theme/AnimationConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  type?: 'bar' | 'pie' | 'donut';
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  onSegmentPress?: (segment: ChartDataPoint, index: number) => void;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

const DEFAULT_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  type = 'donut',
  height = 200,
  showLabels = true,
  showValues = true,
  animated = true,
  onSegmentPress,
  formatValue = (v) => v.toFixed(0),
  centerLabel,
  centerValue,
}) => {
  const { theme } = useTheme();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Animation values
  const animatedValues = useRef(data.map(() => new Animated.Value(0))).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Animate on mount
  useEffect(() => {
    if (animated && shouldUseComplexAnimations) {
      // Scale in animation
      Animated.spring(scaleValue, {
        toValue: 1,
        ...springPresets.bouncy,
        useNativeDriver: true,
      }).start();

      // Staggered segment animations
      const animations = animatedValues.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400 + index * 100,
          useNativeDriver: true,
        })
      );
      Animated.stagger(50, animations).start();
    } else {
      // No animation - set immediately
      scaleValue.setValue(1);
      animatedValues.forEach(anim => anim.setValue(1));
    }
  }, [data.length]);

  const handleSegmentPress = (segment: ChartDataPoint, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(selectedIndex === index ? null : index);
    onSegmentPress?.(segment, index);
  };

  // Render bar chart
  const renderBarChart = () => {
    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * (data.length - 1)) / data.length;
    
    return (
      <Animated.View 
        style={[
          styles.barChartContainer, 
          { height, transform: [{ scale: scaleValue }] }
        ]}
      >
        <View style={styles.barsRow}>
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * (height - 40);
            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const isSelected = selectedIndex === index;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.barWrapper}
                onPress={() => handleSegmentPress(item, index)}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: Math.min(barWidth, 50),
                      backgroundColor: color,
                      opacity: animatedValues[index],
                      transform: [
                        { 
                          scaleY: animatedValues[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          })
                        },
                        { scale: isSelected ? 1.05 : 1 }
                      ],
                    },
                    isSelected && shouldUseGlowEffects && {
                      shadowColor: color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    },
                  ]}
                />
                {showLabels && (
                  <Text 
                    style={[styles.barLabel, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                )}
                {showValues && isSelected && (
                  <Animated.View style={[styles.valueTooltip, { backgroundColor: theme.card }]}>
                    <Text style={[styles.valueText, { color: theme.text }]}>
                      {formatValue(item.value)}
                    </Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  // Render donut/pie chart
  const renderDonutChart = () => {
    const size = Math.min(height, SCREEN_WIDTH - spacing.xl * 2);
    const radius = size / 2;
    const innerRadius = type === 'donut' ? radius * 0.6 : 0;
    let cumulativePercentage = 0;

    return (
      <Animated.View 
        style={[
          styles.donutContainer, 
          { 
            width: size, 
            height: size,
            transform: [{ scale: scaleValue }] 
          }
        ]}
      >
        {/* Segments */}
        <View style={styles.donutSegments}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const isSelected = selectedIndex === index;
            
            // Calculate rotation for this segment
            const startAngle = (cumulativePercentage / 100) * 360;
            cumulativePercentage += percentage;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.donutSegment,
                  {
                    position: 'absolute',
                    width: size,
                    height: size,
                  },
                ]}
                onPress={() => handleSegmentPress(item, index)}
                activeOpacity={0.9}
              >
                <Animated.View
                  style={[
                    styles.segmentFill,
                    {
                      backgroundColor: color,
                      opacity: animatedValues[index],
                      transform: [
                        { rotate: `${startAngle}deg` },
                        { scale: isSelected ? 1.02 : 1 },
                      ],
                    },
                    isSelected && shouldUseGlowEffects && {
                      shadowColor: color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 12,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center content for donut */}
        {type === 'donut' && (
          <View style={[styles.donutCenter, { backgroundColor: theme.background }]}>
            {centerLabel && (
              <Text style={[styles.centerLabel, { color: theme.textSecondary }]}>
                {centerLabel}
              </Text>
            )}
            {centerValue && (
              <Text style={[styles.centerValue, { color: theme.text }]}>
                {centerValue}
              </Text>
            )}
          </View>
        )}

        {/* Legend */}
        {showLabels && (
          <View style={styles.legend}>
            {data.map((item, index) => {
              const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              const percentage = ((item.value / total) * 100).toFixed(1);
              const isSelected = selectedIndex === index;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.legendItem,
                    isSelected && { backgroundColor: theme.card },
                  ]}
                  onPress={() => handleSegmentPress(item, index)}
                >
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text 
                    style={[styles.legendLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text style={[styles.legendPercentage, { color: theme.textSecondary }]}>
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {type === 'bar' ? renderBarChart() : renderDonutChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  // Bar chart styles
  barChartContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  barLabel: {
    ...typography.labelSmall,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 10,
  },
  valueTooltip: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  valueText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  // Donut chart styles
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSegments: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  donutSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  donutCenter: {
    position: 'absolute',
    width: '55%',
    height: '55%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerValue: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  legend: {
    marginTop: spacing.lg,
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendLabel: {
    ...typography.bodyMedium,
    flex: 1,
  },
  legendPercentage: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
});

export default InteractiveChart;
