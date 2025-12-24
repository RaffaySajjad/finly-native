/**
 * GradientCard Component
 * Purpose: Reusable card with gradient background
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius } from '../theme';

interface GradientCardProps {
  children: React.ReactNode;
  colors: [string, string, ...string[]]; // LinearGradient requires at least 2 colors
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  containerStyle?: any;
  contentStyle?: any;
}

/**
 * GradientCard - Reusable gradient background card
 * @param children - Card content
 * @param colors - Gradient colors array
 * @param startPoint - Gradient start point (default: { x: 0, y: 0 })
 * @param endPoint - Gradient end point (default: { x: 1, y: 1 })
 * @param containerStyle - Custom container styles (outer wrapper)
 * @param contentStyle - Custom content styles (applied to gradient with padding)
 */
const GradientCard: React.FC<GradientCardProps> = React.memo(({
  children,
  colors,
  startPoint = { x: 0, y: 0 },
  endPoint = { x: 1, y: 1 },
  containerStyle,
  contentStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={colors}
        start={startPoint}
        end={endPoint}
        style={[styles.gradient, contentStyle]}
      >
        {children}
      </LinearGradient>
    </View>
  );
});

GradientCard.displayName = 'GradientCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden'
  },
  gradient: {
    borderRadius: borderRadius.xl,
  },
});

export default GradientCard;

