/**
 * CountingNumber Component
 * Purpose: Animated number transitions with currency formatting and color-coded changes
 * 
 * Usage:
 * <CountingNumber value={1234.56} duration={500} isCurrency />
 */

import React, { useEffect, useRef } from 'react';
import { Text, Animated, TextStyle, StyleProp } from 'react-native';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { timingPresetsJS } from '../../theme/AnimationConfig';

interface CountingNumberProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  colorCoded?: boolean; // Green for positive, red for negative
  prefix?: string;
  suffix?: string;
}

export const CountingNumber: React.FC<CountingNumberProps> = ({
  value,
  duration = 500,
  isCurrency = false,
  decimals = 2,
  style,
  colorCoded = false,
  prefix = '',
  suffix = '',
}) => {
  const { formatCurrency } = useCurrency();
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const previousValue = useRef(0);

  useEffect(() => {
    animatedValue.setValue(previousValue.current);
    
    Animated.timing(animatedValue, {
      toValue: value,
      ...timingPresetsJS.smooth,
    }).start();

    previousValue.current = value;
  }, [value]);

  const [displayValue, setDisplayValue] = React.useState('0');

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value: currentValue }) => {
      let formatted: string;
      
      if (isCurrency) {
        formatted = formatCurrency(currentValue);
      } else {
        formatted = currentValue.toFixed(decimals);
      }

      setDisplayValue(`${prefix}${formatted}${suffix}`);
    });

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [animatedValue, isCurrency, decimals, prefix, suffix]);

  const getColor = () => {
    if (!colorCoded) return undefined;
    if (value > 0) return theme.income || '#10B981';
    if (value < 0) return theme.expense || '#EF4444';
    return theme.text;
  };

  return (
    <Text style={[style, { color: getColor() }]}>
      {displayValue}
    </Text>
  );
};
