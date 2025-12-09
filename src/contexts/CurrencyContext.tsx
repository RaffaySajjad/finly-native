/**
 * CurrencyContext
 * Purpose: Provides global currency state and formatting utilities
 * Features: Currency selection, symbol formatting, currency change notifications
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserCurrency,
  saveUserCurrency,
  getCurrencyByCode,
  Currency,
} from '../services/currencyService';
import { apiService } from '../services/api';

const DECIMAL_TOGGLE_KEY = '@finly_decimal_enabled';
const EXCHANGE_RATE_CACHE_KEY = '@finly_exchange_rate_cache';
const EXCHANGE_RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface ExchangeRateCache {
  rate: number;
  currency: string;
  timestamp: number;
}

interface CurrencyContextType {
  currency: Currency;
  currencyCode: string;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number, options?: { disableAbbreviations?: boolean }) => string;
  getCurrencySymbol: () => string;
  showDecimals: boolean;
  setShowDecimals: (show: boolean) => Promise<void>;
  exchangeRate: number | null;
  /**
   * Convert amount from display currency to USD (base currency)
   * Use this when sending amounts to the backend
   * @param amount - Amount in display currency
   * @returns Amount in USD
   */
  convertToUSD: (amount: number) => number;
  /**
   * Convert amount from USD (base currency) to display currency
   * All amounts stored in database are in USD, use this to convert for display/editing
   * @param amount - Amount in USD
   * @returns Amount in display currency
   */
  convertFromUSD: (amount: number) => number;
  /**
   * Get the display amount for a transaction, preferring originalAmount if available
   * @param amount - Amount in USD (from database)
   * @param originalAmount - Original amount in original currency (if available)
   * @param originalCurrency - Original currency code (if available)
   * @returns Amount to display (prefers originalAmount if currency matches, otherwise converts from USD)
   */
  getTransactionDisplayAmount: (amount: number, originalAmount?: number, originalCurrency?: string) => number;
  /**
   * Format a transaction amount, using original currency if available and matching
   */
  formatTransactionAmount: (amount: number, originalAmount?: number, originalCurrency?: string) => string;
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
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);
  const exchangeRateRef = useRef<number | null>(null);

  useEffect(() => {
    loadCurrency();
    loadDecimalPreference();
  }, []);

  // Note: Exchange rate is loaded in loadCurrency() and setCurrency()
  // No need for separate useEffect to avoid duplicate calls

  const loadCurrency = async () => {
    try {
      const code = await getUserCurrency();
      const currencyData = getCurrencyByCode(code) || DEFAULT_CURRENCY;
      setCurrencyState(currencyData);
      setCurrencyCode(code);
      // Load exchange rate for the initial currency
      await loadExchangeRate(code);
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

  /**
   * Load exchange rate from cache or API
   * All amounts in database are stored in USD, so we convert USD -> display currency
   */
  const loadExchangeRate = async (toCurrency: string) => {
    try {
      setIsLoadingRate(true);

      // If USD, rate is always 1
      if (toCurrency.toUpperCase() === 'USD') {
        setExchangeRate(1);
        exchangeRateRef.current = 1;
        setIsLoadingRate(false);
        return;
      }

      // Check cache first
      const cached = await AsyncStorage.getItem(`${EXCHANGE_RATE_CACHE_KEY}_${toCurrency}`);
      if (cached) {
        const cache: ExchangeRateCache = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - cache.timestamp;

        // Use cached rate if still valid
        if (cache.currency === toCurrency && cacheAge < EXCHANGE_RATE_CACHE_TTL) {
          // If cached rate is 1 for non-USD currency, it's likely stale/invalid - force refresh
          if (cache.rate === 1 && toCurrency.toUpperCase() !== 'USD') {
            console.log(`[CurrencyContext] ⚠️ Cached rate is 1 for ${toCurrency}, forcing refresh...`);
            // Fall through to fetch fresh rate
          } else {
            console.log(`[CurrencyContext] ✅ Using cached exchange rate for ${toCurrency}: ${cache.rate} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
            setExchangeRate(cache.rate);
            exchangeRateRef.current = cache.rate;
            setIsLoadingRate(false);
            return;
          }
        } else {
          console.log(`[CurrencyContext] Cache expired for ${toCurrency} (age: ${Math.round(cacheAge / 1000 / 60)} minutes), fetching fresh rate...`);
        }
      }

      // Fetch fresh rate from API
      console.log(`[CurrencyContext] Fetching exchange rate for ${toCurrency}...`);
      const rate = await apiService.getExchangeRate(toCurrency);
      console.log(`[CurrencyContext] Exchange rate received: ${rate} for ${toCurrency}`);
      if (rate === 1 && toCurrency.toUpperCase() !== 'USD') {
        console.warn(`[CurrencyContext] WARNING: Exchange rate is 1 for non-USD currency ${toCurrency}. This may indicate an API error.`);
      }
      setExchangeRate(rate);
      exchangeRateRef.current = rate;

      // Cache the rate
      const cache: ExchangeRateCache = {
        rate,
        currency: toCurrency,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${EXCHANGE_RATE_CACHE_KEY}_${toCurrency}`, JSON.stringify(cache));
      setIsLoadingRate(false);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      // Use cached rate or fallback to 1
      const cached = await AsyncStorage.getItem(`${EXCHANGE_RATE_CACHE_KEY}_${toCurrency}`);
      if (cached) {
        const cache: ExchangeRateCache = JSON.parse(cached);
        setExchangeRate(cache.rate);
        exchangeRateRef.current = cache.rate;
      } else {
        setExchangeRate(1);
        exchangeRateRef.current = 1;
      }
      setIsLoadingRate(false);
    }
  };

  const setCurrency = async (code: string) => {
    try {
      const currencyData = getCurrencyByCode(code) || DEFAULT_CURRENCY;
      setCurrencyState(currencyData);
      await saveUserCurrency(code);

      // Load exchange rate immediately before updating currencyCode to prevent flickering
      await loadExchangeRate(code);

      // Update currency code after rate is loaded
      setCurrencyCode(code);
    } catch (error) {
      console.error('Error setting currency:', error);
      // Still update currency code even if rate loading fails
      setCurrencyCode(code);
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

  /**
   * Format currency amount
   * IMPORTANT: Amounts are stored in USD in the database
   * This function converts from USD to display currency before formatting
   */
  const formatCurrency = (amount: number, options?: { disableAbbreviations?: boolean }): string => {
    // Ensure we have a valid exchange rate (use ref for immediate access)
    const rate = exchangeRateRef.current ?? exchangeRate ?? 1;
    const convertedAmount = amount * rate;

    // Check if number is large enough to use k/M/B notation
    const absAmount = Math.abs(convertedAmount);
    const useShortNotation = !options?.disableAbbreviations && absAmount >= 100000; // Use k/M/B for numbers >= 10k
    
    if (useShortNotation) {
      const formatted = formatLargeNumber(convertedAmount, showDecimals);
      return `${currency.symbol}${formatted}`;
    }
    
    // For smaller numbers, use locale-aware formatting with commas
    const locale = getLocaleOptions(currencyCode);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(convertedAmount);
    
    return `${currency.symbol}${formatted}`;
  };

  const getCurrencySymbol = (): string => {
    return currency.symbol;
  };

  /**
   * Convert amount from display currency to USD (base currency)
   * All amounts stored in database are in USD
   * @param amount - Amount in display currency
   * @returns Amount in USD
   */
  const convertToUSD = (amount: number): number => {
    const rate = exchangeRateRef.current || exchangeRate || 1;
    // If USD, no conversion needed
    if (currencyCode.toUpperCase() === 'USD') {
      return amount;
    }
    // Convert from display currency to USD (divide by rate)
    return amount / rate;
  };

  /**
   * Convert amount from USD (base currency) to display currency
   * All amounts stored in database are in USD, use this to convert for display/editing
   * @param amount - Amount in USD
   * @returns Amount in display currency
   */
  const convertFromUSD = (amount: number): number => {
    const rate = exchangeRateRef.current || exchangeRate || 1;
    // If USD, no conversion needed
    if (currencyCode.toUpperCase() === 'USD') {
      return amount;
    }
    // Convert from USD to display currency (multiply by rate)
    return amount * rate;
  };

  /**
   * Get the display amount for a transaction, preferring originalAmount if available
   * @param amount - Amount in USD (from database)
   * @param originalAmount - Original amount in original currency (if available)
   * @param originalCurrency - Original currency code (if available)
   * @returns Amount to display (prefers originalAmount if currency matches, otherwise converts from USD)
   */
  const getTransactionDisplayAmount = (
    amount: number,
    originalAmount?: number,
    originalCurrency?: string
  ): number => {
    // Validate amount is a valid number
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.warn('[CurrencyContext] Invalid amount provided to getTransactionDisplayAmount:', amount);
      return 0;
    }

    // If we have original amount/currency and it matches the user's current currency (case-insensitive)
    if (
      originalAmount !== undefined &&
      originalAmount !== null &&
      !isNaN(originalAmount) &&
      originalCurrency &&
      originalCurrency.toUpperCase() === currencyCode.toUpperCase()
    ) {
      // Use the original amount directly without conversion
      return originalAmount;
    }

    // Fallback to converting from USD
    return convertFromUSD(amount);
  };

  /**
   * Format a transaction amount, using original currency if available and matching
   * Prefers originalAmount when originalCurrency matches current currency
   */
  const formatTransactionAmount = (amount: number, originalAmount?: number, originalCurrency?: string): string => {
    // Validate amount is a valid number
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.warn('[CurrencyContext] Invalid amount provided to formatTransactionAmount:', amount);
      return `${currency.symbol}0${showDecimals ? '.00' : ''}`;
    }

    // Get the display amount (prefers originalAmount if available)
    const displayAmount = getTransactionDisplayAmount(amount, originalAmount, originalCurrency);

    // Validate displayAmount is a valid number
    if (displayAmount === undefined || displayAmount === null || isNaN(displayAmount)) {
      console.warn('[CurrencyContext] Invalid displayAmount calculated:', displayAmount);
      return `${currency.symbol}0${showDecimals ? '.00' : ''}`;
    }

    // Check if number is large enough to use k/M/B notation
    const absAmount = Math.abs(displayAmount);
    const useShortNotation = absAmount >= 100000; // Use k/M/B for numbers >= 10k

    if (useShortNotation) {
      const formatted = formatLargeNumber(displayAmount, showDecimals);
      return `${currency.symbol}${formatted}`;
    }

    // For smaller numbers, use locale-aware formatting with commas
    const locale = getLocaleOptions(currencyCode);
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(displayAmount);

    return `${currency.symbol}${formatted}`;
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
        exchangeRate,
        convertToUSD,
        convertFromUSD,
        getTransactionDisplayAmount,
        formatTransactionAmount,
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

