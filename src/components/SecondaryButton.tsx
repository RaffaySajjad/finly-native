/**
 * SecondaryButton Component
 * Purpose: Reusable secondary/outline action button
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import ScaleButton from './ScaleButton';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  containerStyle?: any;
}

/**
 * SecondaryButton - Reusable secondary/outline button
 * @param label - Button label
 * @param onPress - Press handler
 * @param loading - Show loading indicator (default: false)
 * @param disabled - Disable button (default: false)
 * @param icon - Optional icon name
 * @param fullWidth - Make button full width (default: false)
 * @param size - Button size (default: medium)
 * @param containerStyle - Custom container styles
 */
const SecondaryButton: React.FC<SecondaryButtonProps> = React.memo(({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  size = 'medium',
  containerStyle,
}) => {
  const { theme } = useTheme();

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

  const textColor = disabled ? theme.textTertiary : theme.text;

  return (
    <ScaleButton
      style={[
        styles.button,
        {
          borderColor: disabled ? theme.border : theme.textSecondary,
          paddingVertical: getPadding(),
        },
        fullWidth && styles.fullWidth,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      hapticArgs="light"
    >
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon as any} size={20} color={textColor} />}
          <Text style={[styles.label, { color: textColor }, size === 'small' && styles.labelSmall]}>
            {label}
          </Text>
        </View>
      )}
    </ScaleButton>
  );
});

SecondaryButton.displayName = 'SecondaryButton';

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
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
    ...typography.labelMedium,
    fontWeight: '600',
  },
  labelSmall: {
    ...typography.labelSmall,
  },
});

export default SecondaryButton;

