/**
 * App Entry Point
 * Purpose: Root component with ErrorBoundary and ThemeProvider
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store';
import AppNavigator from './navigation/AppNavigator';
import { ErrorBoundary } from './components';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppNavigator />
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;

