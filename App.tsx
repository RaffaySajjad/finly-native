/**
 * Finly - Premium Personal Finance Tracker
 * Purpose: Main application entry point
 * Features: Expense tracking, AI insights, budget management
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * App component - Root of the application
 * Wraps the app with necessary providers and navigation
 */
export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
