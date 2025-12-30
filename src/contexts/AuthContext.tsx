/**
 * Authentication Context for Finly app
 * Purpose: Manages user authentication state and provides login/logout functionality
 * Integrates with finly-core backend API for real authentication
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import authService, { User } from '../services/authService';
import notificationService from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingVerificationEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ requiresVerification: boolean }>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 * Wraps the app to provide authentication context
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Check for existing auth token on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Checks if user is already authenticated
   * Loads cached user data and validates with backend
   */
  const checkAuthStatus = async (): Promise<void> => {
    try {
      const isAuth = await authService.isAuthenticated();

      if (isAuth) {
        // Load cached user data first for immediate UI update
        const cachedUser = await authService.getCachedUser();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Then fetch fresh user data from backend
        try {
          const freshUser = await authService.getCurrentUser();
          setUser(freshUser);
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
          // Keep cached user if API call fails
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with email and password
   * Calls finly-core backend API
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const response = await authService.login({ email, password });
      setUser(response.user);
      setPendingVerificationEmail(null);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  /**
   * Sign up a new user
   * Returns indication if email verification is required
   */
  const signup = useCallback(async (
    name: string,
    email: string,
    password: string
  ): Promise<{ requiresVerification: boolean }> => {
    try {
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }

      const response = await authService.signup({ name, email, password });

      // User created but not verified yet - store email for verification flow
      setPendingVerificationEmail(email);

      return { requiresVerification: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  /**
   * Verify email with OTP
   * Completes the signup process
   */
  const verifyEmail = useCallback(async (email: string, otp: string): Promise<void> => {
    try {
      const response = await authService.verifyEmail(email, otp);
      setUser(response.user);
      setPendingVerificationEmail(null);
    } catch (error: any) {
      console.error('Verify email error:', error);
      throw error;
    }
  }, []);

  /**
   * Resend OTP for email verification
   */
  const resendOTP = useCallback(async (email: string): Promise<void> => {
    try {
      await authService.resendOTP(email);
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  }, []);

  /**
   * Logout function
   * Clears all user data and tokens
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Clear push notification token first
      try {
        const token = await notificationService.getPushToken();
        if (token) {
          await notificationService.removeToken(token);
        }
      } catch (tokenError) {
        // Log but don't block logout if token removal fails
        console.error('Error removing push token during logout:', tokenError);
      }

      await authService.logout();
      setUser(null);
      setPendingVerificationEmail(null);
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear local state even if API call fails
      setUser(null);
      setPendingVerificationEmail(null);
    }
  }, []);

  /**
   * Request password reset OTP
   */
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await authService.forgotPassword(email);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }, []);

  /**
   * Reset password with OTP
   */
  const resetPassword = useCallback(async (
    email: string,
    otp: string,
    newPassword: string
  ): Promise<void> => {
    try {
      await authService.resetPassword({ email, otp, newPassword });
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }, []);

  /**
   * Refresh user data from backend
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      pendingVerificationEmail,
      login,
      signup,
      verifyEmail,
      resendOTP,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
    }),
    [
      user,
      isLoading,
      pendingVerificationEmail,
      login,
      signup,
      verifyEmail,
      resendOTP,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

