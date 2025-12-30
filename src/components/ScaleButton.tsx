/**
 * ScaleButton Component
 * Purpose: A wrapper for TouchableOpacity that adds premium scale animation ("squish") 
 * and haptic feedback on press.
 */

import React, { useRef } from 'react';
import {
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { useHaptics } from '../hooks/useHaptics';

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  scaleAmount?: number; // Alias for scaleTo
  disabled?: boolean;
  hapticArgs?: 'light' | 'medium' | 'heavy' | 'selection' | 'success';
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'success'; // Alias for hapticArgs
  activeOpacity?: number; // Not used with TouchableWithoutFeedback but kept for API compatibility if we switch
}

const ScaleButton: React.FC<ScaleButtonProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleTo = 0.96,
  scaleAmount,
  disabled = false,
  hapticArgs = 'medium',
  hapticFeedback,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const haptics = useHaptics();

  // Support alias props
  const finalScaleTo = scaleAmount ?? scaleTo;
  const finalHapticArgs = hapticFeedback ?? hapticArgs;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleValue, {
      toValue: finalScaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    
    // Trigger haptic feedback
    if (haptics[finalHapticArgs]) {
      haptics[finalHapticArgs]();
    } else {
      haptics.medium();
    }

    if (onPress) {
      onPress(e);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleValue }],
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default ScaleButton;
