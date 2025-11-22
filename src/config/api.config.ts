/**
 * API Configuration
 * Purpose: Centralized API configuration for Finly mobile app
 * Manages base URL, timeouts, and API versioning
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Gets the development base URL based on the execution environment
 * Handles emulators, simulators, and physical devices automatically
 * @returns {string} Development API base URL
 */
const getDevBaseUrl = (): string => {
  const BACKEND_PORT = 3000;
  const LOCAL_IP = '192.168.1.102';

  return `http://${LOCAL_IP}:${BACKEND_PORT}`;

  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    // For physical Android devices, use your computer's local IP address
    // You can find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
    // Common options:
    // - '10.0.2.2' for Android emulator (default)
    // - '192.168.x.x' for physical Android device (replace with your local IP)
    return `http://${LOCAL_IP}:${BACKEND_PORT}`;
  } else {
    // iOS simulator can use localhost
    // For physical iOS device, use your computer's local IP address
    // You can find it by running: ifconfig | grep "inet " | grep -v 127.0.0.1
    // Common options:
    // - 'localhost' for iOS simulator (default)
    // - '192.168.x.x' for physical iOS device (replace with your local IP)
    return `http://${LOCAL_IP}:${BACKEND_PORT}`;
  }
};

/**
 * API Environment Configuration
 * The development URL is automatically detected from Expo's dev server
 * No manual configuration needed!
 */
export const API_CONFIG = {
  // Base URL for the Finly API
  // For development: Automatically uses Expo's detected IP (works for emulators & physical devices)
  // For production: Uses production API URL
  BASE_URL: __DEV__
    ? getDevBaseUrl() // Auto-detected from Expo
    : 'https://api.finly.app',

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
    UPDATE_BALANCE: '/auth/balance'
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
    IMPORT: '/categories/import',
    IMPORT_BATCH: '/categories/import/batch'
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
    DAILY_SPENDING: '/analytics/daily-spending',
    TREND: '/analytics/trend',
    BUDGET_STATUS: '/analytics/budget-status',
    TRANSACTIONS: '/analytics/transactions',
    FORECAST: '/analytics/forecast'
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
    THREADS: '/ai/threads'
  }
} as const;

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@finly_access_token',
  REFRESH_TOKEN: '@finly_refresh_token',
  USER_DATA: '@finly_user_data',
  TOKEN_EXPIRY: '@finly_token_expiry',
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

