/**
 * Toast Component
 * Purpose: Auto-disappearing popup message displayed from the bottom
 * Features: Auto-dismiss, action button support, themed styling
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number; // Auto-dismiss duration in ms (default: 4000)
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
}

/**
 * Toast - Auto-disappearing bottom popup message
 */
export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  action,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide up and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after duration
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          dismiss();
        }, duration);
      }
    } else {
      dismiss();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handleActionPress = () => {
    if (action?.onPress) {
      action.onPress();
    }
    dismiss();
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.success,
          icon: 'check-circle' as const,
        };
      case 'warning':
        return {
          backgroundColor: theme.warning,
          icon: 'alert' as const,
        };
      case 'error':
        return {
          backgroundColor: theme.expense,
          icon: 'alert-circle' as const,
        };
      default:
        return {
          backgroundColor: theme.primary,
          icon: 'information' as const,
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          // Position higher to avoid being hidden behind bottom sheet (80% height)
          // Add extra spacing: safe area + bottom sheet footer height (~100px) + margin
          bottom: Math.max(insets.bottom, spacing.md) + (Platform.OS === 'ios' ? 130 : 0),
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: typeConfig.backgroundColor,
          },
          elevation.lg,
        ]}
      >
        <Icon name={typeConfig.icon} size={20} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            onPress={handleActionPress}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 56,
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    flex: 1,
    fontWeight: '500',
  },
  actionButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: spacing.xs,
    padding: spacing.xs,
  },
});

