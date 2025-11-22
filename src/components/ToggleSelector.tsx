/**
 * ToggleSelector Component
 * Purpose: Reusable toggle selector for switching between options
 * Follows: SOLID principles (SRP, OCP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

export interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleSelectorProps {
  options: ToggleOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  fullWidth?: boolean;
}

/**
 * ToggleSelector - Reusable toggle selector component
 * @param options - Array of toggle options
 * @param selectedValue - Currently selected value
 * @param onValueChange - Handler for value change
 * @param fullWidth - Make buttons take full width (default: false)
 */
const ToggleSelector: React.FC<ToggleSelectorProps> = React.memo(({
  options,
  selectedValue,
  onValueChange,
  fullWidth = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, fullWidth && styles.containerFullWidth]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.button,
            fullWidth && styles.buttonFullWidth,
            {
              backgroundColor: selectedValue === option.value ? theme.primary : theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={() => onValueChange(option.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: selectedValue === option.value ? '#FFFFFF' : theme.text,
                fontWeight: selectedValue === option.value ? '600' : '400',
              },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

ToggleSelector.displayName = 'ToggleSelector';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  containerFullWidth: {
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonFullWidth: {
    flex: 1,
  },
  buttonText: {
    ...typography.labelMedium,
  },
});

export default ToggleSelector;

