import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crashReportingService } from '../services/crashReportingService';

interface PreferencesContextType {
  animateBalancePill: boolean;
  setAnimateBalancePill: (value: boolean) => Promise<void>;
  diagnosticsEnabled: boolean;
  setDiagnosticsEnabled: (value: boolean) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ANIMATE_BALANCE_PILL: '@finly_pref_animate_balance_pill',
  DIAGNOSTICS_ENABLED: '@finly_diagnostics_consent',
};

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [animateBalancePill, setAnimateBalancePillState] = useState(true);
  const [diagnosticsEnabled, setDiagnosticsEnabledState] = useState(true); // Enabled by default

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [animateSaved, diagnosticsSaved] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ANIMATE_BALANCE_PILL),
        AsyncStorage.getItem(STORAGE_KEYS.DIAGNOSTICS_ENABLED),
      ]);

      if (animateSaved !== null) {
        setAnimateBalancePillState(JSON.parse(animateSaved));
      }

      if (diagnosticsSaved !== null) {
        const enabled = diagnosticsSaved === 'true';
        setDiagnosticsEnabledState(enabled);
        // Initialize crash reporting if enabled
        if (enabled) {
          crashReportingService.initialize();
        }
      } else {
        // No saved preference - use default (enabled) and initialize
        crashReportingService.initialize();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const setAnimateBalancePill = useCallback(async (value: boolean) => {
    setAnimateBalancePillState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ANIMATE_BALANCE_PILL, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  }, []);

  const setDiagnosticsEnabled = useCallback(async (value: boolean) => {
    setDiagnosticsEnabledState(value);
    try {
      // Update crash reporting service consent
      await crashReportingService.setConsent(value);

      // Initialize if enabling for first time
      if (value) {
        await crashReportingService.initialize();
      }
    } catch (error) {
      console.error('Failed to save diagnostics preference:', error);
    }
  }, []);

  const value = useMemo<PreferencesContextType>(
    () => ({
      animateBalancePill,
      setAnimateBalancePill,
      diagnosticsEnabled,
      setDiagnosticsEnabled,
    }),
    [animateBalancePill, setAnimateBalancePill, diagnosticsEnabled, setDiagnosticsEnabled]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
