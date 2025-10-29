/**
 * Finly - Premium Personal Finance Tracker
 * Purpose: Main application entry point
 * Features: Expense tracking, AI insights, budget management, authentication
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * App component - Root of the application
 * Wraps the app with necessary providers (Redux, Theme) and navigation
 */
export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
