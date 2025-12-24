/**
 * Payment Issue Modal
 * Purpose: Alert users when their subscription has a payment issue
 * 
 * Shows when:
 * - paymentState === 'GRACE_PERIOD'
 * - paymentState === 'ON_HOLD'
 * 
 * Features:
 * - Explains the issue
 * - Shows remaining grace period time
 * - Links to Google Play subscription management
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface PaymentIssueModalProps {
  visible: boolean;
  onClose: () => void;
  paymentState: 'GRACE_PERIOD' | 'ON_HOLD';
  gracePeriodEndDate?: string | null;
}

export const PaymentIssueModal: React.FC<PaymentIssueModalProps> = ({
  visible,
  onClose,
  paymentState,
  gracePeriodEndDate,
}) => {
  const { theme } = useTheme();

  const isGracePeriod = paymentState === 'GRACE_PERIOD';
  
  // Calculate days remaining in grace period
  const getDaysRemaining = (): number => {
    if (!gracePeriodEndDate) return 0;
    const endDate = new Date(gracePeriodEndDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = getDaysRemaining();

  const openSubscriptionManagement = async () => {
    // Deep link to Google Play subscription management
    const packageName = 'com.raffay.finly'; // Your app's package name
    const subscriptionId = 'finly_premium';
    
    if (Platform.OS === 'android') {
      // Direct link to subscription management
      const url = `https://play.google.com/store/account/subscriptions?package=${packageName}&sku=${subscriptionId}`;
      
      try {
        await Linking.openURL(url);
      } catch (error) {
        // Fallback to general subscriptions page
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } else if (Platform.OS === 'ios') {
      // iOS App Store subscriptions
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
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
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* Icon */}
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isGracePeriod ? '#FFF3CD' : '#F8D7DA' }
          ]}>
            <MaterialCommunityIcons
              name={isGracePeriod ? 'clock-alert-outline' : 'credit-card-off-outline'}
              size={40}
              color={isGracePeriod ? '#856404' : '#721C24'}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            {isGracePeriod ? 'Payment Issue Detected' : 'Subscription On Hold'}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {isGracePeriod ? (
              <>
                We couldn't process your subscription payment. Your premium access 
                will continue for {daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'} 
                while we retry the payment.
              </>
            ) : (
              <>
                Your subscription is on hold due to a payment issue. 
                Your premium features have been temporarily disabled. 
                Please update your payment method to restore access.
              </>
            )}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={openSubscriptionManagement}
          >
            <MaterialCommunityIcons name="credit-card-edit-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Update Payment Method</Text>
          </TouchableOpacity>

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={[styles.dismissButtonText, { color: theme.textSecondary }]}>
              {isGracePeriod ? 'Remind Me Later' : 'Dismiss'}
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          {isGracePeriod && (
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              You can continue using all premium features during the grace period.
            </Text>
          )}
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
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineSmall,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    ...typography.labelLarge,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  dismissButtonText: {
    ...typography.bodyMedium,
  },
  infoText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

export default PaymentIssueModal;
