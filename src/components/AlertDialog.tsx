/**
 * AlertDialog Component
 * Purpose: Modern alert dialog component aligned with app design system
 * Replaces native Alert.alert with a consistent, branded experience
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

export type AlertType = 'error' | 'success' | 'warning' | 'info' | 'default';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
}

/**
 * AlertDialog - Modern alert dialog component
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  visible,
  title,
  message,
  type = 'default',
  buttons,
  onClose,
}) => {
  const { theme } = useTheme();

  const getIconConfig = () => {
    switch (type) {
      case 'error':
        return {
          name: 'alert-circle' as const,
          color: theme.expense,
          backgroundColor: theme.expense + '20',
        };
      case 'success':
        return {
          name: 'check-circle' as const,
          color: theme.success,
          backgroundColor: theme.success + '20',
        };
      case 'warning':
        return {
          name: 'alert' as const,
          color: theme.warning,
          backgroundColor: theme.warning + '20',
        };
      case 'info':
        return {
          name: 'information' as const,
          color: theme.info,
          backgroundColor: theme.info + '20',
        };
      default:
        return {
          name: 'information-outline' as const,
          color: theme.primary,
          backgroundColor: theme.primary + '20',
        };
    }
  };

  const iconConfig = getIconConfig();

  // Default buttons if none provided
  const defaultButtons: AlertButton[] = buttons || [
    {
      text: 'OK',
      style: 'default',
      onPress: onClose,
    },
  ];

  // Sort buttons: cancel first, then destructive, then default
  const sortedButtons = [...defaultButtons].sort((a, b) => {
    if (a.style === 'cancel') return -1;
    if (b.style === 'cancel') return 1;
    if (a.style === 'destructive') return 1;
    if (b.style === 'destructive') return -1;
    return 0;
  });

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonStyle = (buttonStyle?: string) => {
    if (buttonStyle === 'destructive') {
      return {
        backgroundColor: theme.expense + '20',
        borderColor: theme.expense,
      };
    }
    if (buttonStyle === 'cancel') {
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      };
    }
    return {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    };
  };

  const getButtonTextStyle = (buttonStyle?: string) => {
    if (buttonStyle === 'destructive') {
      return { color: theme.expense };
    }
    if (buttonStyle === 'cancel') {
      return { color: theme.textSecondary };
    }
    return { color: '#FFFFFF' };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.lg,
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconConfig.backgroundColor },
              ]}
            >
              <Icon name={iconConfig.name} size={32} color={iconConfig.color} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message}
            </Text>
          </View>

          <View style={styles.buttons}>
            {sortedButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  button.style === 'cancel' ? styles.cancelButton : {},
                  button.style === 'destructive' ? styles.destructiveButton : {},
                  button.style === 'default' ? elevation.sm : {},
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    getButtonTextStyle(button.style),
                    button.style === 'default' ? styles.defaultButtonText : {},
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
  },
  destructiveButton: {
    borderWidth: 1,
  },
  buttonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  defaultButtonText: {
    fontWeight: '700',
  },
});

export default AlertDialog;

