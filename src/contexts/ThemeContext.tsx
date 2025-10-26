/**
 * Theme Context for Finly app
 * Purpose: Manages light/dark theme state and provides theme switching functionality
 * Persists user preference using AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';
import { lightColors, darkColors, ColorScheme } from '../theme/colors';

interface ThemeContextType {
  theme: ColorScheme;
  mode: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@finly_theme_mode';

/**
 * ThemeProvider component
 * Wraps the app to provide theme context to all child components
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  /**
   * Loads user's theme preference from storage
   */
  const loadThemePreference = async (): Promise<void> => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode === 'dark' || savedMode === 'light') {
        setMode(savedMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  /**
   * Toggles between light and dark theme
   * Persists the choice to AsyncStorage
   */
  const toggleTheme = async (): Promise<void> => {
    const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = mode === 'light' ? lightColors : darkColors;
  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

