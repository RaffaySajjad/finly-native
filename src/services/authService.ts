/**
 * Authentication Service
 * Purpose: Handles all authentication-related API calls
 * Features: Signup, login, logout, email verification, password reset
 * Integrates with finly-core backend API
 */

import { api, tokenManager, ApiResponse } from './apiClient';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { apiCacheService } from './apiCacheService';

/**
 * User interface
 */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Authentication response with tokens
 */
interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Signup request payload
 */
interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

/**
 * Login request payload
 */
interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Reset password request payload
 */
interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Sign up a new user
   * Returns user data but requires email verification before full access
   */
  async signup(payload: SignupPayload): Promise<{ user: User; message: string }> {
    try {
      logger.debug('[AuthService] Signup request:', { ...payload, password: '[HIDDEN]' });
      const response = await api.post<{ user: User }>(API_ENDPOINTS.AUTH.SIGNUP, payload);

      logger.debug('[AuthService] Signup response:', response);

      if (!response.success) {
        throw new Error(response.error?.message || 'Signup failed');
      }

      return {
        user: response.data!.user,
        message: response.message || 'Account created successfully. Please check your email for a verification link.',
      };
    } catch (error: any) {
      console.error('[AuthService] Signup error:', error);
      console.error('[AuthService] Error response data:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>(
        API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
        { email }
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to resend verification email');
      }
      return { message: response.message || 'Verification email sent successfully' };
    } catch (error: any) {
      console.error('[AuthService] Resend verification email error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Login with email and password
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, payload);

      if (!response.success) {
        logger.debug('[AuthService] Login failed response:', response);
        const error = response.error;
        if (error) {
          logger.debug('[AuthService] Error details:', error);
          // Create error with code preserved for frontend handling
          const err: any = new Error(error.message || 'Login failed');
          err.code = error.code; // Preserve error code
          throw err;
        }
        throw new Error('Login failed');
      }

      const { user, tokens } = response.data!;

      // Store tokens and user data
      await Promise.all([
        tokenManager.setTokens(tokens.accessToken, tokens.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);

      // Clear onboarding flags to always show onboarding after login
      await Promise.all([
        AsyncStorage.removeItem('@finly_onboarding_completed'),
        AsyncStorage.removeItem('@finly_income_setup_completed'),
      ]);

      return response.data!;
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      console.error('[AuthService] Login error code:', error?.code);
      console.error('[AuthService] Login error response:', error?.response?.data);
      
      // If error already has a code from API response (EMAIL_NOT_VERIFIED, etc.), preserve it
      if (error.code && error.code !== 'ERR_NETWORK' && error.code !== 'ERR_BAD_REQUEST' && error.code !== 'ECONNREFUSED' && error.code !== 'ENOTFOUND') {
        // Error already processed from API response, just rethrow with code preserved
        logger.debug('[AuthService] Preserving error code:', error.code);
        throw error;
      }
      
      // Handle Axios errors (network errors, etc.) or extract error from response
      const handledError = this.handleError(error);
      // Preserve code if it was set during error creation above
      if (error.code && !handledError.code) {
        handledError.code = error.code;
      }
      logger.debug('[AuthService] Final error code:', handledError.code);
      throw handledError;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('[AuthService] Logout API error:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear tokens
      await tokenManager.clearTokens();
      
      // Clear API cache
      await apiCacheService.clear();
      
      // Clear ALL user-specific data from AsyncStorage
      // Only preserve device-specific settings (theme)
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(key => {
          // Keep theme (device preference, not user-specific)
          if (key === '@finly_theme_mode') return false;
          // Remove all other @finly_ keys (user data)
          return key.startsWith('@finly_');
        });
        
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
          logger.info(`[AuthService] Cleared ${keysToRemove.length} user data keys on logout`);
        }
      } catch (clearError) {
        logger.error('[AuthService] Error clearing user data on logout:', clearError);
      }
    }
  }

  /**
   * Delete user account permanently
   * This will delete all user data including expenses, categories, income, etc.
   * @param feedback - Optional feedback about why the user is deleting their account
   */
  async deleteAccount(feedback?: { reasonForDeletion?: string; feedback?: string }): Promise<void> {
    try {
      logger.debug('[AuthService] Deleting account...', feedback ? 'with feedback' : 'without feedback');
      const response = await api.delete(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
        data: feedback || {},
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete account');
      }

      logger.debug('[AuthService] Account deleted successfully');

      // Clear ALL local data after successful deletion
      await tokenManager.clearTokens();
      await apiCacheService.clear();
      
      // Clear all user-specific data (same as logout)
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => {
        if (key === '@finly_theme_mode') return false;
        return key.startsWith('@finly_');
      });
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        logger.info(`[AuthService] Cleared ${keysToRemove.length} user data keys on account deletion`);
      }
    } catch (error: any) {
      console.error('[AuthService] Delete account error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset OTP
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to request password reset');
      }

      return {
        message: response.message || 'Password reset OTP sent to your email',
      };
    } catch (error: any) {
      console.error('[AuthService] Forgot password error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);

      if (!response.success) {
        throw new Error(response.error?.message || 'Password reset failed');
      }

      return {
        message: response.message || 'Password reset successfully',
      };
    } catch (error: any) {
      console.error('[AuthService] Reset password error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        email,
        otp,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Email verification failed');
      }

      const { user, tokens } = response.data!;

      // Store tokens and user data if tokens are returned
      if (tokens) {
        await Promise.all([
          tokenManager.setTokens(tokens.accessToken, tokens.refreshToken),
          AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
        ]);
      }

      return response.data!;
    } catch (error: any) {
      console.error('[AuthService] Verify email error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Resend OTP for email verification
   */
  async resendOTP(email: string): Promise<{ message: string }> {
     return this.resendVerificationEmail(email);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get user info');
      }

      const user = response.data!.user;

      // Update cached user data
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      return user;
    } catch (error: any) {
      console.error('[AuthService] Get current user error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const refreshToken = await tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<{ tokens: { accessToken: string; refreshToken: string } }>(
        API_ENDPOINTS.AUTH.REFRESH_TOKEN,
        { refreshToken }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken } = response.data!.tokens;

      // Store new tokens
      await tokenManager.setTokens(accessToken, newRefreshToken);

      return response.data!.tokens;
    } catch (error: any) {
      console.error('[AuthService] Refresh token error:', error);
      // Clear tokens on refresh failure
      await tokenManager.clearTokens();
      throw this.handleError(error);
    }
  }

  /**
   * Check if user is authenticated (has valid access token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await tokenManager.getAccessToken();
    return !!token;
  }

  /**
   * Get cached user data from AsyncStorage
   */
  async getCachedUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('[AuthService] Get cached user error:', error);
      return null;
    }
  }

  /**
   * Handle and format API errors
   * Preserves error code for frontend handling
   */
  private handleError(error: any): Error & { code?: string } {
    // Handle API error response (from Axios error.response.data)
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      logger.error('[AuthService] API Error', apiError);
      const err: any = new Error(apiError.message || 'An error occurred');
      err.code = apiError.code; // Preserve error code
      logger.debug('[AuthService] Extracted error code from response', { code: err.code });
      return err;
    }

    // Handle case where error.response.data is the ApiResponse structure directly
    if (error.response?.data?.success === false && error.response?.data?.error) {
      const apiError = error.response.data.error;
      logger.error('[AuthService] API Error (from ApiResponse)', apiError);
      const err: any = new Error(apiError.message || 'An error occurred');
      err.code = apiError.code; // Preserve error code
      logger.debug('[AuthService] Extracted error code from ApiResponse', { code: err.code });
      return err;
    }

    // Handle validation errors
    if (error.response?.data?.message) {
      logger.error('[AuthService] Validation Error', new Error(error.response.data.message));
      return new Error(error.response.data.message);
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Error('Cannot connect to server. Please check your connection.');
    }

    // Generic error - preserve code if it exists
    if (error.message) {
      const err: any = error instanceof Error ? error : new Error(error.message);
      if (error.code) {
        err.code = error.code;
      }
      return err;
    }

    return new Error('An unexpected error occurred');
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

