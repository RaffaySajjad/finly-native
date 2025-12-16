/**
 * AppFlowContext
 *
 * Purpose:
 * - Provide an in-memory source of truth for onboarding + income setup completion
 * - Sync to AsyncStorage, but avoid high-frequency polling (which hurts perf + battery)
 *
 * Notes:
 * - We refresh on mount, when the app becomes active, and when explicitly requested.
 * - Screens should call the `mark*Complete` helpers so the navigator updates immediately.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INCOME_SETUP_COMPLETED_KEY, ONBOARDING_STORAGE_KEY } from '../constants/storageKeys';

interface AppFlowContextValue {
  onboardingComplete: boolean | null;
  incomeSetupComplete: boolean | null;
  refreshFlowState: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  markIncomeSetupComplete: () => Promise<void>;
  resetFlowStateForTesting: () => Promise<void>;
}

const AppFlowContext = createContext<AppFlowContextValue | undefined>(undefined);

async function readBooleanFlag(key: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch {
    return false;
  }
}

export const AppFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [incomeSetupComplete, setIncomeSetupComplete] = useState<boolean | null>(null);

  const refreshFlowState = useCallback(async () => {
    const [onboarding, income] = await Promise.all([
      readBooleanFlag(ONBOARDING_STORAGE_KEY),
      readBooleanFlag(INCOME_SETUP_COMPLETED_KEY),
    ]);
    setOnboardingComplete(onboarding);
    setIncomeSetupComplete(income);
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    // Update in-memory first for immediate UI response, then persist.
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // If persistence fails, best-effort: keep in-memory state so user can proceed.
    }
  }, []);

  const markIncomeSetupComplete = useCallback(async () => {
    setIncomeSetupComplete(true);
    try {
      await AsyncStorage.setItem(INCOME_SETUP_COMPLETED_KEY, 'true');
    } catch {
      // Best-effort, same reasoning as above.
    }
  }, []);

  const resetFlowStateForTesting = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY),
      AsyncStorage.removeItem(INCOME_SETUP_COMPLETED_KEY),
    ]);
    setOnboardingComplete(false);
    setIncomeSetupComplete(false);
  }, []);

  // Initial load (one-time).
  useEffect(() => {
    refreshFlowState();
  }, [refreshFlowState]);

  // Refresh when coming back to foreground (covers external storage changes / account deletion flows).
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshFlowState();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshFlowState]);

  const value = useMemo<AppFlowContextValue>(
    () => ({
      onboardingComplete,
      incomeSetupComplete,
      refreshFlowState,
      markOnboardingComplete,
      markIncomeSetupComplete,
      resetFlowStateForTesting,
    }),
    [
      onboardingComplete,
      incomeSetupComplete,
      refreshFlowState,
      markOnboardingComplete,
      markIncomeSetupComplete,
      resetFlowStateForTesting,
    ]
  );

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>;
};

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext);
  if (!ctx) {
    throw new Error('useAppFlow must be used within an AppFlowProvider');
  }
  return ctx;
}

