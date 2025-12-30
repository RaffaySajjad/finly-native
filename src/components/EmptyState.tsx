/**
 * EmptyState Component
 * Purpose: Reusable empty state with animated illustrations and engaging copy
 * Features: Staggered entrance animations, floating effect, pulse on accent icon
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import ScaleButton from './ScaleButton';

// Variant types with new additions
export type EmptyStateVariant =
  | 'transactions'
  | 'notifications'
  | 'search'
  | 'wifi'
  | 'insights'
  | 'categories'
  | 'receipts'
  | 'income'
  | 'goals'
  | 'history'
  | 'subscriptions'
  | 'general';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  variant?: EmptyStateVariant;
  icon?: string; // Legacy support
  compact?: boolean; // For inline usage in lists
}

// Default copywriting for each variant - encouraging and action-oriented
const DEFAULT_COPY: Record<EmptyStateVariant, { title: string; subtitle: string }> = {
  transactions: {
    title: "No transactions yet",
    subtitle: "Tap + to record your first expense or income. Your financial journey starts here!"
  },
  notifications: {
    title: "All caught up!",
    subtitle: "You have no notifications right now. We'll let you know when something needs your attention."
  },
  search: {
    title: "No results found",
    subtitle: "Try adjusting your search or filters to find what you're looking for."
  },
  wifi: {
    title: "No connection",
    subtitle: "Please check your internet connection and try again."
  },
  insights: {
    title: "Insights on the way",
    subtitle: "Record a few more transactions to unlock personalized AI-powered insights."
  },
  categories: {
    title: "No categories yet",
    subtitle: "Create custom categories to organize your spending and track budgets effectively."
  },
  receipts: {
    title: "No receipts saved",
    subtitle: "Snap photos of your receipts to keep them organized and never lose track of expenses."
  },
  income: {
    title: "No income sources",
    subtitle: "Add your salary, freelance work, or side gigs to track your earnings."
  },
  goals: {
    title: "Set your first goal",
    subtitle: "Define a financial goal to stay motivated and track your progress."
  },
  history: {
    title: "No history yet",
    subtitle: "Your activity history will appear here as you use the app."
  },
  subscriptions: {
    title: "No subscriptions tracked",
    subtitle: "Add your recurring subscriptions to never miss a payment."
  },
  general: {
    title: "Nothing here yet",
    subtitle: "This space is waiting for your first entry."
  },
};

// Icon configurations for each variant
const VARIANT_ICONS: Record<EmptyStateVariant, { main: string; accent: string; accentColorKey: 'primary' | 'success' | 'warning' | 'error' }> = {
  transactions: { main: 'wallet-outline', accent: 'plus-circle', accentColorKey: 'primary' },
  notifications: { main: 'bell-outline', accent: 'check-circle', accentColorKey: 'success' },
  search: { main: 'folder-search-outline', accent: 'magnify', accentColorKey: 'primary' },
  wifi: { main: 'wifi-off', accent: 'alert-circle', accentColorKey: 'error' },
  insights: { main: 'lightbulb-outline', accent: 'brain', accentColorKey: 'primary' },
  categories: { main: 'shape-outline', accent: 'plus-circle', accentColorKey: 'success' },
  receipts: { main: 'receipt', accent: 'camera', accentColorKey: 'primary' },
  income: { main: 'cash-multiple', accent: 'trending-up', accentColorKey: 'success' },
  goals: { main: 'flag-outline', accent: 'star', accentColorKey: 'warning' },
  history: { main: 'history', accent: 'clock-outline', accentColorKey: 'primary' },
  subscriptions: { main: 'credit-card-outline', accent: 'refresh', accentColorKey: 'primary' },
  general: { main: 'package-variant', accent: 'sparkles', accentColorKey: 'primary' },
};

const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  variant = 'general',
  icon,
  compact = false,
}) => {
  const { theme, isDark } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Get default copy if not provided
  const displayTitle = title || DEFAULT_COPY[variant].title;
  const displaySubtitle = subtitle || DEFAULT_COPY[variant].subtitle;

  useEffect(() => {
    // Staggered entrance animation sequence
    Animated.sequence([
      // First: fade and scale in the illustration
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Then: fade in title
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Then: fade in subtitle
      Animated.timing(subtitleFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Finally: fade in button
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation for accent icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle pulse animation on accent icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const renderIllustration = () => {
    // Legacy support for custom icon
    if (icon && variant === 'general') {
      return (
        <Animated.View
          style={[
            styles.legacyIconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Icon name={icon as any} size={compact ? 48 : 64} color={theme.textTertiary} />
        </Animated.View>
      );
    }

    const iconConfig = VARIANT_ICONS[variant];
    const accentColor = theme[iconConfig.accentColorKey];
    const mainColor = isDark ? '#FFFFFF' : '#000000';
    const iconSize = compact ? 80 : 120;
    const accentSize = compact ? 24 : 32;
    const circleSize = compact ? 40 : 52;

    return (
      <Animated.View
        style={[
          styles.illustrationContainer,
          compact && styles.illustrationContainerCompact,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Main large faint icon with subtle gradient overlay effect */}
        <Icon
          name={iconConfig.main as any}
          size={iconSize}
          color={mainColor}
          style={{ opacity: 0.06 }}
        />

        {/* Floating accent icon with pulse */}
        <Animated.View
          style={[
            styles.accentContainer,
            compact && styles.accentContainerCompact,
            {
              transform: [
                { translateY },
                { scale: pulseAnim }
              ]
            }
          ]}
        >
          <View
            style={[
              styles.accentCircle,
              compact && styles.accentCircleCompact,
              {
                backgroundColor: theme.surface,
                borderColor: accentColor + '40',
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
              }
            ]}
          >
            <Icon name={iconConfig.accent as any} size={accentSize} color={accentColor} />
          </View>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {renderIllustration()}

      <Animated.Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          {
            color: theme.text,
            opacity: titleFadeAnim,
          }
        ]}
      >
        {displayTitle}
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subtitle,
          compact && styles.subtitleCompact,
          {
            color: theme.textSecondary,
            opacity: subtitleFadeAnim,
          }
        ]}
      >
        {displaySubtitle}
      </Animated.Text>

      {actionLabel && onActionPress && (
        <Animated.View style={{ opacity: buttonFadeAnim }}>
          <ScaleButton
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={onActionPress}
            hapticArgs="medium"
          >
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </ScaleButton>
        </Animated.View>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    flex: 1,
  },
  containerCompact: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    flex: 0,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'visible', // Prevent accent pill from being clipped
  },
  illustrationContainerCompact: {
    width: 100,
    height: 100,
    marginBottom: spacing.sm,
  },
  legacyIconContainer: {
    marginBottom: spacing.md,
  },
  accentContainer: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  accentContainerCompact: {
    bottom: 10,
    right: 10,
  },
  accentCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  accentCircleCompact: {
    borderWidth: 2,
  },
  title: {
    ...typography.titleMedium,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 20,
  },
  titleCompact: {
    fontSize: 16,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 260,
    marginTop: spacing.xs,
  },
  actionButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  actionButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default EmptyState;
