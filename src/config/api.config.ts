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
  
  // Check if running in Expo Go (has hostUri or debuggerHost)
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:${BACKEND_PORT}`;
  }
  
  // For bare workflow (no Expo Go):
  // Android emulator: 10.0.2.2 maps to host machine's localhost
  // iOS simulator: localhost works directly
  // Physical device: You'll need to set your machine's IP manually below
  
  if (Platform.OS === 'android') {
    // Android emulator special IP that maps to host's localhost
    return `http://10.0.2.2:${BACKEND_PORT}`;
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost directly
    return `http://localhost:${BACKEND_PORT}`;
  }
  
  // For physical devices, uncomment and set your local IP:
  // return `http://192.168.1.XXX:${BACKEND_PORT}`;
  
  // Fallback
  return `http://localhost:${BACKEND_PORT}`;
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
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh token 5 minutes before expiry
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
    RESEND_OTP: '/auth/resend-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
  },
  
  // Expenses (to be implemented in backend)
  EXPENSES: {
    LIST: '/expenses',
    CREATE: '/expenses',
    UPDATE: (id: string) => `/expenses/${id}`,
    DELETE: (id: string) => `/expenses/${id}`,
  },
  
  // Categories (to be implemented in backend)
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    UPDATE: (id: string) => `/categories/${id}`,
    DELETE: (id: string) => `/categories/${id}`,
  },
  
  // Analytics (to be implemented in backend)
  ANALYTICS: {
    STATS: '/analytics/stats',
    INSIGHTS: '/analytics/insights',
    TRENDS: '/analytics/trends',
  },
  
  // Subscriptions
  SUBSCRIPTIONS: {
    STATUS: '/subscriptions/status',
    VERIFY_PURCHASE: '/subscriptions/verify-purchase',
    TRIAL: '/subscriptions/trial',
    CANCEL: '/subscriptions/cancel',
    RESTORE: '/subscriptions/restore',
  },
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

