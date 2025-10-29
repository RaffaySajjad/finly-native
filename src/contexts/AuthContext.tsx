/**
 * Authentication Context for Finly app
 * Purpose: Manages user authentication state and provides login/logout functionality
 * Persists auth token using AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = '@finly_user_token';
const USER_DATA_KEY = '@finly_user_data';

/**
 * AuthProvider component
 * Wraps the app to provide authentication context
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth token on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Checks if user is already authenticated
   */
  const checkAuthStatus = async (): Promise<void> => {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mock login function
   * In production, this would call a real API
   */
  const login = async (email: string, password: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation (accept any email/password for demo)
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Generate mock token and user data
    const mockToken = `mock_token_${Date.now()}`;
    const mockUser: User = {
      id: Date.now().toString(),
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      email,
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));

    setUser(mockUser);
  };

  /**
   * Mock signup function
   * In production, this would call a real API
   */
  const signup = async (name: string, email: string, password: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    // Generate mock token and user data
    const mockToken = `mock_token_${Date.now()}`;
    const mockUser: User = {
      id: Date.now().toString(),
      name,
      email,
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));

    setUser(mockUser);
  };

  /**
   * Logout function
   * Clears all user data and returns to login screen
   */
  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (name: string, email: string): Promise<void> => {
    if (!user) return;

    const updatedUser = { ...user, name, email };
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
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

