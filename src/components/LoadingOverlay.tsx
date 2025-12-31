/**
 * LoadingOverlay Component
 * Purpose: Full-screen or container loading overlay with message
 * Features: Semi-transparent backdrop, centered spinner, customizable message
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Main loading message */
  message?: string;
  /** Secondary subtitle text */
  subtitle?: string;
  /** Use Modal (full-screen blocking) or absolute positioned (container-level) */
  fullScreen?: boolean;
}

/**
 * LoadingOverlay - Reusable loading state overlay
 * Use fullScreen={true} for blocking modal behavior (e.g., during API calls)
 * Use fullScreen={false} for container-level loading (e.g., onboarding slides)
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  subtitle,
  fullScreen = true,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  const content = (
    <View style={[styles.overlay, fullScreen && styles.overlayFullScreen]}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.message, { color: theme.text }]}>
          {message}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayFullScreen: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  message: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default LoadingOverlay;
