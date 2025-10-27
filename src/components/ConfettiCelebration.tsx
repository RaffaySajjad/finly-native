/**
 * ConfettiCelebration - Success animation component
 * Purpose: Display confetti animation for achievements and milestones
 * Features: Particle animation with emojis
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface ConfettiCelebrationProps {
  active: boolean;
  onAnimationEnd?: () => void;
}

/**
 * ConfettiCelebration - Confetti animation for achievements
 */
export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  active,
  onAnimationEnd,
}) => {
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (active && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: 0, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={350}
        fallSpeed={2000}
        onAnimationEnd={onAnimationEnd}
        colors={['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444']}
      />
    </View>
  );
};

export default ConfettiCelebration;

