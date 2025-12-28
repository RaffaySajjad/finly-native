/**
 * PaywallScreen Component
 * Purpose: Hard paywall displayed after onboarding completion
 * 
 * Users MUST subscribe (with 7-day free trial) or restore to access the app.
 * There is no skip/dismiss option (hard paywall).
 * 
 * Existing free users without PAYWALL_COMPLETE_KEY go through this flow as well.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { usePricing } from '../contexts/PricingContext';
import { useAlert } from '../hooks/useAlert';
import { useAppFlow } from '../contexts/AppFlowContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  { icon: 'infinity', title: 'Unlimited Everything', description: 'No limits on scanning, voice entry, or categories' },
  { icon: 'brain', title: 'AI-Powered Insights', description: 'Get personalized financial tips and analysis' },
  { icon: 'chart-line', title: 'Advanced Analytics', description: 'Detailed reports and year-over-year trends' },
  { icon: 'camera', title: 'Smart Receipt Scanning', description: 'Instantly extract data from any receipt' },
  { icon: 'microphone', title: 'Voice Transaction Entry', description: 'Just speak to log expenses' },
  { icon: 'file-export', title: 'Export & Backup', description: 'Download your data in multiple formats' },
];

const PaywallScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { markPaywallComplete } = useAppFlow();
  const {
    subscribe,
    restore,
    forceRefresh,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const pricing = usePricing();
  const { showSuccess, showError, showAlert, AlertComponent } = useAlert();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [processing, setProcessing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubscribe = async () => {
    setProcessing(true);
    try {
      await subscribe(selectedPlan);
      await forceRefresh();
      await markPaywallComplete();
      
      showSuccess(
        'Welcome to Finly Pro! 🎉',
        "Your 7-day free trial has started. You'll be charged after the trial ends unless you cancel.",
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (error: any) {
      console.error('[Paywall] Subscribe error:', error);
      
      if (error?.message === 'USER_CANCELLED' || error === 'CANCELLED') {
        setProcessing(false);
        return;
      }

      showError(
        'Subscription Failed',
        'We couldn\'t process your subscription. Please try again or contact support.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restore() as { subscription: any } | undefined;
      
      if (result?.subscription) {
        await markPaywallComplete();
        showSuccess(
          'Subscription Restored!',
          'Your premium subscription has been restored successfully.',
          [{ text: 'Continue', onPress: () => {} }]
        );
      } else {
        showAlert({
          title: 'No Subscription Found',
          message: 'We couldn\'t find an active subscription to restore. Please subscribe to continue.',
          type: 'info',
        });
      }
    } catch (error: any) {
      console.error('[Paywall] Restore error:', error);
      
      if (error === 'No subscription found to restore') {
        showAlert({
          title: 'No Subscription Found',
          message: 'We couldn\'t find an active subscription to restore.',
          type: 'info',
        });
      } else {
        showError('Restore Failed', 'Unable to restore purchases. Please try again.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const savingsPercent = pricing.savings.percent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Crown Icon */}
          <View style={[styles.crownContainer, { backgroundColor: theme.primary + '20' }]}>
            <Icon name="crown" size={48} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Unlock Finly Pro
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Start your 7-day free trial and take control of your finances.
          </Text>
        </Animated.View>

        {/* Free Trial Banner */}
        <Animated.View
          style={[
            styles.trialBanner,
            { backgroundColor: theme.success + '15', borderColor: theme.success },
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.trialBannerContent}>
            <Icon name="gift" size={28} color={theme.success} />
            <View style={styles.trialBannerText}>
              <Text style={[styles.trialBannerTitle, { color: theme.text }]}>
                7 Days Free, Then {selectedPlan === 'yearly' ? pricing.yearly.monthlyEquivalent : pricing.monthly.price}/mo
              </Text>
              <Text style={[styles.trialBannerSubtitle, { color: theme.textSecondary }]}>
                Cancel anytime during trial. No charges.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Plan Selector */}
        <Animated.View
          style={[
            styles.planSelector,
            { backgroundColor: theme.card, borderColor: theme.border },
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'monthly' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text
              style={[
                styles.planLabel,
                { color: selectedPlan === 'monthly' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Monthly
            </Text>
            <Text
              style={[
                styles.planPrice,
                { color: selectedPlan === 'monthly' ? '#FFFFFF' : theme.text },
              ]}
            >
              {pricing.monthly.price}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'yearly' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            {/* Best Value Badge */}
            <View style={[styles.bestValueBadge, { backgroundColor: theme.success }]}>
              <Text style={styles.bestValueText}>SAVE {savingsPercent}%</Text>
            </View>
            <Text
              style={[
                styles.planLabel,
                { color: selectedPlan === 'yearly' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Yearly
            </Text>
            <Text
              style={[
                styles.planPrice,
                { color: selectedPlan === 'yearly' ? '#FFFFFF' : theme.text },
              ]}
            >
              {pricing.yearly.monthlyEquivalent}/mo
            </Text>
            <Text
              style={[
                styles.planBilled,
                { color: selectedPlan === 'yearly' ? 'rgba(255,255,255,0.8)' : theme.textSecondary },
              ]}
            >
              Billed {pricing.yearly.price}/year
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Features List */}
        <Animated.View style={[styles.featuresSection, { opacity: fadeAnim }]}>
          <Text style={[styles.featuresTitle, { color: theme.text }]}>
            Everything you need
          </Text>

          {PREMIUM_FEATURES.map((feature, index) => (
            <View
              key={index}
              style={[
                styles.featureRow,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Icon name={feature.icon as any} size={22} color={theme.primary} />
              </View>
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
        </Animated.View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Icon name="shield-check" size={20} color={theme.success} />
            <Text style={[styles.trustText, { color: theme.textSecondary }]}>
              Cancel anytime
            </Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="lock" size={20} color={theme.success} />
            <Text style={[styles.trustText, { color: theme.textSecondary }]}>
              Secure payment
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions - Sticky */}
      <View style={[styles.bottomActions, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        {/* Single CTA: Start Free Trial (then charges based on plan) */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: theme.primary }, elevation.md]}
          onPress={handleSubscribe}
          disabled={processing || restoring}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>
                Start 7-Day Free Trial
              </Text>
              <Text style={styles.subscribeButtonSubtext}>
                Then {selectedPlan === 'yearly' ? pricing.yearly.price + '/year' : pricing.monthly.price + '/month'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={processing || restoring}
        >
          {restoring ? (
            <ActivityIndicator color={theme.textSecondary} size="small" />
          ) : (
            <Text style={[styles.restoreButtonText, { color: theme.textSecondary }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal Links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService' as any)}>
            <Text style={[styles.legalLink, { color: theme.textTertiary }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.legalDivider, { color: theme.textTertiary }]}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy' as any)}>
            <Text style={[styles.legalLink, { color: theme.textTertiary }]}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 220, // Space for sticky bottom
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  crownContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displaySmall,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  trialBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  trialBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trialBannerText: {
    flex: 1,
  },
  trialBannerTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  trialBannerSubtitle: {
    ...typography.bodySmall,
  },
  planSelector: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  planOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  planLabel: {
    ...typography.labelSmall,
    marginBottom: 4,
  },
  planPrice: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  planBilled: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bestValueText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  featuresSection: {
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustText: {
    ...typography.bodySmall,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  subscribeButton: {
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  subscribeButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  subscribeButtonSubtext: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreButtonText: {
    ...typography.bodyMedium,
    textDecorationLine: 'underline',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.bodySmall,
  },
  legalDivider: {
    ...typography.bodySmall,
  },
});

export default PaywallScreen;
