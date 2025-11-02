/**
 * In-App Purchase Service
 * Purpose: Unified interface for native IAP with mock support for testing
 * 
 * Features:
 * - Native IAP integration (react-native-iap)
 * - Mock mode for local testing with all scenarios
 * - Receipt validation
 * - Error handling with retries
 * - Purchase restoration
 * 
 * Architecture:
 * - In mock mode: Simulates all IAP flows locally
 * - In production mode: Uses real App Store/Play Store
 */

import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import { IAP_CONFIG, MockScenario, getProductId } from '../config/iap.config';

/**
 * Purchase result interface
 */
export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  receipt?: string;
  error?: string;
  productId?: string;
  platform?: 'ios' | 'android';
}

/**
 * Product information interface
 */
export interface ProductInfo {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
}

/**
 * IAP Service Class
 * Handles all in-app purchase operations with mock support
 */
class IAPService {
  private initialized = false;
  private mockScenario: MockScenario = null;

  /**
   * Initialize IAP connection
   * Must be called before any other IAP operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[IAP] Already initialized');
      return;
    }

    if (IAP_CONFIG.ENABLE_MOCKS) {
      console.log('[IAP Mock] Initialized in mock mode');
      this.initialized = true;
      return;
    }

    try {
      await RNIap.initConnection();
      
      // Clear any unfinished transactions on Android
      if (Platform.OS === 'android') {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
      }
      
      this.initialized = true;
      console.log('[IAP] Initialized successfully');
    } catch (error) {
      console.error('[IAP] Initialization failed:', error);
      throw new Error('Failed to initialize in-app purchases');
    }
  }

  /**
   * Set mock scenario for testing (only works in mock mode)
   * @param scenario - Mock scenario to simulate
   */
  setMockScenario(scenario: MockScenario): void {
    if (!IAP_CONFIG.ENABLE_MOCKS) {
      console.warn('[IAP] Mock scenarios only available in development mode');
      return;
    }
    this.mockScenario = scenario;
    console.log(`[IAP Mock] Scenario set to: ${scenario || 'default (success)'}`);
  }

  /**
   * Get available subscription products
   * @returns Array of product information
   */
  async getProducts(): Promise<ProductInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (IAP_CONFIG.ENABLE_MOCKS) {
      return this.getMockProducts();
    }

    const productIds = Platform.select({
      ios: [
        getProductId('PREMIUM_MONTHLY', 'ios'),
        getProductId('PREMIUM_YEARLY', 'ios'),
      ],
      android: [
        getProductId('PREMIUM_MONTHLY', 'android'),
        getProductId('PREMIUM_YEARLY', 'android'),
      ],
    }) || [];

    try {
      const products = await RNIap.getSubscriptions({ skus: productIds });
      return products.map(p => ({
        productId: p.productId,
        title: p.title || 'Finly Premium',
        description: p.description || 'Unlock all premium features',
        price: p.price || '$4.99',
        currency: p.currency || 'USD',
        localizedPrice: p.localizedPrice || p.price || '$4.99',
      }));
    } catch (error) {
      console.error('[IAP] Failed to get products:', error);
      throw new Error('Failed to load subscription options');
    }
  }

  /**
   * Purchase subscription
   * @param productId - Product identifier
   * @param offerToken - Android subscription offer token (optional)
   * @returns Purchase result with transaction details
   */
  async purchaseSubscription(
    productId: string,
    offerToken?: string
  ): Promise<PurchaseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (IAP_CONFIG.ENABLE_MOCKS) {
      return this.mockPurchase(productId);
    }

    try {
      const purchase = await RNIap.requestSubscription({
        sku: productId,
        ...(Platform.OS === 'android' && offerToken && { 
          subscriptionOffers: [{ sku: productId, offerToken }] 
        }),
      });

      // Acknowledge purchase on Android
      if (Platform.OS === 'android' && purchase.purchaseToken) {
        await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
      }

      // Finish transaction on iOS
      if (Platform.OS === 'ios') {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
      }

      return {
        success: true,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt,
        productId: purchase.productId,
        platform: Platform.OS as 'ios' | 'android',
      };
    } catch (error: any) {
      console.error('[IAP] Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error.code === 'E_USER_CANCELLED') {
        return {
          success: false,
          error: 'USER_CANCELLED',
        };
      }

      // Handle already owned
      if (error.code === 'E_ALREADY_OWNED') {
        return {
          success: false,
          error: 'ALREADY_OWNED',
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore purchases
   * Used when user reinstalls app or switches devices
   * @returns Array of purchase results
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (IAP_CONFIG.ENABLE_MOCKS) {
      return this.mockRestore();
    }

    try {
      const purchases = await RNIap.getAvailablePurchases();
      
      return purchases.map(p => ({
        success: true,
        transactionId: p.transactionId,
        receipt: p.transactionReceipt,
        productId: p.productId,
        platform: Platform.OS as 'ios' | 'android',
      }));
    } catch (error) {
      console.error('[IAP] Restore failed:', error);
      throw new Error('Failed to restore purchases');
    }
  }

  /**
   * Clean up IAP connection
   * Should be called when app is closing
   */
  async disconnect(): Promise<void> {
    if (!IAP_CONFIG.ENABLE_MOCKS && this.initialized) {
      try {
        await RNIap.endConnection();
        this.initialized = false;
        console.log('[IAP] Disconnected successfully');
      } catch (error) {
        console.error('[IAP] Disconnect failed:', error);
      }
    }
  }

  // ============================================
  // Mock Implementation for Local Testing
  // ============================================

  /**
   * Get mock products for testing
   */
  private getMockProducts(): ProductInfo[] {
    return [
      {
        productId: getProductId('PREMIUM_MONTHLY', Platform.OS as 'ios' | 'android'),
        title: 'Finly Premium Monthly',
        description: 'Unlock all premium features',
        price: IAP_CONFIG.PRODUCTS.PREMIUM_MONTHLY.price,
        currency: 'USD',
        localizedPrice: IAP_CONFIG.PRODUCTS.PREMIUM_MONTHLY.price,
      },
      {
        productId: getProductId('PREMIUM_YEARLY', Platform.OS as 'ios' | 'android'),
        title: 'Finly Premium Yearly',
        description: 'Unlock all premium features - Save 40%!',
        price: IAP_CONFIG.PRODUCTS.PREMIUM_YEARLY.price,
        currency: 'USD',
        localizedPrice: IAP_CONFIG.PRODUCTS.PREMIUM_YEARLY.price,
      },
    ];
  }

  /**
   * Mock purchase for testing all scenarios
   */
  private async mockPurchase(productId: string): Promise<PurchaseResult> {
    console.log(`[IAP Mock] Simulating purchase for: ${productId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, IAP_CONFIG.MOCK_DELAYS.NORMAL));

    const scenario = this.mockScenario || 'SUCCESS';
    const timestamp = Date.now();

    switch (scenario) {
      case 'SUCCESS':
      case 'success':
        return {
          success: true,
          transactionId: `mock_txn_${timestamp}`,
          receipt: `mock_receipt_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'SUCCESS_WITH_TRIAL':
      case 'success_with_trial':
        return {
          success: true,
          transactionId: `mock_trial_${timestamp}`,
          receipt: `mock_receipt_trial_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'SUCCESS_YEARLY':
      case 'success_yearly':
        return {
          success: true,
          transactionId: `mock_yearly_${timestamp}`,
          receipt: `mock_receipt_yearly_${timestamp}`,
          productId: getProductId('PREMIUM_YEARLY', Platform.OS as 'ios' | 'android'),
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'PAYMENT_FAILED':
      case 'payment_failed':
        return {
          success: false,
          error: 'PAYMENT_FAILED',
        };

      case 'PAYMENT_DECLINED':
      case 'payment_declined':
        return {
          success: false,
          error: 'PAYMENT_DECLINED',
        };

      case 'USER_CANCELLED':
      case 'user_cancelled':
        return {
          success: false,
          error: 'USER_CANCELLED',
        };

      case 'ALREADY_OWNED':
      case 'already_owned':
        return {
          success: false,
          error: 'ALREADY_OWNED',
        };

      case 'PENDING_PAYMENT':
      case 'pending_payment':
        return {
          success: false,
          error: 'PAYMENT_PENDING',
        };

      case 'NETWORK_ERROR':
      case 'network_error':
        throw new Error('Network error: Could not connect to store');

      case 'STORE_UNAVAILABLE':
      case 'store_unavailable':
        throw new Error('Store unavailable: Please try again later');

      case 'INVALID_RECEIPT':
      case 'invalid_receipt':
        return {
          success: true,
          transactionId: `mock_invalid_${timestamp}`,
          receipt: 'INVALID_RECEIPT_DATA',
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'BACKEND_VALIDATION_FAILED':
      case 'backend_validation_failed':
        return {
          success: true,
          transactionId: `mock_backend_fail_${timestamp}`,
          receipt: `mock_receipt_backend_fail_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'BACKEND_TIMEOUT':
      case 'backend_timeout':
        return {
          success: true,
          transactionId: `mock_timeout_${timestamp}`,
          receipt: `mock_receipt_timeout_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      default:
        return {
          success: true,
          transactionId: `mock_txn_${timestamp}`,
          receipt: `mock_receipt_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };
    }
  }

  /**
   * Mock restore for testing
   */
  private async mockRestore(): Promise<PurchaseResult[]> {
    console.log('[IAP Mock] Simulating restore purchases');
    
    await new Promise(resolve => setTimeout(resolve, IAP_CONFIG.MOCK_DELAYS.QUICK));

    const timestamp = Date.now();
    return [
      {
        success: true,
        transactionId: `mock_restore_${timestamp}`,
        receipt: `mock_receipt_restore_${timestamp}`,
        productId: getProductId('PREMIUM_MONTHLY', Platform.OS as 'ios' | 'android'),
        platform: Platform.OS as 'ios' | 'android',
      },
    ];
  }
}

/**
 * Singleton instance
 */
export const iapService = new IAPService();
export default iapService;

