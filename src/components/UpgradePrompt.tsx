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
import { usePricing } from '../contexts/PricingContext';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void; // Optional callback when user clicks upgrade
  feature?: string;
  message?: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  onUpgrade,
  feature = 'this feature',
  message,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium } = useSubscription();
  const pricing = usePricing();

  const handleUpgrade = () => {
    onClose();
    onUpgrade?.(); // Call optional callback (e.g., to close parent bottom sheet)
    navigation.navigate('Subscription' as any, { selectedPlan: 'yearly' });
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
              Unlock Finly Pro
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message || `Unlock unlimited access to ${feature} and other pro tools.`}
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
              text="Unlimited Smart Entry (Voice & AI)"
              theme={theme}
            />
            <FeatureItem
              icon="chart-line"
              text="Advanced Analytics & Insights"
              theme={theme}
            />
            <FeatureItem
              icon="shape"
              text="Unlimited Custom Categories"
              theme={theme}
            />
            <FeatureItem
              icon="file-multiple"
              text="Bulk Transaction Entry"
              theme={theme}
            />
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              <Text style={styles.priceText}>Starting at {pricing.yearly.monthlyEquivalent}/month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                Not right now
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

