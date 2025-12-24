/**
 * SinglePointBadge Component
 * Displays the date and value for a single selected point on the chart
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';

interface SinglePointBadgeProps {
  visible: boolean;
  date: string;
  value: string;
  onClear: () => void;
  accentColor?: string;
}

export const SinglePointBadge: React.FC<SinglePointBadgeProps> = ({
  visible,
  date,
  value,
  onClear,
  accentColor,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  const accent = accentColor || theme.primary;

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
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}>
            <Icon name="chart-line-variant" size={18} color={accent} />
          </View>
        </View>
        
        <View style={styles.info}>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {date}
          </Text>
          <Text style={[styles.valueText, { color: theme.text }]}>
            {value}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
        >
          <Icon name="close" size={18} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 4, // Account for accent bar
    gap: spacing.sm,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  dateText: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  valueText: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  clearButton: {
    padding: 4,
  },
});

export default SinglePointBadge;

