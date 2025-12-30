/**
 * NumberTicker.tsx
 * Purpose: A premium text component that animates numerical changes,
 * simulating a slot machine or rapid count-up effect.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface NumberTickerProps {
  value: number;
  style?: TextStyle;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimalPlaces?: number;
}

const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  style,
  prefix = '',
  suffix = '',
  duration = 800,
  decimalPlaces = 2,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useRef(new Animated.Value(value)).current;
  const { theme } = useTheme();

  useEffect(() => {
    // Animate to new value
    Animated.timing(animatedValue, {
      toValue: value,
      duration: duration,
      useNativeDriver: false, // Required for text updates via listener
    }).start();

    // Listen to value changes
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration]);

  // Format number with commas
  const formatNumber = (num: number) => {
    // For large numbers, round to specified decimals during animation to reduce jitter
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  return (
    <View style={styles.container}>
       <Text 
        style={[style]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {prefix}{formatNumber(displayValue)}{suffix}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NumberTicker;
