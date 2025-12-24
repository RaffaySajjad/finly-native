/**
 * FeatureTooltip Component
 * Purpose: Contextual tooltips for feature discovery
 * Highlights new features and guides users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

interface FeatureTooltipProps {
  visible: boolean;
  title: string;
  description: string;
  targetPosition: { x: number; y: number; width: number; height: number };
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onClose: () => void;
  onNext?: () => void;
  showNext?: boolean;
}

const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
  visible,
  title,
  description,
  targetPosition,
  placement = 'bottom',
  onClose,
  onNext,
  showNext = false,
}) => {
  const { theme } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Calculate tooltip position based on placement
  const getTooltipStyle = () => {
    const spacing = 16;
    const tooltipWidth = width - 48;
    const tooltipHeight = 150;

    switch (placement) {
      case 'top':
        return {
          top: targetPosition.y - tooltipHeight - spacing,
          left: width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: targetPosition.y + targetPosition.height + spacing,
          left: width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: targetPosition.y - tooltipHeight / 2 + targetPosition.height / 2,
          left: targetPosition.x - tooltipWidth - spacing,
        };
      case 'right':
        return {
          top: targetPosition.y - tooltipHeight / 2 + targetPosition.height / 2,
          left: targetPosition.x + targetPosition.width + spacing,
        };
      default:
        return {
          top: targetPosition.y + targetPosition.height + spacing,
          left: width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipStyle = getTooltipStyle();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Highlighted Target Area */}
          <View
            style={[
              styles.targetHighlight,
              {
                top: targetPosition.y,
                left: targetPosition.x,
                width: targetPosition.width,
                height: targetPosition.height,
              },
            ]}
          />

          {/* Tooltip */}
          <Animated.View
            style={[
              styles.tooltip,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...tooltipStyle,
                opacity: fadeAnim,
              },
              elevation.lg,
            ]}
          >
            <View style={styles.tooltipHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Icon name="lightbulb-on" size={24} color={theme.primary} />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {description}
            </Text>

            <View style={styles.actions}>
              {showNext && onNext && (
                <TouchableOpacity
                  style={[styles.nextButton, { backgroundColor: theme.primary }]}
                  onPress={onNext}
                >
                  <Text style={styles.nextButtonText}>Next Tip</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.gotItButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={onClose}
              >
                <Text style={[styles.gotItText, { color: theme.text }]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  targetHighlight: {
    position: 'absolute',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tooltip: {
    position: 'absolute',
    width: width - 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  nextButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  nextButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  gotItButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  gotItText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
});

export default FeatureTooltip;

