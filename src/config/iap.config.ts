/**
 * IAP Configuration with Comprehensive Mock Testing
 * Purpose: Configure in-app purchases with mock support for local development
 * 
 * Features:
 * - Native IAP product configuration
 * - Mock scenarios for all test cases
 * - Environment-based toggling
 * 
 * When ENABLE_MOCKS is true (local dev), you can simulate:
 * - Successful purchases
 * - Failed payments
 * - Cancelled purchases
 * - Expired subscriptions
 * - Pending transactions
 * - Receipt validation failures
 */

/**
 * Check if we're in development mode
 */
const isDevelopment = __DEV__;

/**
 * IAP Configuration
 */
export const IAP_CONFIG = {
  // Enable mocks for local development/testing
  // Set to false to test real IAP in development
  ENABLE_MOCKS: false,
  
  // Product IDs (from App Store Connect & Google Play Console)
  PRODUCTS: {
    PREMIUM_MONTHLY: {
      ios: 'finly_premium_monthly',
      android: 'finly.premium.monthly',
      price: '$4.99',
      priceValue: 4.99,
    },
    PREMIUM_YEARLY: {
      ios: 'finly_premium_yearly',
      android: 'finly.premium.yearly',
      price: '$35.99',
      priceValue: 35.99,
    },
  },
  
  // Mock testing scenarios for local development
  MOCK_SCENARIOS: {
    // ✅ Success scenarios
    SUCCESS: 'success',
    SUCCESS_WITH_TRIAL: 'success_with_trial',
    SUCCESS_YEARLY: 'success_yearly',
    
    // ❌ Error scenarios
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_DECLINED: 'payment_declined',
    USER_CANCELLED: 'user_cancelled',
    ALREADY_OWNED: 'already_owned',
    NETWORK_ERROR: 'network_error',
    STORE_UNAVAILABLE: 'store_unavailable',
    
    // 🔄 Edge cases
    PENDING_PAYMENT: 'pending_payment',
    INVALID_RECEIPT: 'invalid_receipt',
    EXPIRED_SUBSCRIPTION: 'expired_subscription',
    ABOUT_TO_EXPIRE: 'about_to_expire',
    
    // 🧪 Backend validation errors
    BACKEND_VALIDATION_FAILED: 'backend_validation_failed',
    BACKEND_TIMEOUT: 'backend_timeout',
  } as const,
  
  // Delay simulation for mock purchases (ms)
  MOCK_DELAYS: {
    QUICK: 500,
    NORMAL: 1500,
    SLOW: 3000,
  },
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * Type for mock scenarios
 */
export type MockScenario = keyof typeof IAP_CONFIG.MOCK_SCENARIOS | null;

/**
 * Get product ID for current platform
 */
export const getProductId = (
  product: keyof typeof IAP_CONFIG.PRODUCTS,
  platform: 'ios' | 'android'
): string => {
  return IAP_CONFIG.PRODUCTS[product][platform];
};

export default IAP_CONFIG;

