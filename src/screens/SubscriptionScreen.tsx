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
import { PaymentIssueModal } from '../components/PaymentIssueModal';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { usePricing } from '../contexts/PricingContext';

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
    changePlan,
    paymentState,
    gracePeriodEndDate,
    pendingPlanId,
    pendingChangeDate,
    planId,
  } = useSubscription();

  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentIssue, setShowPaymentIssue] = useState(false);

  // Dynamic pricing from App Store/Google Play
  const pricing = usePricing();

  useEffect(() => {
    // Only check status once on mount, not on every checkStatus change
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  useEffect(() => {
    if (paymentState === 'GRACE_PERIOD' || paymentState === 'ON_HOLD') {
      setShowPaymentIssue(true);
    }
  }, [paymentState]);

  // Determine current active plan based on planId
  const currentActivePlan = React.useMemo(() => {
    if (!planId) return 'monthly';
    const lowerId = planId.toLowerCase();
    return (lowerId.includes('year') || lowerId.includes('annual')) ? 'yearly' : 'monthly';
  }, [planId]);

  const handlePlanChange = async (newPlan: 'monthly' | 'yearly') => {
    setProcessing(true);
    try {
      await changePlan(newPlan);
      await checkStatus();

      const message = newPlan === 'yearly'
        ? 'Successfully switched to Yearly plan! Your new billing cycle starts now.'
        : 'Plan change scheduled. You will switch to Monthly plan at the end of your current subscription period.';

      Alert.alert('Plan Updated', message);
    } catch (error) {
      console.error('Plan change error:', error);
      Alert.alert('Update Failed', 'Failed to change plan. Please try again later.');
    } finally {
      setProcessing(false);
    }
  };

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
      : 'Are you sure you want to cancel your subscription? You will keep Premium access until the end of your current billing period.';
    const confirmText = isTrialUser ? 'Yes, End Trial' : 'Yes, Cancel';

    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel();
            // Refresh status to show updated state
            await checkStatus();
            Alert.alert(
              isTrialUser ? 'Trial Ended' : 'Subscription Cancelled',
              isTrialUser
                ? 'Your trial has been ended. You can start a new subscription anytime.'
                : 'Your subscription has been cancelled. You will continue to have Premium access until the end of your current billing period.'
            );
          } catch (error) {
            Alert.alert('Error', `Failed to ${isTrialUser ? 'end trial' : 'cancel subscription'}.`);
          }
        },
      },
    ]);
  };

  const premiumFeatures = [
    { icon: 'camera-outline', title: 'Unlimited Receipt Scanning', description: 'Scan unlimited receipts (Free: 3/month)' },
    { icon: 'microphone', title: 'Unlimited Smart Entry', description: 'Voice & AI-powered entry (Free: 3/month)' },
    { icon: 'chart-line', title: 'Advanced Analytics', description: 'Year over year comparisons & predictions' },
    { icon: 'brain', title: 'Smart Insights', description: 'Unlimited AI-powered insights (Free: 3/week)' },
    { icon: 'shape', title: 'Unlimited Categories', description: 'Create unlimited custom categories (Free: 5)' },
    { icon: 'file-export', title: 'Data Export', description: 'Export reports in PDF format' },
    { icon: 'repeat', title: 'Bulk Transaction Entry', description: 'Add multiple transactions at once' },
    { icon: 'image-multiple', title: 'Receipt Gallery', description: 'Organize and search all your receipts' },
    { icon: 'currency-usd', title: 'Multi-Currency Transactions', description: 'Record expenses in any of 150+ currencies' },
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
        {/* Payment Issue Banner */}
        {(paymentState === 'GRACE_PERIOD' || paymentState === 'ON_HOLD') && (
          <View style={[styles.issueBanner, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
            <Icon name="alert-circle-outline" size={24} color={theme.warning} style={{ marginTop: 2 }} />
            <View style={styles.issueContent}>
              <Text style={[styles.issueTitle, { color: theme.text }]}>
                {paymentState === 'GRACE_PERIOD' ? 'Payment Issue' : 'Subscription On Hold'}
              </Text>
              <Text style={[styles.issueText, { color: theme.textSecondary }]}>
                {paymentState === 'GRACE_PERIOD'
                  ? 'Premium remains active while we verify payment.'
                  : 'Update payment method to restore access.'}
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentIssue(true)} style={{ marginTop: 8 }}>
                <Text style={[styles.issueAction, { color: theme.primary }]}>Manage Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* Web Signup Discount Banner */}
        {subscription.hasPendingDiscount && !isPremium && (
          <View
            style={[
              styles.discountBanner,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary },
            ]}
          >
            <Text style={styles.discountIcon}>🎁</Text>
            <View style={styles.discountContent}>
              <Text style={[styles.discountTitle, { color: theme.primary }]}>
                {pricing.discount.percentFormatted} OFF First Month!
              </Text>
              <Text style={[styles.discountSubtitle, { color: theme.textSecondary }]}>
                Your web signup discount will be applied automatically
              </Text>
            </View>
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

            {/* Plan Selector - Show for free users, canceled users, or trial users */}
            {(isFree || isCanceled || isTrial) && (
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
                {selectedPlan === 'monthly' ? pricing.monthly.price : pricing.yearly.monthlyEquivalent}
              </Text>
              <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>
                /{selectedPlan === 'monthly' ? 'month' : 'month'}
              </Text>
            </View>

            {selectedPlan === 'yearly' && (
              <Text style={[styles.savingsText, { color: theme.success }]}>
                Build a long-term habit. (And save {pricing.savings.percentFormatted})
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
                      <Text style={styles.trialButtonText}>Subscribe Now</Text>
                      <Text style={styles.trialButtonSubtext}>
                        {selectedPlan === 'monthly' ? `${pricing.monthly.price}/month` : `${pricing.yearly.price}/year`} • Cancel anytime
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
                        Continue enjoying Premium features • {selectedPlan === 'monthly' ? `${pricing.monthly.price}/month` : `${pricing.yearly.price}/year`}
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

          {/* Paying Premium User: Show Plan Switch & Cancel Options */}
          {isPremium && !isTrial && !isFree && !isCanceled && (
            <View style={styles.premiumActions}>
              {/* Plan Switcher */}
              {!pendingPlanId && (
                <View style={[styles.switchPlanContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.switchPlanTitle, { color: theme.text }]}>
                    Your Plan: {currentActivePlan === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>

                  <TouchableOpacity
                    style={[styles.switchButton, { borderColor: theme.primary }]}
                    onPress={() => handlePlanChange(currentActivePlan === 'monthly' ? 'yearly' : 'monthly')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color={theme.primary} size="small" />
                    ) : (
                      <Text style={[styles.switchButtonText, { color: theme.primary }]}>
                        Switch to {currentActivePlan === 'monthly' ? 'Yearly' : 'Monthly'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Pending Change Info */}
              {pendingPlanId && (
                <View style={[styles.pendingChangeContainer, { backgroundColor: theme.primary + '10' }]}>
                  <Icon name="calendar-clock" size={24} color={theme.primary} />
                  <Text style={[styles.pendingChangeText, { color: theme.text }]}>
                    Switching to {pendingPlanId.toLowerCase().includes('year') ? 'Yearly' : 'Monthly'} on {pendingChangeDate ? new Date(pendingChangeDate).toLocaleDateString() : 'next renewal'}
                  </Text>
                </View>
              )}

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
            </View>
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
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <PaymentIssueModal
        visible={showPaymentIssue}
        onClose={() => setShowPaymentIssue(false)}
        paymentState={paymentState as 'GRACE_PERIOD' | 'ON_HOLD'}
        gracePeriodEndDate={gracePeriodEndDate}
      />
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
  // Discount banner styles
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  discountIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  discountContent: {
    flex: 1,
  },
  discountTitle: {
    ...typography.titleSmall,
    fontWeight: '700',
    marginBottom: 2,
  },
  discountSubtitle: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  issueBanner: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  issueContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  issueTitle: {
    ...typography.titleSmall,
    fontWeight: '700',
    marginBottom: 2,
  },
  issueText: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  issueAction: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  premiumActions: {
    gap: spacing.md,
  },
  switchPlanContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  switchPlanTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  switchButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  switchButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  pendingChangeContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingChangeText: {
    ...typography.bodySmall,
    flex: 1,
  },
});

export default SubscriptionScreen;

