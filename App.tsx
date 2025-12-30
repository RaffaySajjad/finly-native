/**
 * Finly - Premium Personal Finance Tracker
 * Purpose: Main application entry point
 * Features: Expense tracking, AI insights, budget management, authentication
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { PreferencesProvider } from './src/contexts/PreferencesContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { PricingProvider } from './src/contexts/PricingContext';
import { BottomSheetProvider } from './src/contexts/BottomSheetContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppFlowProvider, useAppFlow } from './src/contexts/AppFlowContext';
import { PerformanceProvider } from './src/contexts/PerformanceContext';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { checkAuthStatus } from './src/store/slices/authSlice';
import { checkSubscriptionStatus } from './src/store/slices/subscriptionSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary, AnimatedSplashScreen } from './src/components';
import { BiometricLockScreen } from './src/screens/BiometricLockScreen';
import { isBiometricLoginEnabled, isBiometricAvailable } from './src/services/biometricService';
import { onAuthFailure } from './src/services/apiClient';
import { clearAuth } from './src/store/slices/authSlice';

// Prevent the native splash screen from auto-hiding
// This allows our animated splash to control the transition
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors - splash may already be hidden
});

// React Navigation / screens perf: native screen primitives + freezing offscreen screens.
// This reduces memory + unnecessary renders on complex tab/stack setups.
import { enableFreeze, enableScreens } from 'react-native-screens';
enableScreens(true);
enableFreeze(true);

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
    };
    
    // Helper function to remove a key
    // @ts-ignore
    global.removeStorage = async (key: string) => {
      await AsyncStorage.default.removeItem(key);
    };
    
    // Helper function to clear all storage
    // @ts-ignore
    global.clearStorage = async () => {
      await AsyncStorage.default.clear();
    };
  });
}

// Grace period in milliseconds before requiring re-authentication
// If user returns within this time, no biometric prompt is shown
const BIOMETRIC_GRACE_PERIOD_MS = 15 * 1000; // 15 seconds

/**
 * AppContent component
 * Purpose: Manages biometric lock state, splash screen, and app lifecycle
 * 
 * Behavior:
 * - On cold start: Shows animated splash while loading auth, flow state, and subscription
 * - On app background → foreground: Locks if biometric is enabled AND grace period exceeded
 * - Shows BiometricLockScreen overlay when locked
 */
const AppContent = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isRestoringAuth } = useAppSelector((state) => state.auth);
  const { refreshFlowState, onboardingComplete, incomeSetupComplete, isFlowStateLoading } = useAppFlow();

  const [isLocked, setIsLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>(undefined);

  // Track app state to detect background → foreground transitions
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track when the app went to background for grace period calculation
  const backgroundTimestampRef = useRef<number | null>(null);

  // Track if initial data loading has been triggered
  const hasInitialized = useRef(false);

  // Register auth failure listener to handle unrequested logouts (e.g., token revocation)
  useEffect(() => {
    onAuthFailure(() => {
      console.warn('[App] Authentication failed unrecoverably, signing out user...');
      dispatch(clearAuth());
    });
  }, [dispatch]);

  /**
   * Check if biometric login is enabled and available
   * Returns true if both conditions are met
   */
  const checkBiometricState = useCallback(async (): Promise<boolean> => {
    try {
      const [enabled, available] = await Promise.all([
        isBiometricLoginEnabled(),
        isBiometricAvailable(),
      ]);
      return enabled && available;
    } catch (error) {
      console.error('[App] Error checking biometric state:', error);
      return false;
    }
  }, []);

  /**
   * Initialize app during splash screen
   * Loads auth status, flow state, biometric settings, and subscription status
   * All loading happens behind the splash screen for a smooth experience
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      console.log('[App] Starting initialization behind splash screen...');

      try {
        setLoadingStatus('Checking account...');

        // Step 1: Check auth status and flow state in parallel
        // These are independent and can run simultaneously
        const [authResult, _, biometricEnabled] = await Promise.all([
          dispatch(checkAuthStatus()).unwrap(),
          refreshFlowState(),
          checkBiometricState(),
        ]);

        console.log('[App] Auth check complete:', { isAuthenticated: !!authResult?.user });

        // Step 2: If user is authenticated, load subscription status
        // This needs auth to be complete first
        if (authResult?.user) {
          setLoadingStatus('Loading your data...');
          console.log('[App] User authenticated, loading subscription status...');
          await dispatch(checkSubscriptionStatus());
        }

        // Step 3: Set biometric lock if enabled
        if (biometricEnabled) {
          console.log('[App] Biometric enabled, locking app');
          setIsLocked(true);
        }

        setLoadingStatus('Almost ready...');
        console.log('[App] Initialization complete');
      } catch (error) {
        console.error('[App] Error during initialization:', error);
      }
      // Note: isReady is now set in a separate effect that waits for flow state
    };

    initialize();
  }, [dispatch, refreshFlowState, checkBiometricState]);

  /**
   * Set isReady only when all necessary state is loaded
   * This prevents the white screen flash between splash and actual content
   */
  useEffect(() => {
    // Wait for auth restoration to complete
    if (isRestoringAuth) {
      console.log('[App] Still restoring auth...');
      return;
    }

    // Wait for flow state to be loaded
    if (isFlowStateLoading) {
      console.log('[App] Still loading flow state...');
      return;
    }

    // For authenticated users, wait for flow state values to be resolved
    if (isAuthenticated && (onboardingComplete === null || incomeSetupComplete === null)) {
      console.log('[App] Authenticated but flow state not resolved yet...');
      return;
    }

    // All conditions met, app is ready
    if (!isReady) {
      console.log('[App] All state loaded, marking app as ready', {
        isAuthenticated,
        onboardingComplete,
        incomeSetupComplete,
      });
      setIsReady(true);
    }
  }, [isRestoringAuth, isFlowStateLoading, isAuthenticated, onboardingComplete, incomeSetupComplete, isReady]);

  /**
   * Listen for app state changes
   * Lock the app when returning from background if:
   * - Biometric is enabled
   * - Grace period has elapsed (user was away for more than BIOMETRIC_GRACE_PERIOD_MS)
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App going to background - record timestamp
      const isGoingToBackground = nextAppState.match(/inactive|background/);
      if (isGoingToBackground && previousState === 'active') {
        backgroundTimestampRef.current = Date.now();
        console.log('[App] App went to background');
        return;
      }

      // App coming back to foreground from background/inactive
      const wasInBackground = previousState.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasInBackground && isNowActive) {
        // Check if grace period has elapsed
        const backgroundTime = backgroundTimestampRef.current;
        const timeInBackground = backgroundTime ? Date.now() - backgroundTime : Infinity;

        if (timeInBackground < BIOMETRIC_GRACE_PERIOD_MS) {
          console.log(`[App] Grace period active (${Math.round(timeInBackground / 1000)}s < ${BIOMETRIC_GRACE_PERIOD_MS / 1000}s), skipping lock`);
          return;
        }

        // Re-check biometric state in case settings changed while app was in background
        const shouldLock = await checkBiometricState();

        if (shouldLock) {
          console.log(`[App] App returned to foreground after ${Math.round(timeInBackground / 1000)}s, locking...`);
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkBiometricState]);

  /**
   * Handle successful biometric unlock
   */
  const handleUnlock = useCallback(() => {
    console.log('[App] Biometric unlock successful');
    setIsLocked(false);
  }, []);

  /**
   * Handle splash screen animation complete
   * Called when the animated splash has finished and should be dismissed
   */
  const handleSplashComplete = useCallback(() => {
    console.log('[App] Splash animation complete');
    setShowSplash(false);
  }, []);

  return (
    <>
      {/* Always render navigator to allow preloading */}
      {isReady && <AppNavigator />}

      {/* Biometric lock overlay */}
      {isLocked && <BiometricLockScreen onUnlock={handleUnlock} />}

      {/* Animated splash screen - renders on top until app is ready */}
      {showSplash && (
        <AnimatedSplashScreen
          isAppReady={isReady}
          onAnimationComplete={handleSplashComplete}
          loadingStatus={loadingStatus}
        />
      )}
    </>
  );
};


export default function App(): React.ReactElement {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <PerformanceProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <BottomSheetModalProvider>
                <PreferencesProvider>
                  <ErrorBoundary>
                    <CurrencyProvider>
                      <PricingProvider>
                        <BottomSheetProvider>
                          <AuthProvider>
                            <AppFlowProvider>
                              <AppContent />
                              <StatusBar style="auto" />
                            </AppFlowProvider>
                          </AuthProvider>
                        </BottomSheetProvider>
                      </PricingProvider>
                    </CurrencyProvider>
                  </ErrorBoundary>
                </PreferencesProvider>
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
          </PerformanceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}
