/**
 * Currency Service
 * Purpose: Manages currency selection and provides list of available currencies
 * Features: Currency persistence, last used currency tracking
 * Note: Currency list is maintained locally (no backend API needed)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_STORAGE_KEY = '@finly_currency';
const LAST_CURRENCY_KEY = '@finly_last_currency';

/**
 * Currency interface
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string; // Emoji flag for visual representation
}

/**
 * Popular currencies list
 */
const POPULAR_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
];

/**
 * Mock API call to fetch currencies
 * In production, this would be an actual API call
 */
export const getCurrencies = async (): Promise<Currency[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return sorted currencies (popular ones first)
  return [...POPULAR_CURRENCIES];
};

/**
 * Get last used currency
 */
export const getLastUsedCurrency = async (): Promise<string | null> => {
  try {
    const lastCurrency = await AsyncStorage.getItem(LAST_CURRENCY_KEY);
    return lastCurrency;
  } catch (error) {
    console.error('Error getting last currency:', error);
    return null;
  }
};

/**
 * Save last used currency
 */
export const saveLastUsedCurrency = async (currencyCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_CURRENCY_KEY, currencyCode);
  } catch (error) {
    console.error('Error saving last currency:', error);
  }
};

/**
 * Get user's selected currency
 */
export const getUserCurrency = async (): Promise<string> => {
  try {
    const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
    return savedCurrency || 'USD'; // Default to USD
  } catch (error) {
    console.error('Error getting user currency:', error);
    return 'USD';
  }
};

/**
 * Save user's selected currency
 */
export const saveUserCurrency = async (currencyCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
    await saveLastUsedCurrency(currencyCode);
  } catch (error) {
    console.error('Error saving user currency:', error);
  }
};

/**
 * Get currency by code
 */
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return POPULAR_CURRENCIES.find(c => c.code === code);
};

