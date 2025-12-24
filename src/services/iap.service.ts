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
import { logger } from '../utils/logger';
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  PurchaseError,
  Purchase
} from 'react-native-iap';
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
  purchaseToken?: string;
  originalPurchase?: any;
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
  private mockEnabled: boolean = IAP_CONFIG.ENABLE_MOCKS;
  private purchaseUpdatedListener: any = null;
  private purchaseErrorListener: any = null;
  private onPurchaseUpdate: ((purchase: PurchaseResult) => Promise<void>) | null = null;

  /**
   * Initialize IAP connection
   * Must be called before any other IAP operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('[IAP] Already initialized');
      return;
    }

    if (this.mockEnabled) {
      logger.debug('[IAP Mock] Initialized in mock mode');
      this.initialized = true;
      return;
    }

    let retries = 3;
    while (retries > 0) {
      try {
        await initConnection();
        
        // Clear any unfinished transactions on Android
        if (Platform.OS === 'android') {
          // Note: flushFailedPurchasesCachedAsPendingAndroid was removed in v14
          logger.debug('[IAP] Android initialization complete');
        }

        // Setup listeners
        this.setupListeners();
        
        this.initialized = true;
        logger.debug('[IAP] Initialized successfully');
        return;
      } catch (error: any) {
        console.error(`[IAP] Initialization failed (attempts left: ${retries - 1}):`, error);
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to initialize in-app purchases: ${error.message}`);
        }
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Setup IAP listeners
   */
  private setupListeners(): void {
    if (this.purchaseUpdatedListener) {
      this.purchaseUpdatedListener.remove();
    }
    if (this.purchaseErrorListener) {
      this.purchaseErrorListener.remove();
    }

    this.purchaseUpdatedListener = purchaseUpdatedListener(async (purchase: any) => {
      logger.debug('[IAP] Purchase updated listener triggered:', purchase.transactionId);
      
      const purchaseResult: PurchaseResult = {
        success: true,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt,
        productId: purchase.productId,
        platform: Platform.OS as 'ios' | 'android',
        purchaseToken: purchase.purchaseToken,
        originalPurchase: purchase,
      };

      if (this.onPurchaseUpdate) {
        try {
          await this.onPurchaseUpdate(purchaseResult);
        } catch (error) {
          console.error('[IAP] Error in purchase update handler:', error);
        }
      }
    });

    this.purchaseErrorListener = purchaseErrorListener((error: PurchaseError) => {
      console.error('[IAP] Purchase error listener triggered:', error);
    });
  }

  /**
   * Set callback for purchase updates
   * @param callback - Function to handle purchase updates
   */
  setPurchaseListener(callback: (purchase: PurchaseResult) => Promise<void>): void {
    this.onPurchaseUpdate = callback;
  }

  /**
   * Set mock scenario for testing (only works in mock mode)
   * @param scenario - Mock scenario to simulate
   */
  setMockScenario(scenario: MockScenario): void {
    if (!IAP_CONFIG.ENABLE_MOCKS) {
      logger.warn('[IAP] Mock scenarios only available in development mode');
      return;
    }
    this.mockScenario = scenario;
    logger.debug(`[IAP Mock] Scenario set to: ${scenario || 'default (success)'}`);
  }

  /**
   * Set mock mode dynamically
   * @param enabled - Whether to enable mock mode
   */
  setMockMode(enabled: boolean): void {
    this.mockEnabled = enabled;
    // Re-initialize if switching modes
    this.initialized = false;
    logger.debug(`[IAP] Mock mode set to: ${enabled}`);
  }

  /**
   * Get available subscription products
   * @returns Array of product information
   */
  async getProducts(): Promise<ProductInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.mockEnabled) {
      return this.getMockProducts();
    }

    const productIds = Platform.select({
      ios: [
        getProductId('PREMIUM_MONTHLY', 'ios'),
        getProductId('PREMIUM_YEARLY', 'ios'),
      ],
      // Android uses single subscription product with multiple base plans
      android: [
        getProductId('PREMIUM_MONTHLY', 'android'), // Both return 'finly_premium'
      ],
    }) || [];
    
    // Dedupe for Android (since monthly and yearly have same product ID)
    const uniqueProductIds = [...new Set(productIds)];

    try {
      const products = await fetchProducts({ skus: uniqueProductIds, type: 'subs' });
      
      if (!products || products.length === 0) {
        logger.warn('[IAP] No products returned from store');
        return [];
      }
      
      return products.map((p: any) => ({
        productId: p.productId,
        title: p.title || 'Finly Premium',
        description: p.description || 'Unlock all premium features',
        price: p.price || '$9.99',
        currency: p.currency || 'USD',
        localizedPrice: p.localizedPrice || p.price || '$9.99',
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

    if (this.mockEnabled) {
      return this.mockPurchase(productId);
    }

    try {
      // Ensure products are loaded/fetched first
      await this.getProducts();

      logger.debug(`[IAP] Requesting purchase for sku: ${productId} on ${Platform.OS}`);
      
      // v14 uses platform-specific parameters wrapped in a request object
      const purchase = await requestPurchase({
        request: Platform.OS === 'ios'
          ? {
              ios: {
                sku: productId,
                andDangerouslyFinishTransactionAutomatically: false,
              },
            }
          : {
              android: {
                skus: [productId],
                ...(offerToken && {
                  subscriptionOffers: [{ sku: productId, offerToken }],
                }),
              },
            },
        type: 'subs',
      });

      // NOTE: We do NOT acknowledge/finish here anymore.
      // We wait for backend validation first.

      if (!purchase) {
        throw new Error('Purchase returned null');
      }

      // Handle array response (can happen in some cases)
      const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!purchaseData) {
        throw new Error('No purchase data returned');
      }

      return {
        success: true,
        transactionId: purchaseData.transactionId || '',
        receipt: (purchaseData as any).transactionReceipt || purchaseData.transactionId || '',
        productId: purchaseData.productId,
        platform: Platform.OS as 'ios' | 'android',
        purchaseToken: (purchaseData as any).purchaseToken,
        originalPurchase: purchaseData,
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
   * Finish transaction after successful backend validation
   * @param purchaseResult - Result from purchaseSubscription
   */
  async finishTransaction(purchaseResult: PurchaseResult): Promise<void> {
    if (this.mockEnabled) return;

    try {
      if (Platform.OS === 'android' && purchaseResult.purchaseToken) {
        await acknowledgePurchaseAndroid(purchaseResult.purchaseToken);
        logger.debug('[IAP] Purchase acknowledged on Android');
      } else if (Platform.OS === 'ios' && purchaseResult.originalPurchase) {
        await finishTransaction({ 
          purchase: purchaseResult.originalPurchase, 
          isConsumable: false 
        });
        logger.debug('[IAP] Transaction finished on iOS');
      }
    } catch (error) {
      console.error('[IAP] Failed to finish transaction:', error);
      // Don't throw, as the user already has the subscription
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

    if (this.mockEnabled) {
      return this.mockRestore();
    }

    try {
      const purchases = await getAvailablePurchases();
      
      return purchases.map(p => ({
        success: true,
        transactionId: p.transactionId || undefined,
        receipt: (p as any).transactionReceipt || p.transactionId,
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
    if (!this.mockEnabled && this.initialized) {
      try {
        if (this.purchaseUpdatedListener) {
          this.purchaseUpdatedListener.remove();
          this.purchaseUpdatedListener = null;
        }
        if (this.purchaseErrorListener) {
          this.purchaseErrorListener.remove();
          this.purchaseErrorListener = null;
        }
        
        await endConnection();
        this.initialized = false;
        logger.debug('[IAP] Disconnected successfully');
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
        description: 'Unlock all premium features - Save 30%!',
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
    logger.debug(`[IAP Mock] Simulating purchase for: ${productId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, IAP_CONFIG.MOCK_DELAYS.NORMAL));

    const scenario = this.mockScenario || 'SUCCESS';
    const timestamp = Date.now();

    switch (scenario) {
      case 'SUCCESS':
        return {
          success: true,
          transactionId: `mock_txn_${timestamp}`,
          receipt: `mock_receipt_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'SUCCESS_WITH_TRIAL':
        return {
          success: true,
          transactionId: `mock_trial_${timestamp}`,
          receipt: `mock_receipt_trial_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'SUCCESS_YEARLY':
        return {
          success: true,
          transactionId: `mock_yearly_${timestamp}`,
          receipt: `mock_receipt_yearly_${timestamp}`,
          productId: getProductId('PREMIUM_YEARLY', Platform.OS as 'ios' | 'android'),
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'PAYMENT_FAILED':
        return {
          success: false,
          error: 'PAYMENT_FAILED',
        };

      case 'PAYMENT_DECLINED':
        return {
          success: false,
          error: 'PAYMENT_DECLINED',
        };

      case 'USER_CANCELLED':
        return {
          success: false,
          error: 'USER_CANCELLED',
        };

      case 'ALREADY_OWNED':
        return {
          success: false,
          error: 'ALREADY_OWNED',
        };

      case 'PENDING_PAYMENT':
        return {
          success: false,
          error: 'PAYMENT_PENDING',
        };

      case 'NETWORK_ERROR':
        throw new Error('Network error: Could not connect to store');

      case 'STORE_UNAVAILABLE':
        throw new Error('Store unavailable: Please try again later');

      case 'INVALID_RECEIPT':
        return {
          success: true,
          transactionId: `mock_invalid_${timestamp}`,
          receipt: 'INVALID_RECEIPT_DATA',
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'BACKEND_VALIDATION_FAILED':
        return {
          success: true,
          transactionId: `mock_backend_fail_${timestamp}`,
          receipt: `mock_receipt_backend_fail_${timestamp}`,
          productId,
          platform: Platform.OS as 'ios' | 'android',
        };

      case 'BACKEND_TIMEOUT':
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
    logger.debug('[IAP Mock] Simulating restore purchases');
    
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

