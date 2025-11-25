/**
 * useSubscription Hook
 * Purpose: Provides easy access to subscription state and methods for feature gating
 */

import { useAppDispatch, useAppSelector } from '../store';
import { SubscriptionTier } from '../types';
import { useCallback, useMemo } from 'react';
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

  // Memoize computed values to prevent unnecessary re-renders
  const isPremium = useMemo(() => 
    subscription.tier === 'PREMIUM' && subscription.isActive, 
    [subscription.tier, subscription.isActive]
  );
  const isFree = useMemo(() => 
    subscription.tier === 'FREE', 
    [subscription.tier]
  );
  const isTrial = useMemo(() => 
    subscription.isTrial === true, 
    [subscription.isTrial]
  );
  const isCanceled = useMemo(() => 
    subscription.status === 'CANCELED' && subscription.isActive, 
    [subscription.status, subscription.isActive]
  );

  // Memoize checkStatus to prevent infinite loops
  // Only dispatch if not already loading to prevent duplicate API calls
  const checkStatus = useCallback(() => {
    if (!isLoading) {
      dispatch(checkSubscriptionStatus());
    }
  }, [dispatch, isLoading]);

  // Memoize other actions
  const subscribe = useCallback(async (productType: 'monthly' | 'yearly' = 'monthly') => {
    await dispatch(subscribeToPremium(productType)).unwrap();
  }, [dispatch]);

  const startTrial = useCallback(async () => {
    await dispatch(startFreeTrial()).unwrap();
  }, [dispatch]);

  const cancel = useCallback(async () => {
    await dispatch(cancelSubscription()).unwrap();
  }, [dispatch]);

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
    isCanceled,
    isLoading,
    error,

    // Methods
    hasAccess,
    getRemainingUsage,
    requiresUpgrade,
    trackUsage,

    // Actions (memoized to prevent re-renders)
    checkStatus,
    subscribe,
    startTrial,
    cancel,
  };
};

export default useSubscription;

