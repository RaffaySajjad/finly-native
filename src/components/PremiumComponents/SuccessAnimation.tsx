/**
 * SuccessAnimation Component
 * Purpose: Animated checkmark with optional confetti effect for success states
 * 
 * Usage:
 * <SuccessAnimation size={100} showConfetti onComplete={() => {}} />
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { springPresets } from '../../theme/AnimationConfig';

interface SuccessAnimationProps {
  size?: number;
  color?: string;
  showConfetti?: boolean;
  onComplete?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  size = 80,
  color,
  showConfetti = false,
  onComplete,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Checkmark animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          ...springPresets.bouncy,
        }),
        Animated.spring(rotateAnim, {
          toValue: 1,
          ...springPresets.bouncy,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...springPresets.gentle,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.checkmarkContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color || theme.income || '#10B981',
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Icon name="check" size={size * 0.6} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
