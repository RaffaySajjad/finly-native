/**
 * API Client
 * Purpose: Axios-based HTTP client with authentication, retry logic, and error handling
 * Features: Token management, automatic token refresh, request retry with exponential backoff
 * Follows best practices for microservices communication
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, buildApiUrl, STORAGE_KEYS } from '../config/api.config';
import logger from '../utils/logger';
import { apiCacheService } from './apiCacheService';

/**
 * Standard API Response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
}

/**
 * Token storage and retrieval utilities
 */
const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.TOKEN_EXPIRY,
    ]);
  },
};

/**
 * Create and configure axios instance
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor: Add authentication token and logging
   */
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log request details (debug level)
      const fullUrl = `${config.baseURL}${config.url}`;
      logger.debug(`[API] Request: ${config.method?.toUpperCase()} ${fullUrl}`, {
        data: config.data,
        headers: config.headers,
      });
      
      return config;
    },
    (error) => {
      logger.error('[API] Request error', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor: Handle token refresh and errors
   */
  client.interceptors.response.use(
    (response) => {
      logger.debug(`[API] Response: ${response.status} ${response.config.url}`, {
        data: response.data,
      });
      return response;
    },
    async (error: AxiosError) => {
      logger.error('[API] Response error', error, {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
      
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      // Skip token refresh for auth endpoints (login, signup, etc.) as they have their own error handling
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');
      if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        try {
          const refreshToken = await tokenManager.getRefreshToken();
          if (refreshToken) {
            // Attempt to refresh the token
            const response = await axios.post<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>>(
              buildApiUrl('auth/refresh-token'),
              { refreshToken }
            );

            if (response.data.success && response.data.data?.tokens) {
              const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
              await tokenManager.setTokens(accessToken, newRefreshToken);

              // Retry the original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return client(originalRequest);
            }
          }
        } catch (refreshError) {
          // Token refresh failed - clear tokens and redirect to login
          await tokenManager.clearTokens();
          // Note: Navigation to login screen should be handled by the app
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Retry configuration for failed requests
 */
interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

/**
 * Default retry condition: retry on network errors and 5xx server errors
 */
const defaultRetryCondition = (error: AxiosError): boolean => {
  return (
    !error.response || // Network error
    (error.response.status >= 500 && error.response.status <= 599) // Server error
  );
};

/**
 * Execute request with retry logic and exponential backoff
 */
async function executeWithRetry<T>(
  requestFn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    retries = API_CONFIG.MAX_RETRIES,
    retryDelay = API_CONFIG.RETRY_DELAY,
    retryCondition = defaultRetryCondition,
  } = config;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt or condition not met
      if (
        attempt === retries ||
        !axios.isAxiosError(error) ||
        !retryCondition(error)
      ) {
        throw error;
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * API Client instance
 */
export const apiClient = createApiClient();

/**
 * Extract params from config for cache key generation
 */
const extractParams = (config?: AxiosRequestConfig): Record<string, any> | undefined => {
  if (!config?.params) return undefined;
  return config.params as Record<string, any>;
};

/**
 * HTTP Methods with retry logic and caching
 */
export const api = {
  /**
   * GET request with caching support
   * Implements stale-while-revalidate pattern:
   * - Returns cached data immediately if available (even if stale)
   * - Fetches fresh data in background
   * - On 429 errors, returns cached data if available
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & { skipCache?: boolean }
  ): Promise<ApiResponse<T>> {
    const params = extractParams(config);
    const skipCache = config?.skipCache || false;

    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cached = await apiCacheService.get<T>(url, params);
      
      if (cached.data !== null) {
        // Return cached data immediately
        const cachedResponse: ApiResponse<T> = {
          success: true,
          data: cached.data,
        };

        // If data is stale and we should revalidate, fetch fresh data in background
        if (cached.isStale && apiCacheService.shouldUseStaleWhileRevalidate(url)) {
          // Fire and forget - fetch fresh data in background
          executeWithRetry(async () => {
            try {
              const response = await apiClient.get<ApiResponse<T>>(url, config);
              if (response.data.success && response.data.data) {
                await apiCacheService.set(url, response.data.data, params);
              }
            } catch (error) {
              // Silently fail background refresh - we already have cached data
              logger.debug('[API] Background cache refresh failed', { url, error });
            }
          }).catch(() => {
            // Ignore errors in background refresh
          });
        }

        logger.debug(`[API] Cache hit: ${url}`, { isStale: cached.isStale, age: cached.age });
        return cachedResponse;
      }
    }

    // No cache or cache miss - fetch from API
    try {
      return await executeWithRetry(async () => {
        const response = await apiClient.get<ApiResponse<T>>(url, config);
        
        // Cache successful responses
        if (response.data.success && response.data.data && !skipCache) {
          await apiCacheService.set(url, response.data.data, params);
        }
        
        return response.data;
      });
    } catch (error) {
      // Handle 429 rate limit errors by returning cached data if available
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        logger.warn(`[API] Rate limited (429) for ${url}, attempting to use cached data`);
        
        const cached = await apiCacheService.get<T>(url, params);
        if (cached.data !== null) {
          logger.info(`[API] Returning cached data for rate-limited request: ${url}`);
          return {
            success: true,
            data: cached.data,
          };
        }
      }
      
      // Re-throw if no cached data available
      throw error;
    }
  },

  /**
   * POST request with cache invalidation
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.post<ApiResponse<T>>(url, data, config);
        
        // Invalidate related caches after successful mutation
        if (response.data.success) {
          await invalidateRelatedCaches(url);
        }
        
        return response.data;
      },
      { retryCondition: (error) => error.response?.status === 503 } // Only retry on service unavailable
    );
  },

  /**
   * PUT request with cache invalidation
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.put<ApiResponse<T>>(url, data, config);
        
        // Invalidate related caches after successful mutation
        if (response.data.success) {
          await invalidateRelatedCaches(url);
        }
        
        return response.data;
      },
      { retries: 1 } // Fewer retries for update operations
    );
  },

  /**
   * PATCH request with cache invalidation
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
        
        // Invalidate related caches after successful mutation
        if (response.data.success) {
          await invalidateRelatedCaches(url);
        }
        
        return response.data;
      },
      { retries: 1 }
    );
  },

  /**
   * DELETE request with cache invalidation
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.delete<ApiResponse<T>>(url, config);
        
        // Invalidate related caches after successful mutation
        if (response.data.success) {
          await invalidateRelatedCaches(url);
        }
        
        return response.data;
      },
      { retries: 1 }
    );
  },
};

/**
 * Invalidate related caches after mutations
 * This ensures data consistency across the app
 */
async function invalidateRelatedCaches(url: string): Promise<void> {
  try {
    // Invalidate based on endpoint patterns
    if (url.includes('/categories')) {
      await apiCacheService.invalidate('/categories');
    } else if (url.includes('/expenses')) {
      // Expenses affect categories (totalSpent), analytics, and expenses cache
      await apiCacheService.invalidate('/expenses');
      await apiCacheService.invalidate('/categories'); // Categories include totalSpent calculated from expenses
      await apiCacheService.invalidate('/analytics'); // Analytics depend on expenses
    } else if (url.includes('/income')) {
      await apiCacheService.invalidate('/income');
      await apiCacheService.invalidate('/analytics'); // Analytics depend on income
    } else if (url.includes('/analytics')) {
      await apiCacheService.invalidate('/analytics');
    } else if (url.includes('/tags')) {
      await apiCacheService.invalidate('/tags');
    }
    
    logger.debug(`[API] Invalidated caches for: ${url}`);
  } catch (error) {
    logger.error('[API] Error invalidating caches', error);
  }
}

/**
 * Export token manager for use in auth service
 */
export { tokenManager };

export default api;

