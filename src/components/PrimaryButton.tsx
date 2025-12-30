/**
 * PrimaryButton Component
 * Purpose: Reusable primary action button with loading state
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import ScaleButton from './ScaleButton';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'success' | 'danger';
  containerStyle?: any;
}

/**
 * PrimaryButton - Reusable primary action button
 * @param label - Button label
 * @param onPress - Press handler
 * @param loading - Show loading indicator (default: false)
 * @param disabled - Disable button (default: false)
 * @param icon - Optional icon name
 * @param fullWidth - Make button full width (default: false)
 * @param size - Button size (default: medium)
 * @param variant - Button variant (default: primary)
 * @param containerStyle - Custom container styles
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = React.memo(({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  size = 'medium',
  variant = 'primary',
  containerStyle,
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return theme.border;
    switch (variant) {
      case 'success':
        return theme.success;
      case 'danger':
        return theme.expense;
      default:
        return theme.primary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return spacing.sm;
      case 'large':
        return spacing.lg;
      default:
        return spacing.md;
    }
  };

  return (
    <ScaleButton
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor(), paddingVertical: getPadding() },
        fullWidth && styles.fullWidth,
        elevation.sm,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      hapticArgs="medium"
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon as any} size={20} color="#FFFFFF" />}
          <Text style={[styles.label, size === 'small' && styles.labelSmall]}>
            {label}
          </Text>
        </View>
      )}
    </ScaleButton>
  );
});

PrimaryButton.displayName = 'PrimaryButton';

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  labelSmall: {
    ...typography.labelMedium,
  },
});

export default PrimaryButton;

