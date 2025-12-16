/**
 * Theme Context for Finly app
 * Purpose: Manages light/dark theme state and provides theme switching functionality
 * Persists user preference using AsyncStorage
 */

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode, useCallback } from 'react';
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
  const toggleTheme = useCallback((): void => {
    // Persist using best-effort async write; keep UI responsive.
    setMode((prevMode) => {
      const nextMode: ThemeMode = prevMode === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((error) => {
        console.error('Error saving theme preference:', error);
      });
      return nextMode;
    });
  }, []);

  const theme = useMemo(() => (mode === 'light' ? lightColors : darkColors), [mode]);
  const isDark = mode === 'dark';

  const value = useMemo<ThemeContextType>(
    () => ({ theme, mode, toggleTheme, isDark }),
    [theme, mode, toggleTheme, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
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

