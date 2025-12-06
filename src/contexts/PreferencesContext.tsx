import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesContextType {
  animateBalancePill: boolean;
  setAnimateBalancePill: (value: boolean) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ANIMATE_BALANCE_PILL: '@finly_pref_animate_balance_pill',
};

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [animateBalancePill, setAnimateBalancePillState] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.ANIMATE_BALANCE_PILL);
      if (saved !== null) {
        setAnimateBalancePillState(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const setAnimateBalancePill = async (value: boolean) => {
    setAnimateBalancePillState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ANIMATE_BALANCE_PILL, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  return (
    <PreferencesContext.Provider value={{ animateBalancePill, setAnimateBalancePill }}>
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
