/**
 * SkeletonLoader - Animated placeholder for loading states
 * Purpose: Provides smooth loading experience while data fetches
 * Features: Pulse animation, customizable shapes
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * SkeletonLoader - Animated loading placeholder
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: customBorderRadius = borderRadius.sm,
  style,
}) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: customBorderRadius,
          backgroundColor: theme.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * SkeletonCard - Full card skeleton for expense cards
 */
export const SkeletonCard: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardRow}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={styles.cardContent}>
          <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
        <SkeletonLoader width={60} height={20} />
      </View>
    </View>
  );
};

/**
 * SkeletonCategoryCard - Category card skeleton
 */
export const SkeletonCategoryCard: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.categoryHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.categoryInfo}>
          <SkeletonLoader width="50%" height={16} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="70%" height={12} />
        </View>
      </View>
      <View style={styles.progressContainer}>
        <SkeletonLoader width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
};

/**
 * SkeletonInsightCard - Insight card skeleton
 */
export const SkeletonInsightCard: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.insightHeader}>
        <SkeletonLoader width={32} height={32} borderRadius={16} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="90%" height={14} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

