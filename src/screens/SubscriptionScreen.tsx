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
  Platform,
  Linking,
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
import { useAlert } from '../hooks/useAlert';

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
    forceRefresh,
    changePlan,
    paymentState,
    gracePeriodEndDate,
    pendingPlanId,
    pendingChangeDate,
    planId,
    restore,
  } = useSubscription();

  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentIssue, setShowPaymentIssue] = useState(false);

  // Dynamic pricing from App Store/Google Play
  const pricing = usePricing();

  // Custom alert dialogs
  const { showSuccess, showError, showWarning, showAlert, AlertComponent } = useAlert();

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

      showSuccess('Plan Updated', message);
    } catch (error) {
      console.error('Plan change error:', error);
      showError('Update Failed', 'Failed to change plan. Please try again later.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    setProcessing(true);
    try {
      // @ts-ignore - TS doesn't know about the new method yet
      const result = await restore() as { subscription: any } | undefined;
      // Only show success if we actually found something
      if (result?.subscription) {
        showSuccess('Restored Successfully', 'Your previous subscription has been restored and linked to this account.');
      } else {
        showAlert({ title: 'No Subscription Found', message: 'We could not find any active subscriptions to restore.', type: 'info' });
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      // Don't show error if it's just "No subscription found"
      if (error === 'No subscription found to restore') {
        showAlert({ title: 'No Subscription Found', message: 'We could not find any active subscriptions to restore.', type: 'info' });
      } else {
        showError('Restore Failed', 'Failed to restore purchases. Please try again later.');
      }
    } finally {
      setProcessing(false);
    }
  };






  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      await subscribe(selectedPlan);
      // Force refresh: clear cache and refetch from API
      await forceRefresh();
      showSuccess(
        'Welcome to Finly Pro!',
        "You've promised yourself a better financial future. We're here to help you build it.",
        [
          {
            text: 'Great!',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    } catch (error: any) {
      console.error('Subscription error:', error);

      // Don't show error for user cancellation
      if (error?.message === 'USER_CANCELLED' || error === 'CANCELLED') {
        // User cancelled, just silently return
        setProcessing(false);
        return;
      }

      // Even if there's an error, try to force refresh in case RTDN processed it
      // This handles race conditions where Google webhook processes before our API call returns
      setTimeout(async () => {
        try {
          await forceRefresh();
        } catch (e) {
          // Ignore refresh errors
        }
      }, 2000);

      showError('Upgrade Issue', "We couldn't process the upgrade right now. Please check your connection and try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
  // Open platform-specific subscription management
  // Users must cancel through Google Play or App Store
  // We receive webhooks (RTDN/App Store Server Notifications) when they cancel

    const packageName = 'com.raffay.finly'; // Android package name
    const appStoreAppId = 'YOUR_APP_STORE_ID'; // Replace with actual App Store ID when available

    let subscriptionUrl: string;

    if (Platform.OS === 'android') {
      // Google Play subscription management deep link
      subscriptionUrl = `https://play.google.com/store/account/subscriptions?sku=finly_premium&package=${packageName}`;
    } else {
      // iOS App Store subscription management
      subscriptionUrl = 'https://apps.apple.com/account/subscriptions';
    }

    try {
      const canOpen = await Linking.canOpenURL(subscriptionUrl);
      if (canOpen) {
        await Linking.openURL(subscriptionUrl);
      } else {
        // Fallback URLs
        if (Platform.OS === 'android') {
          await Linking.openURL('https://play.google.com/store/account/subscriptions');
        } else {
          await Linking.openURL('https://apps.apple.com/account/subscriptions');
        }
      }
    } catch (error) {
      showError(
        'Unable to Open',
        Platform.OS === 'android'
          ? 'Please open Google Play Store > Menu > Subscriptions to manage your subscription.'
          : 'Please go to Settings > Apple ID > Subscriptions to manage your subscription.'
      );
    }
  };

  const handleCancel = () => {
    const isTrialUser = isTrial && !isFree;
    const title = isTrialUser ? 'End Trial' : 'Manage Subscription';
    const message = Platform.OS === 'android'
      ? 'To cancel your subscription, you\'ll be taken to Google Play where you can manage your subscriptions. Your access will continue until the end of your current billing period.'
      : 'To cancel your subscription, you\'ll be taken to the App Store where you can manage your subscriptions. Your access will continue until the end of your current billing period.';

    showAlert({
      title,
      message,
      type: 'info',
      buttons: [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Manage Subscription',
          onPress: handleManageSubscription,
        },
      ],
    });
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

        {/* Premium Member Status - Elegant Design */}
        {isPremium && (
          <View
            style={[
              styles.premiumStatusCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.warning,
              },
            ]}
          >
            {/* Premium Badge Row */}
            <View style={styles.premiumBadgeRow}>
              <View style={[styles.premiumIconBadge, { backgroundColor: theme.warning }]}>
                <Icon name="crown" size={20} color="#1A1A1A" />
              </View>
              <View style={styles.premiumTitleContainer}>
                <Text style={[styles.premiumTitle, { color: theme.text }]}>
                  {isTrial ? 'Free Trial' : 'Finly Pro'}
                </Text>
                <Text style={[styles.premiumSubtitle, { color: theme.warning }]}>
                  {isCanceled ? 'Canceled' : 'Active Member'}
                </Text>
              </View>
              {isCanceled && (
                <Icon name="alert-circle-outline" size={24} color={theme.warning} />
              )}
            </View>

            {/* Subscription Details */}
            {subscription.endDate && (
              <View style={[styles.renewalInfoRow, { backgroundColor: theme.background }]}>
                <Icon
                  name={isCanceled ? "calendar-remove" : (isTrial ? "calendar-clock" : "calendar-check")}
                  size={16}
                  color={theme.textSecondary}
                />
                <Text style={[styles.renewalInfoText, { color: theme.textSecondary }]}>
                  {isCanceled
                    ? `Access until ${new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : (isTrial
                      ? `Trial ends ${new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : `Renews ${new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    )
                  }
                </Text>
              </View>
            )}

            {/* Trial Badge if applicable */}
            {isTrial && !isCanceled && subscription.endDate && (
              <View style={styles.trialBadgeContainer}>
                <TrialBadge endDate={subscription.endDate} size="medium" />
              </View>
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

                  {/* Enticing Yearly Upgrade Prompt */}
                  {currentActivePlan === 'monthly' ? (
                    <TouchableOpacity
                      style={[
                        styles.switchButton,
                        {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                          paddingVertical: spacing.md,
                        }
                      ]}
                      onPress={() => handlePlanChange('yearly')}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Icon name="star" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                              Upgrade to Yearly
                            </Text>
                          </View>
                          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                            Save {pricing.savings.percent}% — {pricing.yearly.monthlyEquivalent}/month
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                      <TouchableOpacity
                        style={[styles.switchButton, { borderColor: theme.textSecondary }]}
                        onPress={() => handlePlanChange('monthly')}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color={theme.textSecondary} size="small" />
                        ) : (
                          <Text style={[styles.switchButtonText, { color: theme.textSecondary }]}>
                            Switch to Monthly
                          </Text>
                        )}
                      </TouchableOpacity>
                  )}
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
                  { backgroundColor: theme.textSecondary + '15', borderColor: theme.textSecondary + '40' },
                ]}
                onPress={handleCancel}
              >
                <Icon name="cog-outline" size={18} color={theme.textSecondary} style={{ marginRight: spacing.xs }} />
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                  Manage Subscription
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Restore Purchases Button - Always visible at bottom */}
        <TouchableOpacity
          style={{ alignSelf: 'center', padding: spacing.sm }}
          onPress={handleRestore}
          disabled={processing}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 14, textDecorationLine: 'underline' }}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <PaymentIssueModal
        visible={showPaymentIssue}
        onClose={() => setShowPaymentIssue(false)}
        paymentState={paymentState as 'GRACE_PERIOD' | 'ON_HOLD'}
        gracePeriodEndDate={gracePeriodEndDate}
      />

      {/* Custom Alert Dialog */}
      {AlertComponent}
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
  // Premium Status Card Styles
  premiumStatusCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  premiumIconBadge: {
    padding: 8,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  premiumTitleContainer: {
    flex: 1,
  },
  premiumTitle: {
    ...typography.titleMedium,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  renewalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  renewalInfoText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
  },
  trialBadgeContainer: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
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
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

