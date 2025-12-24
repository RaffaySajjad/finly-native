/**
 * ChartContainer Component
 * Unified wrapper for all charts with consistent styling and features
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  onInfoPress?: () => void;
  showBorder?: boolean;
  animateEntry?: boolean;
  entryDelay?: number;
  testID?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  headerRight,
  onInfoPress,
  showBorder = true,
  animateEntry = true,
  entryDelay = 0,
  testID,
}) => {
  const { theme } = useTheme();

  const Container = animateEntry ? Animated.View : View;
  const animationProps = animateEntry 
    ? { entering: FadeInDown.delay(entryDelay).duration(400) }
    : {};

  return (
    <Container
      {...animationProps}
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: showBorder ? theme.border : 'transparent',
          borderWidth: showBorder ? 1 : 0,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {onInfoPress && (
              <TouchableOpacity
                onPress={onInfoPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.infoButton}
              >
                <Icon 
                  name="information-outline" 
                  size={16} 
                  color={theme.textTertiary} 
                />
              </TouchableOpacity>
            )}
          </View>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
      </View>

      <View style={styles.content}>{children}</View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  infoButton: {
    marginLeft: spacing.xs,
    padding: 4,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: spacing.md,
  },
  content: {
    flex: 1,
  },
});

export default ChartContainer;

