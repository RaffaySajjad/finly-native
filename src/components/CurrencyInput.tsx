/**
 * CurrencyInput Component
 * Purpose: Reusable currency input with real-time formatting
 * Features: Auto-formats with commas, shows currency symbol, handles decimals
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrencyInput, parseCurrencyInput, currencyInputToNumber } from '../utils/currencyFormatter';
import { typography, spacing, borderRadius } from '../theme';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  onValueChange?: (numericValue: number) => void;
  showSymbol?: boolean;
  allowDecimals?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  symbolStyle?: any;
  large?: boolean;
}

/**
 * CurrencyInput - A text input that automatically formats currency as user types
 * @param value - The numeric string value (without formatting)
 * @param onChangeText - Callback with unformatted string value
 * @param onValueChange - Optional callback with numeric value
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @param allowDecimals - Whether to allow decimals (default: true)
 * @param large - Use large text style (default: false)
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeText,
  onValueChange,
  showSymbol = true,
  allowDecimals = true,
  containerStyle,
  inputStyle,
  symbolStyle,
  large = false,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const { getCurrencySymbol } = useCurrency();
  const [displayValue, setDisplayValue] = useState('');

  // Initialize display value from prop value
  useEffect(() => {
    if (value === '') {
      setDisplayValue('');
    } else {
      const formatted = formatCurrencyInput(value, allowDecimals);
      setDisplayValue(formatted);
    }
  }, [value, allowDecimals]);

  /**
   * Handle text change with real-time formatting
   */
  const handleChangeText = (text: string) => {
    // Format the input
    const formatted = formatCurrencyInput(text, allowDecimals);
    setDisplayValue(formatted);
    
    // Parse back to plain numeric string
    const plain = parseCurrencyInput(formatted);
    onChangeText(plain);
    
    // If onValueChange callback provided, call it with numeric value
    if (onValueChange) {
      const numericValue = currencyInputToNumber(formatted);
      onValueChange(numericValue);
    }
  };

  const textStyle = large ? styles.inputLarge : styles.input;
  const symbolTextStyle = large ? styles.symbolLarge : styles.symbol;

  return (
    <View style={[styles.container, containerStyle]}>
      {showSymbol && (
        <Text style={[symbolTextStyle, { color: theme.text }, symbolStyle]}>
          {getCurrencySymbol()}
        </Text>
      )}
      <TextInput
        {...textInputProps}
        style={[
          textStyle,
          { color: theme.text },
          inputStyle,
        ]}
        value={displayValue}
        onChangeText={handleChangeText}
        keyboardType="decimal-pad"
        placeholder={textInputProps.placeholder || '0.00'}
        placeholderTextColor={textInputProps.placeholderTextColor || theme.textTertiary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  symbolLarge: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  input: {
    ...typography.titleMedium,
    flex: 1,
  },
  inputLarge: {
    ...typography.displayMedium,
    fontWeight: '700',
    flex: 1,
  },
});

export default CurrencyInput;

