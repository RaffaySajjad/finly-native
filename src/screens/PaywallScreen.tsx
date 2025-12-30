/**
 * PaywallScreen Component
 * Purpose: Hard paywall displayed after onboarding completion
 * 
 * Users MUST subscribe (with 7-day free trial) or restore to access the app.
 * There is no skip/dismiss option (hard paywall).
 * 
 * Existing free users without PAYWALL_COMPLETE_KEY go through this flow as well.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Animated, Dimensions, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { GradientHeader } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { usePricing } from '../contexts/PricingContext';
import { useAlert } from '../hooks/useAlert';
import { useAppFlow } from '../contexts/AppFlowContext';
import { useAppDispatch, useAppSelector } from '../store';
import { logout as logoutAction } from '../store/slices/authSlice';
import { useAuth } from '../contexts/AuthContext';

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

import { RouteProp, useRoute } from '@react-navigation/native';
import { Easing } from 'react-native-reanimated';

// ...

type PaywallScreenRouteProp = RouteProp<RootStackParamList, 'Paywall'>;

const PaywallScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaywallScreenRouteProp>();
  const params = route.params as { reason?: string; preselectedPlan?: 'monthly' | 'yearly' } | undefined;
  const insets = useSafeAreaInsets();

  // Check if this is an expired subscription - either from route params or from Redux state
  const { subscription } = useAppSelector((state) => state.subscription);
  const isExpiredSubscription = params?.reason === 'expired' || subscription.status === 'EXPIRED';

  const { markPaywallComplete } = useAppFlow();
  const { logout } = useAuth();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1)),
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
        isExpiredSubscription ? 'Welcome Back! 🎉' : 'Welcome to Finly Pro! 🎉',
        isExpiredSubscription
          ? "Your subscription has been renewed. All your data is intact and ready for you."
          : "Your 7-day free trial has started. You'll be charged after the trial ends unless you cancel.",
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
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
            {isExpiredSubscription ? 'Subscription Expired' : 'Unlock Finly Pro'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isExpiredSubscription
              ? "Renew now to continue accessing your insights."
              : "Start your 7-day free trial and take control of your finances."}
          </Text>
        </Animated.View>



        {/* Banner - Different for expired vs new users */}
        {isExpiredSubscription ? (
          // Data Reassurance Banner for expired users
          <Animated.View
            style={[
              styles.trialBanner,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary },
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.trialBannerContent}>
              <Icon name="shield-check" size={28} color={theme.primary} />
              <View style={styles.trialBannerText}>
                <Text style={[styles.trialBannerTitle, { color: theme.text }]}>
                  Your Data is Safe
                </Text>
                <Text style={[styles.trialBannerSubtitle, { color: theme.textSecondary }]}>
                  All your transactions, categories, and insights are preserved. Pick up right where you left off.
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          // Free Trial Banner for new users
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
        )}

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
      <View style={[styles.bottomActions, {
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        paddingBottom: insets.bottom + spacing.sm
      }]}>
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
                  {isExpiredSubscription ? 'Renew Subscription' : 'Start 7-Day Free Trial'}
              </Text>
              <Text style={styles.subscribeButtonSubtext}>
                  {isExpiredSubscription
                    ? `${selectedPlan === 'yearly' ? pricing.yearly.price + '/year' : pricing.monthly.price + '/month'}`
                    : `Then ${selectedPlan === 'yearly' ? pricing.yearly.price + '/year' : pricing.monthly.price + '/month'}`
                  }
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

        {/* Restore original Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            if (isLoggingOut) return;
            setIsLoggingOut(true);
            try {
              await logout();
              await dispatch(logoutAction());
            } catch (error) {
              console.error('Logout failed:', error);
              showError('Logout Failed', 'Please try again.');
              setIsLoggingOut(false);
            }
          }}
          disabled={isLoggingOut}
        >
          <Text style={[styles.logoutButtonText, { color: theme.expense }]}>
            {isLoggingOut ? 'Logging Out...' : 'Log Out'}
          </Text>
        </TouchableOpacity>
      </View>

      {AlertComponent}
    </View>
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
    paddingHorizontal: spacing.xl, // Add padding for header content
    marginTop: spacing.xl, // Add top margin to avoid overlap with back button if present (though sticky header handles it)
  },
  menuButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100, // Increased z-index
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
    paddingTop: spacing.sm,
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
  logoutButton: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    alignItems: 'center'
  },
  logoutButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
  },
});

export default PaywallScreen;
