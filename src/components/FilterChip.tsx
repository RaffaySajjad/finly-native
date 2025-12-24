/**
 * FilterChip Component
 * Purpose: Reusable filter chip with icon, label, and close button
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { borderRadius, spacing } from '../theme';
import { typography } from '../theme';

interface FilterChipProps {
  label: string;
  icon?: string;
  color: string;
  backgroundColor: string;
  onPress?: () => void;
  onClose?: () => void;
  showIcon?: boolean;
}

/**
 * FilterChip - Reusable filter chip component
 * @param label - Chip label text
 * @param icon - Optional icon name
 * @param color - Text and icon color
 * @param backgroundColor - Background color
 * @param onPress - Handler for chip press
 * @param onClose - Handler for close button press
 * @param showIcon - Show icon (default: true)
 */
const FilterChip: React.FC<FilterChipProps> = React.memo(({
  label,
  icon,
  color,
  backgroundColor,
  onPress,
  onClose,
  showIcon = true,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor, borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {showIcon && icon && (
        <Icon name={icon as any} size={14} color={color} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="close" size={12} color={color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

FilterChip.displayName = 'FilterChip';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs / 2,
    height: 28,
  },
  label: {
    ...typography.labelSmall,
    fontWeight: '600',
    fontSize: 11,
  },
  closeButton: {
    marginLeft: spacing.xs / 2,
    padding: 2,
  },
});

export default FilterChip;

