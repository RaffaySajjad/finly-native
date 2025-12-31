import Constants from 'expo-constants';

/**
 * Get API Base URL
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (from .env files)
 * 2. apiUrl from Expo config extra (set by app.config.js)
 * 3. Default production URL
 * 
 * Single source of truth: .env files → app.config.js → Constants.expoConfig.extra
 */
const getBaseUrl = () => {
  // Runtime environment variable (for Metro bundler, takes precedence)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Build-time config from app.config.js (from .env files)
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  
  // Default production URL
  const defaultUrl = 'https://api.heyfinly.ai';

  const finalUrl = envUrl || configUrl || defaultUrl;

  if (__DEV__) {
    console.log('[API Config] Environment variables:', {
      'EXPO_PUBLIC_API_URL': envUrl || 'not set',
      'Constants.expoConfig.extra.apiUrl': configUrl || 'not set',
      'Final BASE_URL': finalUrl,
    });
  }

  return finalUrl;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),

  // API version
  API_VERSION: 'v1',

  // Request timeout in milliseconds (30 seconds)
  TIMEOUT: 30000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds

  // Token refresh configuration
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000 // Refresh token 5 minutes before expiry
} as const;

/**
 * API Endpoints
 * Centralized endpoint paths for easy maintenance
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
    DELETE_ACCOUNT: '/auth/account',
    DELETE_ALL_DATA: '/auth/delete-all-data',
    UPDATE_BALANCE: '/auth/balance',
    UPDATE_BASE_CURRENCY: '/auth/base-currency'
  },

  // Expenses
  EXPENSES: {
    LIST: '/expenses',
    MONTHLY: '/expenses/monthly',
    STATS_MONTHLY: '/expenses/stats/monthly',
    DETAIL: '/expenses/:id',
    BATCH: '/expenses/batch'
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    SETUP_DEFAULTS: '/categories/setup-defaults',
    SETUP_STATUS: '/categories/setup-status',
    DETAIL: '/categories/:id',
    ROLLOVER: '/categories/:id/rollover', // Get rollover summary for sinking fund categories
    IMPORT: '/categories/import',
    IMPORT_BATCH: '/categories/import/batch',
    PERSONAS: '/categories/personas',
    SETUP_FROM_PERSONA: '/categories/setup-from-persona',
    SETUP_FROM_AI: '/categories/setup-from-ai',
  },

  // Income
  INCOME: {
    SOURCES: '/income/sources',
    TRANSACTIONS: '/income/transactions',
    STATS_MONTHLY: '/income/stats/monthly'
  },

  // Analytics
  ANALYTICS: {
    STATS: '/analytics/stats',
    INSIGHTS: '/analytics/insights',
    INSIGHTS_UNREAD_COUNT: '/analytics/insights/unread-count',
    INSIGHTS_MARK_ALL_READ: '/analytics/insights/mark-all-read',
    INSIGHTS_MARK_READ: '/analytics/insights', // + /:id/read
    DAILY_SPENDING: '/analytics/daily-spending',
    TREND: '/analytics/trend',
    BUDGET_STATUS: '/analytics/budget-status',
    TRANSACTIONS: '/analytics/transactions',
    FORECAST: '/analytics/forecast',
    ADJUST_BALANCE: '/analytics/adjust-balance'
  },

  // Subscriptions
  SUBSCRIPTIONS: {
    STATUS: '/subscriptions/status',
    VERIFY_PURCHASE: '/subscriptions/verify-purchase',
    TRIAL: '/subscriptions/trial',
    CANCEL: '/subscriptions/cancel',
    RESTORE: '/subscriptions/restore'
  },

  // Currency
  CURRENCY: {
    CONVERT: '/currency/convert',
    EXCHANGE_RATE: '/currency/exchange-rate'
  },

  // Tags
  TAGS: {
    LIST: '/tags',
    CREATE_BATCH: '/tags/batch'
  },

  // Import
  IMPORT: {
    CSV: '/import/csv',
    CSV_STATUS: '/import/csv/:jobId'
  },

  // AI
  AI: {
    QUERY: '/ai/query',
    INSIGHTS: '/ai/insights',
    BALANCE_INSIGHTS: '/ai/balance-insights',
    HISTORY: '/ai/history',
    LIMITS: '/ai/limits',
    THREADS: '/ai/threads',
    TRANSCRIBE_AUDIO: '/ai/transcribe-audio',
    PARSE_TRANSACTIONS: '/ai/parse-transactions',
    EXTRACT_RECEIPT: '/ai/extract-receipt',
    GENERATE_CATEGORIES: '/ai/generate-categories',
  }
} as const;

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@finly_access_token',
  REFRESH_TOKEN: '@finly_refresh_token',
  USER_DATA: '@finly_user_data',
  TOKEN_EXPIRY: '@finly_token_expiry'
} as const;

/**
 * Builds full API URL
 * @param path - API endpoint path
 * @returns Full URL with base and version
 */
export const buildApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}/${cleanPath}`;
};
