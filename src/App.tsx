/**
 * App Entry Point
 * Purpose: Root component with ErrorBoundary and ThemeProvider
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { PricingProvider } from './contexts/PricingContext';
import { BottomSheetProvider } from './contexts/BottomSheetContext';
import AppNavigator from './navigation/AppNavigator';
import { ErrorBoundary } from './components';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
              <CurrencyProvider>
                <PricingProvider>
                  <BottomSheetProvider>
            <AppNavigator />
            <StatusBar style="auto" />
                  </BottomSheetProvider>
                </PricingProvider>
              </CurrencyProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

