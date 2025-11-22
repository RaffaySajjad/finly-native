/**
 * SectionHeader Component
 * Purpose: Reusable section header with title and optional "See All" action
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing } from '../theme';

interface SectionHeaderProps {
  title: string;
  showSeeAll?: boolean;
  onSeeAllPress?: () => void;
  seeAllText?: string;
  rightComponent?: React.ReactNode;
}

/**
 * SectionHeader - Reusable section header with optional action
 * @param title - Section title
 * @param showSeeAll - Show "See All" link (default: false)
 * @param onSeeAllPress - Handler for "See All" press
 * @param seeAllText - Custom text for "See All" (default: "See All")
 * @param rightComponent - Optional custom right component
 */
const SectionHeader: React.FC<SectionHeaderProps> = React.memo(({
  title,
  showSeeAll = false,
  onSeeAllPress,
  seeAllText = 'See All',
  rightComponent,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {showSeeAll && onSeeAllPress ? (
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: theme.primary }]}>{seeAllText}</Text>
        </TouchableOpacity>
      ) : rightComponent}
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  seeAll: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
});

export default SectionHeader;

