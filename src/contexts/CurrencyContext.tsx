/**
 * CurrencyContext
 * Purpose: Provides global currency state and formatting utilities
 * Features: Currency selection, symbol formatting, currency change notifications
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserCurrency,
  saveUserCurrency,
  getCurrencyByCode,
  Currency,
} from '../services/currencyService';

const DECIMAL_TOGGLE_KEY = '@finly_decimal_enabled';

interface CurrencyContextType {
  currency: Currency;
  currencyCode: string;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: () => string;
  showDecimals: boolean;
  setShowDecimals: (show: boolean) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_CURRENCY: Currency = {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  flag: '🇺🇸',
};

interface CurrencyProviderProps {
  children: ReactNode;
}

/**
 * Format large numbers with k/M/B notation
 */
const formatLargeNumber = (amount: number, showDecimals: boolean): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 1000000000) {
    const billions = absAmount / 1000000000;
    return `${sign}${billions.toFixed(showDecimals ? 2 : 0)}B`;
  }
  if (absAmount >= 1000000) {
    const millions = absAmount / 1000000;
    return `${sign}${millions.toFixed(showDecimals ? 2 : 0)}M`;
  }
  if (absAmount >= 1000) {
    const thousands = absAmount / 1000;
    return `${sign}${thousands.toFixed(showDecimals ? 2 : 0)}k`;
  }
  
  return amount.toFixed(showDecimals ? 2 : 0);
};

/**
 * Get locale-specific formatting options based on currency code
 */
const getLocaleOptions = (currencyCode: string): Intl.Locale | string => {
  // Map currency codes to locale strings for proper formatting
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE', // European format
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'INR': 'en-IN',
    'PKR': 'en-PK',
    'CNY': 'zh-CN',
    'AUD': 'en-AU',
    'CAD': 'en-CA',
    // Add more as needed
  };
  
  return localeMap[currencyCode] || 'en-US';
};

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [showDecimals, setShowDecimalsState] = useState<boolean>(true);

  useEffect(() => {
    loadCurrency();
    loadDecimalPreference();
  }, []);

  const loadCurrency = async () => {
    try {
      const code = await getUserCurrency();
      const currencyData = getCurrencyByCode(code) || DEFAULT_CURRENCY;
      setCurrencyState(currencyData);
      setCurrencyCode(code);
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const loadDecimalPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(DECIMAL_TOGGLE_KEY);
      setShowDecimalsState(saved !== 'false'); // Default to true if not set
    } catch (error) {
      console.error('Error loading decimal preference:', error);
    }
  };

  const setCurrency = async (code: string) => {
    try {
      const currencyData = getCurrencyByCode(code) || DEFAULT_CURRENCY;
      setCurrencyState(currencyData);
      setCurrencyCode(code);
      await saveUserCurrency(code);
    } catch (error) {
      console.error('Error setting currency:', error);
    }
  };

  const setShowDecimals = async (show: boolean) => {
    try {
      setShowDecimalsState(show);
      await AsyncStorage.setItem(DECIMAL_TOGGLE_KEY, show.toString());
    } catch (error) {
      console.error('Error saving decimal preference:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    // Check if number is large enough to use k/M/B notation
    const absAmount = Math.abs(amount);
    const useShortNotation = absAmount >= 10000; // Use k/M/B for numbers >= 10k
    
    if (useShortNotation) {
      const formatted = formatLargeNumber(amount, showDecimals);
      return `${currency.symbol}${formatted}`;
    }
    
    // For smaller numbers, use locale-aware formatting with commas
    const locale = getLocaleOptions(currencyCode);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount);
    
    return `${currency.symbol}${formatted}`;
  };

  const getCurrencySymbol = (): string => {
    return currency.symbol;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyCode,
        setCurrency,
        formatCurrency,
        getCurrencySymbol,
        showDecimals,
        setShowDecimals,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

