/**
 * Subscription Service
 * Purpose: Manages subscriptions with native IAP and backend sync
 * 
 * Flow:
 * 1. Initialize IAP connection
 * 2. Purchase via native IAP (App Store/Play Store)
 * 3. Get receipt from IAP
 * 4. Send receipt to backend for validation
 * 5. Backend verifies with Apple/Google
 * 6. Backend updates subscription in database
 * 7. Return subscription status to app
 * 
 * Features:
 * - Native IAP integration (iOS and Android)
 * - Backend receipt validation
 * - Mock mode for local testing
 * - Purchase restoration
 * - Trial management
 */

import { Platform } from 'react-native';
import { iapService, PurchaseResult } from './iap.service';
import { api } from './apiClient';
import { IAP_CONFIG, getProductId } from '../config/iap.config';
import { Subscription } from '../types';

const TRIAL_DAYS = 7;

/**
 * Subscription service with native IAP integration
 */
export const subscriptionService = {
  /**
   * Initialize IAP connection
   * Should be called when app starts
   */
  async initialize(): Promise<void> {
    try {
      await iapService.initialize();
      console.log('[Subscription] IAP initialized successfully');
    } catch (error) {
      console.error('[Subscription] IAP initialization failed:', error);
      throw error;
    }
  },

  /**
   * Get current subscription status from backend
   * Fetches the most up-to-date subscription info
   */
  async getSubscriptionStatus(): Promise<Subscription> {
    try {
      const response = await api.get<{ subscription: Subscription }>('/subscriptions/status');
      
      if (response.success && response.data) {
        return response.data.subscription;
      }
      
      throw new Error('Failed to get subscription status');
    } catch (error: any) {
      console.error('[Subscription] Failed to get status:', error);
      
      // Return default free tier on error
      return {
        tier: 'free',
        isActive: true,
        isTrial: false,
      };
    }
  },

  /**
   * Get available products
   * Returns subscription options from store
   */
  async getProducts() {
    try {
      return await iapService.getProducts();
    } catch (error) {
      console.error('[Subscription] Failed to get products:', error);
      throw error;
    }
  },

  /**
   * Purchase premium subscription
   * Handles complete purchase flow with backend validation
   * 
   * @param productType - 'monthly' or 'yearly'
   * @returns Purchase result with subscription data
   */
  async purchasePremium(
    productType: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ success: boolean; subscription: Subscription }> {
    try {
      // Step 1: Get product ID for current platform
      const productKey = productType === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
      const productId = getProductId(productKey, Platform.OS as 'ios' | 'android');
      
      console.log(`[Subscription] Starting purchase for: ${productId}`);
      
      // Step 2: Purchase via native IAP
      const purchaseResult: PurchaseResult = await iapService.purchaseSubscription(productId);

      if (!purchaseResult.success) {
        // Handle specific error cases
        if (purchaseResult.error === 'USER_CANCELLED') {
          throw new Error('Purchase was cancelled');
        }
        if (purchaseResult.error === 'ALREADY_OWNED') {
          throw new Error('You already own this subscription');
        }
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      console.log('[Subscription] Purchase successful, validating with backend...');

      // Step 3: Validate receipt with backend
      try {
        const response = await api.post<{ subscription: Subscription }>('/subscriptions/verify-purchase', {
          transactionId: purchaseResult.transactionId,
          receipt: purchaseResult.receipt,
          productId: purchaseResult.productId,
          platform: purchaseResult.platform,
        });

        if (response.success && response.data) {
          console.log('[Subscription] Backend validation successful');
          return {
            success: true,
            subscription: response.data.subscription,
          };
        }

        throw new Error('Backend validation failed');
      } catch (backendError: any) {
        console.error('[Subscription] Backend validation failed:', backendError);
        throw new Error('Purchase successful but validation failed. Please contact support.');
      }
    } catch (error: any) {
      console.error('[Subscription] Purchase failed:', error);
      throw error;
    }
  },

  /**
   * Start free trial (no IAP needed)
   * Directly activates trial on backend
   */
  async startFreeTrial(): Promise<{
    success: boolean;
    subscription: Subscription;
  }> {
    try {
      const response = await api.post<{ subscription: Subscription }>('/subscriptions/trial');
      
      if (response.success && response.data) {
        return {
          success: true,
          subscription: response.data.subscription,
        };
      }
      
      throw new Error('Failed to start trial');
    } catch (error: any) {
      console.error('[Subscription] Trial start failed:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   * Note: User must cancel via App Store/Play Store settings
   * This just marks it in our backend
   */
  async cancelSubscription(): Promise<{ success: boolean }> {
    try {
      const response = await api.post('/subscriptions/cancel');
      
      if (response.success) {
        return { success: true };
      }
      
      throw new Error('Failed to cancel subscription');
    } catch (error: any) {
      console.error('[Subscription] Cancellation failed:', error);
      throw error;
    }
  },

  /**
   * Restore purchases
   * Used when user reinstalls app or switches devices
   * Queries IAP for previous purchases and validates with backend
   */
  async restorePurchases(): Promise<{
    success: boolean;
    subscription: Subscription | null;
  }> {
    try {
      // Get previous purchases from store
      const purchases = await iapService.restorePurchases();
      
      if (purchases.length === 0) {
        console.log('[Subscription] No purchases to restore');
        return { success: true, subscription: null };
      }

      // Validate most recent purchase with backend
      const latestPurchase = purchases[0];
      console.log('[Subscription] Restoring purchase:', latestPurchase.transactionId);

      const response = await api.post<{ subscription: Subscription }>('/subscriptions/restore', {
        transactionId: latestPurchase.transactionId,
        receipt: latestPurchase.receipt,
        platform: latestPurchase.platform,
      });

      if (response.success && response.data) {
        return {
          success: true,
          subscription: response.data.subscription,
        };
      }

      throw new Error('Failed to restore purchase');
    } catch (error: any) {
      console.error('[Subscription] Restore failed:', error);
      throw error;
    }
  },

  /**
   * Get subscription price
   */
  getPrice(type: 'monthly' | 'yearly' = 'monthly'): number {
    return type === 'yearly' 
      ? IAP_CONFIG.PRODUCTS.PREMIUM_YEARLY.priceValue 
      : IAP_CONFIG.PRODUCTS.PREMIUM_MONTHLY.priceValue;
  },

  /**
   * Get trial days
   */
  getTrialDays(): number {
    return TRIAL_DAYS;
  },

  /**
   * Clean up IAP connection
   * Should be called when app is closing
   */
  async cleanup(): Promise<void> {
    try {
      await iapService.disconnect();
      console.log('[Subscription] Cleaned up successfully');
    } catch (error) {
      console.error('[Subscription] Cleanup failed:', error);
    }
  },
};

export default subscriptionService;

