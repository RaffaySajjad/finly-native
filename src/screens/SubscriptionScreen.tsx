/**
 * SubscriptionScreen Component
 * Purpose: Display subscription plans, handle upgrades, and manage subscription
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { PremiumBadge } from '../components';
import FeatureComparison from '../components/FeatureComparison';
import TrialBadge from '../components/TrialBadge';
import { typography, spacing, borderRadius, elevation } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SubscriptionScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    subscription,
    isPremium,
    isTrial,
    isLoading,
    subscribe,
    startTrial,
    cancel,
  } = useSubscription();

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    // Subscription status is checked automatically via Redux
  };

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      await subscribe();
      Alert.alert('Success', 'Welcome to Premium! 🎉');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to upgrade. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    setProcessing(true);
    try {
      await startTrial();
      Alert.alert(
        'Trial Started!',
        'Enjoy 7 days of Premium features free! 🎉'
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to start trial. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to Premium features at the end of your billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel();
              Alert.alert('Cancelled', 'Your subscription has been cancelled.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription.');
            }
          },
        },
      ]
    );
  };

  const premiumFeatures = [
    { icon: 'camera-outline', title: 'Unlimited Receipt Scanning', description: 'Scan unlimited receipts with advanced AI OCR' },
    { icon: 'microphone', title: 'Voice & AI Transaction Entry', description: 'Speak or type to add multiple transactions' },
    { icon: 'chart-line', title: 'Advanced Analytics', description: 'Year-over-year comparisons & predictions' },
    { icon: 'brain', title: 'Smart Insights', description: 'Unlimited AI-powered financial insights' },
    { icon: 'shape', title: 'Unlimited Categories', description: 'Create as many categories as you need' },
    { icon: 'file-export', title: 'Data Export', description: 'Export reports in PDF format' },
    { icon: 'repeat', title: 'Bulk Transaction Entry', description: 'Import CSV or add multiple at once' },
    { icon: 'image-multiple', title: 'Receipt Gallery', description: 'Organize and search all your receipts' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Subscription
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Current Status */}
        {isPremium && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: theme.success + '20', borderColor: theme.success },
            ]}
          >
            <Icon name="check-circle" size={32} color={theme.success} />
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {isTrial ? 'Free Trial Active' : 'Premium Active'}
            </Text>
            {subscription.endDate && (
              <>
                {isTrial && <TrialBadge endDate={subscription.endDate} size="medium" />}
                <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                  {isTrial
                    ? `Trial ends ${new Date(subscription.endDate).toLocaleDateString()}`
                    : `Renews ${new Date(subscription.endDate).toLocaleDateString()}`}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Feature Comparison */}
        {!isPremium && (
          <View style={styles.comparisonContainer}>
            <FeatureComparison
              features={[
                { name: 'Receipt Scanning', free: '3/month', premium: 'Unlimited' },
                { name: 'AI Insights', free: '3/week', premium: 'Unlimited' },
                { name: 'Voice Entry', free: false, premium: true },
                { name: 'Advanced Analytics', free: false, premium: true },
                { name: 'Categories', free: '5 max', premium: 'Unlimited' },
                { name: 'Receipt Gallery', free: false, premium: true },
                { name: 'Bulk Entry', free: false, premium: true },
                { name: 'Data Export', free: 'CSV only', premium: 'CSV + PDF' },
              ]}
            />
          </View>
        )}

        {/* Premium Plan Card */}
        <View
          style={[
            styles.planCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.md,
          ]}
        >
          <View style={styles.planHeader}>
            <Text style={[styles.planTitle, { color: theme.text }]}><PremiumBadge size="medium" /></Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: theme.text }]}>$4.99</Text>
              <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>/month</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Icon
                  name={feature.icon as any}
                  size={20}
                  color={theme.primary}
                  style={styles.featureIcon}
                />
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {!isPremium ? (
            <>
              <TouchableOpacity
                style={[styles.trialButton, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleStartTrial}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
                    <Text style={styles.trialButtonSubtext}>
                      Then $4.99/month • Cancel anytime
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={handleUpgrade}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <Text style={[styles.upgradeButtonText, { color: theme.primary }]}>
                    Subscribe Now
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: theme.expense + '20', borderColor: theme.expense },
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: theme.expense }]}>
                Cancel Subscription
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Free Plan Info */}
        {!isPremium && (
          <View style={styles.freePlanInfo}>
            <Text style={[styles.freePlanTitle, { color: theme.textSecondary }]}>
              Free Plan Includes:
            </Text>
            <Text style={[styles.freePlanFeatures, { color: theme.textTertiary }]}>
              • 3 receipt scans per month{'\n'}
              • Basic insights (3 per week){'\n'}
              • Manual transaction entry{'\n'}
              • 5 categories max{'\n'}
              • Current month trends
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
  },
  statusCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  statusSubtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  planCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  planTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...typography.displaySmall,
    fontWeight: '700',
  },
  pricePeriod: {
    ...typography.titleMedium,
    marginLeft: spacing.xs,
  },
  featuresList: {
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  featureIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  trialButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trialButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  trialButtonSubtext: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  upgradeButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  upgradeButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  freePlanInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  freePlanTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  freePlanFeatures: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  comparisonContainer: {
    marginBottom: spacing.lg,
  },
});

export default SubscriptionScreen;

