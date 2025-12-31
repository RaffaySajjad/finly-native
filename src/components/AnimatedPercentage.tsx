/**
 * AnimatedPercentage Component
 * Purpose: Animated percentage change display with trend arrow
 * Features: Entrance animation with bounce, number counting effect, arrow slide-in
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface AnimatedPercentageProps {
  /** Percentage value (positive or negative) */
  value: number;
  /** Invert the color logic (e.g., for expenses where decrease is good) */
  inverted?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as pill/badge style */
  badge?: boolean;
  /** Animation delay in ms */
  delay?: number;
}

const AnimatedPercentage: React.FC<AnimatedPercentageProps> = ({
  value,
  inverted = false,
  size = 'sm',
  badge = true,
  delay = 0,
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const arrowSlideAnim = useRef(new Animated.Value(-10)).current;
  const arrowOpacityAnim = useRef(new Animated.Value(0)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  // Determine visual state
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;
  
  const color = isNeutral 
    ? theme.textTertiary 
    : isPositive 
      ? theme.success 
      : theme.expense;

  const iconName = isNeutral ? 'minus' : value > 0 ? 'trending-up' : 'trending-down';
  
  // Size configuration
  const sizeConfig = {
    sm: { icon: 10, fontSize: 10, padding: 4, paddingH: 6 },
    md: { icon: 14, fontSize: 12, padding: 5, paddingH: 8 },
    lg: { icon: 18, fontSize: 14, padding: 6, paddingH: 10 },
  }[size];

  // Cap display value for readability
  const absValue = Math.abs(value);
  const displayValue = absValue > 999 ? '999+' : absValue.toFixed(1);

  useEffect(() => {
    // Staggered entrance animation
    const animationSequence = Animated.sequence([
      // Delay if specified
      Animated.delay(delay),
      
      // Fade in container and scale with bounce
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: false,
        }),
      ]),
      
      // Arrow slides in and fades in
      Animated.parallel([
        Animated.timing(arrowSlideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(arrowOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
      
      // Number counting effect (smooth interpolation)
      Animated.timing(numberAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animationSequence.start();

    return () => {
      animationSequence.stop();
    };
  }, [delay]);

  // Interpolate for subtle pulse at the end
  const scaleTransform = scaleAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 1.1, 1],
  });

  const containerStyle = badge
    ? [
        styles.badge,
        {
          backgroundColor: color + '15',
          transform: [{ scale: scaleTransform }],
          opacity: containerOpacity,
          paddingVertical: sizeConfig.padding,
          paddingHorizontal: sizeConfig.paddingH,
        },
      ]
    : [
        styles.inline,
        {
          transform: [{ scale: scaleTransform }],
          opacity: containerOpacity,
        },
      ];

  return (
    <Animated.View style={containerStyle}>
      <Animated.View
        style={{
          transform: [{ translateX: arrowSlideAnim }],
          opacity: arrowOpacityAnim,
        }}
      >
        <Icon name={iconName} size={sizeConfig.icon} color={color} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.text,
          {
            color,
            fontSize: sizeConfig.fontSize,
            opacity: numberAnim,
          },
        ]}
      >
        {displayValue}%
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontWeight: '600',
  },
});

export default AnimatedPercentage;
