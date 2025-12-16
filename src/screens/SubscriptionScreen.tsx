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
    isFree,
    isTrial,
    isCanceled,
    isLoading,
    subscribe,
    startTrial,
    cancel,
    checkStatus,
  } = useSubscription();

  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    // Only check status once on mount, not on every checkStatus change
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      await subscribe(selectedPlan);
      // Refetch subscription status to ensure UI updates
      await checkStatus();
      Alert.alert('Welcome to Finly Pro!', 'You\'ve promised yourself a better financial future. We\'re here to help you build it.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Upgrade Issue', 'We couldn\'t process the upgrade right now. Please check your connection and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    const isTrialUser = isTrial && !isFree;
    const title = isTrialUser ? 'End Trial' : 'Cancel Subscription';
    const message = isTrialUser
      ? 'Are you sure you want to end your trial? You will lose access to Premium features immediately.'
      : 'Are you sure you want to cancel your subscription? You will lose access to Premium features at the end of your billing period.';
    const confirmText = isTrialUser ? 'Yes, End Trial' : 'Yes, Cancel';

    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel();
            Alert.alert(
              isTrialUser ? 'Trial Ended' : 'Cancelled',
              isTrialUser
                ? 'Your trial has been ended. You can start a new subscription anytime.'
                : 'Your subscription has been cancelled.'
            );
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', `Failed to ${isTrialUser ? 'end trial' : 'cancel subscription'}.`);
          }
        },
      },
    ]);
  };

  const premiumFeatures = [
    { icon: 'camera-outline', title: 'Unlimited Receipt Scanning', description: 'Scan unlimited receipts with advanced AI OCR' },
    { icon: 'microphone', title: 'Smart Entry', description: 'Speak or type to add multiple transactions' },
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
            <Icon name={isCanceled ? "alert-circle-outline" : "check-circle"} size={32} color={isCanceled ? theme.warning : theme.success} />
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {isCanceled
                ? (isTrial ? 'Trial Canceled' : 'Premium Canceled')
                : (isTrial ? 'Free Trial Active' : 'Premium Active')
              }
            </Text>
            {subscription.endDate && (
              <>
                {isTrial && !isCanceled && <TrialBadge endDate={subscription.endDate} size="medium" />}
                <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                  {isCanceled
                    ? `Expires on ${new Date(subscription.endDate).toLocaleDateString()}`
                    : (isTrial
                      ? `Trial ends ${new Date(subscription.endDate).toLocaleDateString()}`
                      : `Renews ${new Date(subscription.endDate).toLocaleDateString()}`
                    )
                  }
                </Text>
              </>
            )}
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
            <PremiumBadge size="medium" />

            {/* Plan Selector */}
            {(!isPremium || isCanceled) && (
              <View style={[styles.planSelector, { backgroundColor: theme.background }]}>
                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'monthly' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedPlan('monthly')}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      { color: selectedPlan === 'monthly' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'yearly' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      { color: selectedPlan === 'yearly' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Yearly
                  </Text>
                  {selectedPlan !== 'yearly' && (
                    <View style={[styles.saveBadge, { backgroundColor: theme.success }]}>
                      <Text style={styles.saveBadgeText}>Best Value</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: theme.text }]}>
                {selectedPlan === 'monthly' ? '$4.99' : '$2.99'}
              </Text>
              <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>
                /{selectedPlan === 'monthly' ? 'month' : 'month'}
              </Text>
            </View>

            {selectedPlan === 'yearly' && (
              <Text style={[styles.savingsText, { color: theme.success }]}>
                Build a long-term habit. (And save 40%)
              </Text>
            )}
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

          {/* Free or Canceled User: Show Subscribe options */}
          {(isFree || isCanceled) && (
            <>
              <TouchableOpacity
                style={[styles.trialButton, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleUpgrade}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                      <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
                      <Text style={styles.trialButtonSubtext}>
                      {selectedPlan === 'monthly' ? '$4.99/month' : '$35.99/year'} after trial • Cancel anytime
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Trial User: Show Upgrade to Premium and Cancel Trial buttons */}
          {isTrial && !isFree && !isCanceled && (
            <>
              <TouchableOpacity
                style={[styles.trialButton, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleUpgrade}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.trialButtonText}>Upgrade to Premium</Text>
                    <Text style={styles.trialButtonSubtext}>
                      Continue enjoying Premium features • {selectedPlan === 'monthly' ? '$4.99/month' : '$35.99/year'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.expense + '20', borderColor: theme.expense },
                ]}
                onPress={handleCancel}
                disabled={processing}
              >
                <Text style={[styles.cancelButtonText, { color: theme.expense }]}>
                  End Trial
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Paying Premium User: Show Cancel Subscription button */}
          {isPremium && !isTrial && !isFree && !isCanceled && (
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

          {/* Debug: Downgrade Option (Only in Dev) */}
          {__DEV__ && (isPremium || isTrial) && (
            <TouchableOpacity
              style={{ marginTop: 20, alignItems: 'center' }}
              onPress={async () => {
                await cancel();
                Alert.alert('Debug', 'Downgraded to Free Tier');
                navigation.goBack();
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                [Debug] Force Downgrade to Free
              </Text>
            </TouchableOpacity>
          )}
        </View>


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
    marginTop: spacing.sm,
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
  planSelector: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginVertical: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  planOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md - 2,
    flexDirection: 'row',
  },
  planOptionText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  saveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  saveBadgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  savingsText: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});

export default SubscriptionScreen;

