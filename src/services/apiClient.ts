/**
 * API Client
 * Purpose: Axios-based HTTP client with authentication, retry logic, and error handling
 * Features: Token management, automatic token refresh, request retry with exponential backoff
 * Follows best practices for microservices communication
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, buildApiUrl, STORAGE_KEYS } from '../config/api.config';

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
      
      // Log request details
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log('[API] Request:', config.method?.toUpperCase(), fullUrl);
      console.log('[API] Request data:', config.data);
      
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor: Handle token refresh and errors
   */
  client.interceptors.response.use(
    (response) => {
      console.log('[API] Response:', response.status, response.config.url);
      return response;
    },
    async (error: AxiosError) => {
      console.error('[API] Response error:', error.response?.status, error.config?.url);
      console.error('[API] Error data:', error.response?.data);
      
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
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
 * HTTP Methods with retry logic
 */
export const api = {
  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return executeWithRetry(async () => {
      const response = await apiClient.get<ApiResponse<T>>(url, config);
      return response.data;
    });
  },

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.post<ApiResponse<T>>(url, data, config);
        return response.data;
      },
      { retryCondition: (error) => error.response?.status === 503 } // Only retry on service unavailable
    );
  },

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.put<ApiResponse<T>>(url, data, config);
        return response.data;
      },
      { retries: 1 } // Fewer retries for update operations
    );
  },

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
        return response.data;
      },
      { retries: 1 }
    );
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return executeWithRetry(
      async () => {
        const response = await apiClient.delete<ApiResponse<T>>(url, config);
        return response.data;
      },
      { retries: 1 }
    );
  },
};

/**
 * Export token manager for use in auth service
 */
export { tokenManager };

export default api;

