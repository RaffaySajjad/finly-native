/**
 * Header Component
 * Purpose: Reusable screen header with optional back button, title, and right actions
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  centerTitle?: boolean;
}

/**
 * Header - Reusable screen header component
 * @param title - Main header title
 * @param subtitle - Optional subtitle text
 * @param showBackButton - Show back navigation button
 * @param onBackPress - Back button press handler
 * @param rightComponent - Optional component to render on the right
 * @param centerTitle - Center align the title (default: false)
 */
const Header: React.FC<HeaderProps> = React.memo(({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightComponent,
  centerTitle = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity
          onPress={onBackPress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      
      <View style={[styles.titleContainer, centerTitle && styles.titleContainerCentered]}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightComponent}
      </View>
    </View>
  );
});

Header.displayName = 'Header';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  titleContainerCentered: {
    alignItems: 'center',
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default Header;

