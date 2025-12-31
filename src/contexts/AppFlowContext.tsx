/**
 * AppFlowContext
 *
 * Purpose:
 * - Provide an in-memory source of truth for onboarding + paywall + income setup completion
 * - Sync to AsyncStorage, but avoid high-frequency polling (which hurts perf + battery)
 *
 * Notes:
 * - We refresh on mount, when the app becomes active, and when explicitly requested.
 * - Screens should call the `mark*Complete` helpers so the navigator updates immediately.
 * - Existing free users (paywallComplete=true from migration) are grandfathered in.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INCOME_SETUP_COMPLETED_KEY,
  ONBOARDING_STORAGE_KEY,
  PAYWALL_COMPLETE_KEY,
  CATEGORY_SETUP_COMPLETED_KEY
} from '../constants/storageKeys';

interface AppFlowContextValue {
  onboardingComplete: boolean | null;
  paywallComplete: boolean | null;
  incomeSetupComplete: boolean | null;
  categorySetupComplete: boolean | null;
  /** True while initial flow state is being loaded from AsyncStorage */
  isFlowStateLoading: boolean;
  refreshFlowState: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  markPaywallComplete: () => Promise<void>;
  markIncomeSetupComplete: () => Promise<void>;
  markCategorySetupComplete: () => Promise<void>;
  markSubscriptionExpired: () => Promise<void>;
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
  const [paywallComplete, setPaywallComplete] = useState<boolean | null>(null);
  const [incomeSetupComplete, setIncomeSetupComplete] = useState<boolean | null>(null);
  const [categorySetupComplete, setCategorySetupComplete] = useState<boolean | null>(null);
  const [isFlowStateLoading, setIsFlowStateLoading] = useState(true);

  const refreshFlowState = useCallback(async () => {
    setIsFlowStateLoading(true);
    const [onboarding, paywall, income, category] = await Promise.all([
      readBooleanFlag(ONBOARDING_STORAGE_KEY),
      readBooleanFlag(PAYWALL_COMPLETE_KEY),
      readBooleanFlag(INCOME_SETUP_COMPLETED_KEY),
      readBooleanFlag(CATEGORY_SETUP_COMPLETED_KEY),
    ]);
    setOnboardingComplete(onboarding);
    setPaywallComplete(paywall);
    setIncomeSetupComplete(income);
    // Migration: If paywall is complete but category setup is not (new flag), 
    // assume it's an existing user and mark as complete to avoid showing onboarding again.
    if (paywall && !category) {
      setCategorySetupComplete(true);
      AsyncStorage.setItem(CATEGORY_SETUP_COMPLETED_KEY, 'true').catch(() => { });
    } else {
      setCategorySetupComplete(category);
    }

    setIsFlowStateLoading(false);
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

  const markPaywallComplete = useCallback(async () => {
    setPaywallComplete(true);
    try {
      await AsyncStorage.setItem(PAYWALL_COMPLETE_KEY, 'true');
    } catch {
      // Best-effort, same reasoning as above.
    }
  }, []);

  const markIncomeSetupComplete = useCallback(async () => {
    setIncomeSetupComplete(true);
    try {
      await AsyncStorage.setItem(INCOME_SETUP_COMPLETED_KEY, 'true');
    } catch {
      // Best-effort
    }
  }, []);

  const markCategorySetupComplete = useCallback(async () => {
    setCategorySetupComplete(true);
    try {
      await AsyncStorage.setItem(CATEGORY_SETUP_COMPLETED_KEY, 'true');
    } catch {
      // Best-effort
    }
  }, []);

  /**
   * Called when subscription expires to un-set paywall complete flag.
   * Forces the user back to the hard paywall.
   */
  const markSubscriptionExpired = useCallback(async () => {
    setPaywallComplete(false);
    try {
      // We remove the key so next launch also shows paywall
      await AsyncStorage.removeItem(PAYWALL_COMPLETE_KEY);
    } catch {
  // Best-effort
    }
  }, []);

  const resetFlowStateForTesting = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY),
      AsyncStorage.removeItem(PAYWALL_COMPLETE_KEY),
      AsyncStorage.removeItem(INCOME_SETUP_COMPLETED_KEY),
      AsyncStorage.removeItem(CATEGORY_SETUP_COMPLETED_KEY),
    ]);
    setOnboardingComplete(false);
    setPaywallComplete(false);
    setIncomeSetupComplete(false);
    setCategorySetupComplete(false);
  }, []);

  // Initial load (one-time).
  useEffect(() => {
    refreshFlowState();
  }, [refreshFlowState]);

  // IMPORTANT: Re-read flags when authentication status changes (login/logout)
  // This ensures that flags synced from the backend during login are reflected immediately.
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  useEffect(() => {
    refreshFlowState();
  }, [isAuthenticated, refreshFlowState]);

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
      paywallComplete,
      incomeSetupComplete,
      categorySetupComplete,
      isFlowStateLoading,
      refreshFlowState,
      markOnboardingComplete,
      markPaywallComplete,
      markIncomeSetupComplete,
      markCategorySetupComplete,
      markSubscriptionExpired,
      resetFlowStateForTesting,
    }),
    [
      onboardingComplete,
      paywallComplete,
      incomeSetupComplete,
      categorySetupComplete,
      isFlowStateLoading,

      refreshFlowState,
      markOnboardingComplete,
      markPaywallComplete,
      markIncomeSetupComplete,
      markCategorySetupComplete,
      markSubscriptionExpired,
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
