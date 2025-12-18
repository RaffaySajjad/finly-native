/**
 * NotificationPermissionBanner Component
 * Purpose: Shows permission request modal for push notifications on first app launch
 * Explains why notifications are needed and allows user to enable or skip
 */

import React, { useState } from 'react';
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
import { notificationService } from '../services/notificationService';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';

interface NotificationPermissionBannerProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDeniedInfo, setShowDeniedInfo] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const permissionResult = await notificationService.requestPermissions();
      
      if (!permissionResult.granted) {
        await notificationService.markPermissionBannerShown();
        // Show info about how to enable later
        setShowDeniedInfo(true);
        onPermissionDenied?.();
        return;
      }

      try {
        await notificationService.registerForPushNotifications();
        await notificationService.markPermissionBannerShown();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        onPermissionGranted?.();
        onClose();
      } catch (error) {
        console.error('[NotificationBanner] Registration failed:', error);
        await notificationService.markPermissionBannerShown();
        onPermissionDenied?.();
        onClose();
      }
    } catch (error) {
      console.error('[NotificationBanner] Error requesting permissions:', error);
      await notificationService.markPermissionBannerShown();
      onPermissionDenied?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = async () => {
    Haptics.selectionAsync();
    
    // Mark banner as shown
    await notificationService.markPermissionBannerShown();
    
    // Show info about how to enable later
    setShowDeniedInfo(true);
    onPermissionDenied?.();
  };

  const handleOpenSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await notificationService.openAppSettings();
    onClose();
  };

  const handleDismiss = () => {
    setShowDeniedInfo(false);
    onClose();
  };

  // Show "how to enable later" screen
  if (showDeniedInfo) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
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
                  { backgroundColor: theme.textSecondary + '20' },
                ]}
              >
                <Icon name="bell-off-outline" size={32} color={theme.textSecondary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                No Problem!
              </Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                You can enable notifications anytime from your device settings.
              </Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                How to enable later:
              </Text>
              <View style={styles.infoStep}>
                <Text style={[styles.stepNumber, { color: theme.primary }]}>1.</Text>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                  Open your device Settings
                </Text>
              </View>
              <View style={styles.infoStep}>
                <Text style={[styles.stepNumber, { color: theme.primary }]}>2.</Text>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                  Find "Finly AI" in the apps list
                </Text>
              </View>
              <View style={styles.infoStep}>
                <Text style={[styles.stepNumber, { color: theme.primary }]}>3.</Text>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                  Enable Notifications
                </Text>
              </View>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.enableButton, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleOpenSettings}
              >
                <Icon name="cog" size={18} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
                <Text style={styles.enableButtonText}>Open Settings Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notNowButton}
                onPress={handleDismiss}
              >
                <Text style={[styles.notNowButtonText, { color: theme.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
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
                { backgroundColor: theme.primary + '20' },
              ]}
            >
              <Icon name="bell-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Stay Updated with Insights
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              Get notified when Finly discovers new insights about your spending habits, budget alerts, and financial tips.
            </Text>
          </View>

          <View style={styles.benefits}>
            <BenefitItem
              icon="lightbulb-on-outline"
              text="Real-time spending insights"
              theme={theme}
            />
            <BenefitItem
              icon="alert-circle-outline"
              text="Budget warnings and alerts"
              theme={theme}
            />
            <BenefitItem
              icon="trending-up"
              text="Weekly financial summaries"
              theme={theme}
            />
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.enableButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleEnable}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.enableButtonText}>Enabling...</Text>
              ) : (
                <Text style={styles.enableButtonText}>Enable Notifications</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notNowButton}
              onPress={handleNotNow}
              disabled={loading}
            >
              <Text style={[styles.notNowButtonText, { color: theme.textSecondary }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BenefitItem: React.FC<{
  icon: string;
  text: string;
  theme: any;
}> = ({ icon, text, theme }) => (
  <View style={styles.benefitItem}>
    <Icon name={icon as any} size={20} color={theme.primary} />
    <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
  </View>
);

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
  benefits: {
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  buttons: {
    gap: spacing.sm,
  },
  enableButton: {
    flexDirection: 'row',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notNowButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  notNowButtonText: {
    ...typography.bodyMedium,
  },
  infoBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  stepNumber: {
    ...typography.bodyMedium,
    fontWeight: '700',
    width: 20,
  },
  stepText: {
    ...typography.bodyMedium,
    flex: 1,
  },
});

export default NotificationPermissionBanner;

