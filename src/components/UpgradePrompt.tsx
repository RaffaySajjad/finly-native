/**
 * UpgradePrompt Component
 * Purpose: Displays upgrade prompt when user tries to access premium features
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
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  feature = 'this feature',
  message,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, startTrial, subscribe } = useSubscription();

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('Subscription' as any);
  };

  const handleStartTrial = async () => {
    try {
      await startTrial();
      onClose();
    } catch (error) {
      // Handle error
    }
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
                { backgroundColor: theme.primary + '20' },
              ]}
            >
              <Icon name="crown" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Upgrade to Premium
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message ||
                `${feature} is available for Premium subscribers. Upgrade to unlock all premium features.`}
            </Text>
          </View>

          <View style={styles.features}>
            <FeatureItem
              icon="camera-outline"
              text="Unlimited Receipt Scanning"
              theme={theme}
            />
            <FeatureItem
              icon="microphone"
              text="Voice & AI Transaction Entry"
              theme={theme}
            />
            <FeatureItem
              icon="chart-line"
              text="Advanced Analytics & Insights"
              theme={theme}
            />
            <FeatureItem
              icon="shape"
              text="Unlimited Categories"
              theme={theme}
            />
          </View>

          <View style={styles.buttons}>
            {!isPremium && (
              <TouchableOpacity
                style={[
                  styles.trialButton,
                  { backgroundColor: theme.primary + '20', borderColor: theme.primary },
                ]}
                onPress={handleStartTrial}
              >
                <Text style={[styles.trialButtonText, { color: theme.primary }]}>
                  Start 7-Day Free Trial
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              <Text style={styles.priceText}>$4.99/month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FeatureItem: React.FC<{
  icon: string;
  text: string;
  theme: any;
}> = ({ icon, text, theme }) => (
  <View style={styles.featureItem}>
    <Icon name={icon as any} size={20} color={theme.primary} />
    <Text style={[styles.featureText, { color: theme.text }]}>{text}</Text>
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
  features: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  buttons: {
    gap: spacing.sm,
  },
  trialButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  trialButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  upgradeButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  upgradeButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  priceText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyMedium,
  },
});

export default UpgradePrompt;

