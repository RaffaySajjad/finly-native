/**
 * Finly - Premium Personal Finance Tracker
 * Purpose: Main application entry point
 * Features: Expense tracking, AI insights, budget management, authentication
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components';

/**
 * App component - Root of the application
 * Wraps the app with necessary providers (Redux, Theme, Currency) and navigation
 */
export default function App(): React.ReactElement {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <ErrorBoundary>
          <CurrencyProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AppNavigator />
              <StatusBar style="auto" />
            </GestureHandlerRootView>
          </CurrencyProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ReduxProvider>
  );
}
