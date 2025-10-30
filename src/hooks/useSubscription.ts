/**
 * useSubscription Hook
 * Purpose: Provides easy access to subscription state and methods for feature gating
 */

import { useAppDispatch, useAppSelector } from '../store';
import { SubscriptionTier } from '../types';
import {
  checkSubscriptionStatus,
  subscribeToPremium,
  startFreeTrial,
  cancelSubscription,
  incrementReceiptScans,
  incrementInsights,
} from '../store/slices/subscriptionSlice';

/**
 * Custom hook for subscription management and feature gating
 */
export const useSubscription = () => {
  const dispatch = useAppDispatch();
  const { subscription, usageLimits, isLoading, error } = useAppSelector(
    (state) => state.subscription
  );

  const isPremium = subscription.tier === 'premium' && subscription.isActive;
  const isFree = subscription.tier === 'free';
  const isTrial = subscription.isTrial === true;

  /**
   * Check if a premium feature is available
   */
  const hasAccess = (feature: 'receiptScanning' | 'advancedInsights' | 'voiceEntry' | 'bulkEntry' | 'unlimitedCategories'): boolean => {
    if (isPremium) return true;

    switch (feature) {
      case 'receiptScanning':
        return usageLimits.receiptScans.used < usageLimits.receiptScans.limit;
      case 'advancedInsights':
        return usageLimits.insights.used < usageLimits.insights.limit;
      case 'voiceEntry':
      case 'bulkEntry':
        return false; // Premium only
      case 'unlimitedCategories':
        return usageLimits.categories.used < usageLimits.categories.limit;
      default:
        return false;
    }
  };

  /**
   * Get remaining usage for a feature
   */
  const getRemainingUsage = (feature: 'receiptScanning' | 'advancedInsights' | 'unlimitedCategories'): number => {
    if (isPremium) return Infinity;

    switch (feature) {
      case 'receiptScanning':
        return Math.max(0, usageLimits.receiptScans.limit - usageLimits.receiptScans.used);
      case 'advancedInsights':
        return Math.max(0, usageLimits.insights.limit - usageLimits.insights.used);
      case 'unlimitedCategories':
        return Math.max(0, usageLimits.categories.limit - usageLimits.categories.used);
      default:
        return 0;
    }
  };

  /**
   * Check if feature requires upgrade
   */
  const requiresUpgrade = (feature: 'receiptScanning' | 'advancedInsights' | 'voiceEntry' | 'bulkEntry' | 'unlimitedCategories'): boolean => {
    return !hasAccess(feature);
  };

  /**
   * Track usage of a feature
   */
  const trackUsage = (feature: 'receiptScanning' | 'advancedInsights'): void => {
    if (isPremium) return; // No limits for premium

    if (feature === 'receiptScanning') {
      dispatch(incrementReceiptScans());
    } else if (feature === 'advancedInsights') {
      dispatch(incrementInsights());
    }
  };

  return {
    // State
    subscription,
    usageLimits,
    isPremium,
    isFree,
    isTrial,
    isLoading,
    error,

    // Methods
    hasAccess,
    getRemainingUsage,
    requiresUpgrade,
    trackUsage,

    // Actions
    checkStatus: () => dispatch(checkSubscriptionStatus()),
    subscribe: () => dispatch(subscribeToPremium()),
    startTrial: () => dispatch(startFreeTrial()),
    cancel: () => dispatch(cancelSubscription()),
  };
};

export default useSubscription;

