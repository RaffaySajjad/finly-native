/**
 * InputGroup Component
 * Purpose: Reusable input group with label and error handling
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface InputGroupProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: any;
}

/**
 * InputGroup - Reusable input group component
 * @param label - Input label
 * @param error - Error message to display
 * @param helperText - Helper text below input
 * @param required - Show required indicator
 * @param containerStyle - Custom container styles
 * @param ...rest - All TextInput props
 */
const InputGroup: React.FC<InputGroupProps> = React.memo(({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  ...inputProps
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
        {required && <Text style={{ color: theme.expense }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            borderColor: error ? theme.expense : theme.border,
            color: theme.text,
          },
        ]}
        placeholderTextColor={theme.textTertiary}
        {...inputProps}
      />
      {error && (
        <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
      )}
      {helperText && !error && (
        <Text style={[styles.helperText, { color: theme.textTertiary }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
});

InputGroup.displayName = 'InputGroup';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
});

export default InputGroup;

