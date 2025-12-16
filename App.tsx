/**
 * Finly - Premium Personal Finance Tracker
 * Purpose: Main application entry point
 * Features: Expense tracking, AI insights, budget management, authentication
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { PreferencesProvider } from './src/contexts/PreferencesContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { BottomSheetProvider } from './src/contexts/BottomSheetContext';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components';
import { BiometricLockScreen } from './src/screens/BiometricLockScreen';
import { isBiometricLoginEnabled } from './src/services/biometricService';

// Expose AsyncStorage globally for debugging (development only)
if (__DEV__) {
  import('@react-native-async-storage/async-storage').then((AsyncStorage) => {
    // @ts-ignore - Global for debugging
    global.AsyncStorage = AsyncStorage.default;
    
    // Helper function to get all AsyncStorage keys and values
    // @ts-ignore
    global.getAllStorage = async () => {
      const keys = await AsyncStorage.default.getAllKeys();
      const values = await AsyncStorage.default.multiGet(keys);
      const storage: Record<string, any> = {};
      values.forEach(([key, value]) => {
        try {
          storage[key] = JSON.parse(value || 'null');
        } catch {
          storage[key] = value;
        }
      });
      console.table(storage);
      return storage;
    };
    
    // Helper function to get a specific key
    // @ts-ignore
    global.getStorage = async (key: string) => {
      const value = await AsyncStorage.default.getItem(key);
      try {
        return JSON.parse(value || 'null');
      } catch {
        return value;
      }
    };
    
    // Helper function to set a key
    // @ts-ignore
    global.setStorage = async (key: string, value: any) => {
      await AsyncStorage.default.setItem(key, JSON.stringify(value));
      console.log(`Set ${key}:`, value);
    };
    
    // Helper function to remove a key
    // @ts-ignore
    global.removeStorage = async (key: string) => {
      await AsyncStorage.default.removeItem(key);
      console.log(`Removed ${key}`);
    };
    
    // Helper function to clear all storage
    // @ts-ignore
    global.clearStorage = async () => {
      await AsyncStorage.default.clear();
      console.log('Cleared all AsyncStorage');
    };
    
    console.log('🔧 Debug helpers loaded! Use: getAllStorage(), getStorage(key), setStorage(key, value), removeStorage(key), clearStorage()');
  });
}

const AppContent = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkLock();
  }, []);

  const checkLock = async () => {
    try {
      const enabled = await isBiometricLoginEnabled();
      if (enabled) {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error checking biometric lock:', error);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) return null;

  return (
    <>
      <AppNavigator />
      {isLocked && <BiometricLockScreen onUnlock={() => setIsLocked(false)} />}
    </>
  );
};


export default function App(): React.ReactElement {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <PreferencesProvider>
          <ErrorBoundary>
            <CurrencyProvider>
              <BottomSheetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AppContent />
                  <StatusBar style="auto" />
                </GestureHandlerRootView>
              </BottomSheetProvider>
            </CurrencyProvider>
          </ErrorBoundary>
        </PreferencesProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
