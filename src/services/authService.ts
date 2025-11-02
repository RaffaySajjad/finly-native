/**
 * Authentication Service
 * Purpose: Handles all authentication-related API calls
 * Features: Signup, login, logout, email verification, password reset
 * Integrates with finly-core backend API
 */

import { api, tokenManager, ApiResponse } from './apiClient';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Verify email request payload
 */
interface VerifyEmailPayload {
  email: string;
  otp: string;
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
      console.log('[AuthService] Signup request:', { ...payload, password: '[HIDDEN]' });
      const response = await api.post<{ user: User }>(API_ENDPOINTS.AUTH.SIGNUP, payload);

      console.log('[AuthService] Signup response:', response);

      if (!response.success) {
        throw new Error(response.error?.message || 'Signup failed');
      }

      return {
        user: response.data!.user,
        message: response.message || 'Account created successfully. Please check your email for verification code.',
      };
    } catch (error: any) {
      console.error('[AuthService] Signup error:', error);
      console.error('[AuthService] Error response data:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Verify email with OTP
   * Returns tokens and fully authenticated user
   */
  async verifyEmail(payload: VerifyEmailPayload): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, payload);

      if (!response.success) {
        throw new Error(response.error?.message || 'Email verification failed');
      }

      const { user, tokens } = response.data!;

      // Store tokens and user data
      await Promise.all([
        tokenManager.setTokens(tokens.accessToken, tokens.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);

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
    try {
      const response = await api.post<{ message: string }>(API_ENDPOINTS.AUTH.RESEND_OTP, { email });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to resend OTP');
      }

      return {
        message: response.message || 'OTP sent successfully',
      };
    } catch (error: any) {
      console.error('[AuthService] Resend OTP error:', error);
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
        throw new Error(response.error?.message || 'Login failed');
      }

      const { user, tokens } = response.data!;

      // Store tokens and user data
      await Promise.all([
        tokenManager.setTokens(tokens.accessToken, tokens.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);

      return response.data!;
    } catch (error: any) {
      console.error('[AuthService] Login error:', error);
      throw this.handleError(error);
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
      // Always clear local tokens and user data
      await tokenManager.clearTokens();
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
   */
  private handleError(error: any): Error {
    // Handle API error response
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      console.error('[AuthService] API Error:', apiError);
      return new Error(apiError.message || 'An error occurred');
    }

    // Handle validation errors
    if (error.response?.data?.message) {
      console.error('[AuthService] Validation Error:', error.response.data.message);
      return new Error(error.response.data.message);
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Error('Cannot connect to server. Please check your connection.');
    }

    // Generic error
    if (error.message) {
      return error;
    }

    return new Error('An unexpected error occurred');
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

