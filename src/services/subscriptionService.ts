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
import { logger } from '../utils/logger';
import { iapService, PurchaseResult } from './iap.service';
import { api } from './apiClient';
import { IAP_CONFIG, getProductId, getAndroidBasePlanId } from '../config/iap.config';
import { Subscription } from '../types';
import { store } from '../store';
import { checkSubscriptionStatus } from '../store/slices/subscriptionSlice';

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
      logger.debug('[Subscription] IAP initialized successfully');

      // Set up purchase listener for background/interrupted purchases
      iapService.setPurchaseListener(async (purchase) => {
        logger.debug('[Subscription] Received purchase update:', purchase.transactionId);
        await this.verifyAndActivate(purchase);
      });
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
        const subscription = response.data.subscription;
        // Ensure tier is lowercase and isActive is properly set
        return {
          ...subscription,
          tier: subscription.tier.toLowerCase() as 'FREE' | 'PREMIUM',
          isActive: subscription.isActive !== undefined ? subscription.isActive : true,
        };
      }
      
      throw new Error('Failed to get subscription status');
    } catch (error: any) {
      console.error('[Subscription] Failed to get status:', error);
      
      // Return default free tier on error
      return {
        tier: 'FREE',
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
      
      // For Android, get the base plan ID (Google Play's new subscription model)
      const basePlanId = Platform.OS === 'android' 
        ? getAndroidBasePlanId(productKey) 
        : undefined;
      
      console.log(`[Subscription] Starting purchase for: ${productId}${basePlanId ? ` (base plan: ${basePlanId})` : ''}`);
      
      // Step 2: Purchase via native IAP (pass base plan ID as offer token for Android)
      const purchaseResult: PurchaseResult = await iapService.purchaseSubscription(productId, basePlanId);

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

      logger.debug('[Subscription] Purchase successful, validating with backend...');

      // Step 3: Validate receipt with backend
      try {
        const response = await api.post<{ subscription: Subscription }>('/subscriptions/verify-purchase', {
          transactionId: purchaseResult.transactionId,
          receipt: purchaseResult.receipt,
          productId: purchaseResult.productId,
          platform: purchaseResult.platform,
        });

        if (response.success && response.data) {
          logger.debug('[Subscription] Backend validation successful');
          
          // Finish transaction only after successful validation
          await iapService.finishTransaction(purchaseResult);
          
          const subscription = response.data.subscription;
          // Normalize subscription data
          return {
            success: true,
            subscription: {
              ...subscription,
              tier: subscription.tier.toUpperCase() as 'FREE' | 'PREMIUM',
              isActive: subscription.isActive !== undefined ? subscription.isActive : true,
            },
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
   * Verify and activate subscription from purchase result
   * Used by both direct purchase flow and background listeners
   */
  async verifyAndActivate(purchase: PurchaseResult): Promise<void> {
    try {
      logger.debug('[Subscription] Verifying purchase:', purchase.transactionId);
      
      const response = await api.post<{ subscription: Subscription }>('/subscriptions/verify-purchase', {
        transactionId: purchase.transactionId,
        receipt: purchase.receipt,
        productId: purchase.productId,
        platform: purchase.platform,
      });

      if (response.success && response.data) {
        logger.debug('[Subscription] Purchase verified successfully');
        
        // Finish transaction
        await iapService.finishTransaction(purchase);
        
        // Update local state
        const subscription = response.data.subscription;
        store.dispatch(checkSubscriptionStatus());
      }
    } catch (error) {
      console.error('[Subscription] Verification failed:', error);
      // Do NOT finish transaction here, allowing retry
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
   * Change subscription plan (Upgrade/Downgrade)
   * 
   * For Google Play:
   * - Downgrades (Yearly -> Monthly) happen at next renewal
   * - Upgrades (Monthly -> Yearly) happen immediately with proration
   */
  async changePlan(newPlan: 'monthly' | 'yearly'): Promise<{ success: boolean; subscription: Subscription }> {
    try {
      // Step 1: Get new product ID
      const productKey = newPlan === 'yearly' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
      const productId = getProductId(productKey, Platform.OS as 'ios' | 'android');
      
      const basePlanId = Platform.OS === 'android' 
        ? getAndroidBasePlanId(productKey) 
        : undefined;
      
      console.log(`[Subscription] Changing plan to: ${productId}${basePlanId ? ` (base plan: ${basePlanId})` : ''}`);
      
      // Step 2: Initiate purchase with upgrade/downgrade context
      // Note: react-native-iap handles upgrade flows if we pass the correct params
      // But for now, simple purchase flow usually works for switching plans on Android
      const purchaseResult: PurchaseResult = await iapService.purchaseSubscription(productId, basePlanId);

      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Plan change failed');
      }

      // Step 3: Validate with backend
      const response = await api.post<{ subscription: Subscription }>('/subscriptions/verify-purchase', {
        transactionId: purchaseResult.transactionId,
        receipt: purchaseResult.receipt,
        productId: purchaseResult.productId,
        platform: purchaseResult.platform,
        isPlanChange: true,
      });

      if (response.success && response.data) {
        await iapService.finishTransaction(purchaseResult);
        return {
          success: true,
          subscription: response.data.subscription,
        };
      }

      throw new Error('Backend validation failed for plan change');
    } catch (error) {
      console.error('[Subscription] Plan change failed:', error);
      throw error;
    }
  },

  /**
   * Open native subscription management
   */
  async openSubscriptionManagement() {
    const Linking = require('react-native').Linking;
    const packageName = 'com.raffay.finly';
    const subscriptionId = 'finly_premium';
    
    if (Platform.OS === 'android') {
      const url = `https://play.google.com/store/account/subscriptions?package=${packageName}&sku=${subscriptionId}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } else {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
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
        logger.debug('[Subscription] No purchases to restore');
        return { success: true, subscription: null };
      }

      // Validate most recent purchase with backend
      const latestPurchase = purchases[0];
      logger.debug('[Subscription] Restoring purchase:', latestPurchase.transactionId);

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
      logger.debug('[Subscription] Cleaned up successfully');
    } catch (error) {
      console.error('[Subscription] Cleanup failed:', error);
    }
  },
};

export default subscriptionService;

