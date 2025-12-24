/**
 * SettingItem Component
 * Purpose: Reusable settings row with icon, title, subtitle, and right component
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 * Extracted from ProfileScreen for reusability
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  containerStyle?: any;
}

/**
 * SettingItem - Reusable settings row component
 * @param icon - Icon name to display
 * @param title - Main title text
 * @param subtitle - Optional subtitle text
 * @param onPress - Press handler
 * @param rightComponent - Optional right component (e.g., Switch, Chevron)
 * @param containerStyle - Custom container styles
 */
const SettingItem: React.FC<SettingItemProps> = React.memo(({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  containerStyle,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        containerStyle,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <Icon name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent || (onPress && <Icon name="chevron-right" size={24} color={theme.textTertiary} />)}
    </TouchableOpacity>
  );
});

SettingItem.displayName = 'SettingItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default SettingItem;

