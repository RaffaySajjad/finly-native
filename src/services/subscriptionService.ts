/**
 * Subscription Service
 * Purpose: Handles subscription-related API calls and payment processing (mocked)
 * In production, integrates with StoreKit (iOS) and Google Play Billing (Android)
 */

import { Subscription, SubscriptionTier } from '../types';

const SUBSCRIPTION_PRICE = 4.99;
const TRIAL_DAYS = 7;

/**
 * Mock subscription service
 * In production, replace with actual StoreKit/Google Play Billing integration
 */
export const subscriptionService = {
  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<Subscription> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In production, fetch from backend/StoreKit/Play Billing
    return {
      tier: 'free',
      isActive: true,
      isTrial: false,
    };
  },

  /**
   * Purchase premium subscription
   * @param paymentMethodId - Mock payment method ID
   */
  async purchasePremium(paymentMethodId?: string): Promise<{ success: boolean; subscription: Subscription }> {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock payment validation
    if (paymentMethodId === 'invalid') {
      throw new Error('Payment failed');
    }

    const now = new Date();
    const subscription: Subscription = {
      tier: 'premium',
      isActive: true,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isTrial: false,
    };

    return { success: true, subscription };
  },

  /**
   * Start free trial
   */
  async startFreeTrial(): Promise<{ success: boolean; subscription: Subscription }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    const now = new Date();
    const subscription: Subscription = {
      tier: 'premium',
      isActive: true,
      startDate: now.toISOString(),
      trialEndDate: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      isTrial: true,
    };

    return { success: true, subscription };
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ success: boolean }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In production, call StoreKit/Play Billing cancel API
    return { success: true };
  },

  /**
   * Restore purchases (for restoring on new device)
   */
  async restorePurchases(): Promise<{ success: boolean; subscription: Subscription | null }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, check StoreKit/Play Billing for existing purchases
    return { success: true, subscription: null };
  },

  /**
   * Get subscription price
   */
  getPrice(): number {
    return SUBSCRIPTION_PRICE;
  },

  /**
   * Get trial days
   */
  getTrialDays(): number {
    return TRIAL_DAYS;
  },
};

export default subscriptionService;

