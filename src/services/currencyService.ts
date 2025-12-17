/**
 * Currency Service
 * Purpose: Manages currency selection and provides list of available currencies
 * Features: Currency persistence, last used currency tracking
 * Note: Currency list is maintained locally (no backend API needed)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_STORAGE_KEY = '@finly_currency';
const LAST_CURRENCY_KEY = '@finly_last_currency';
const LAST_CURRENCIES_KEY = '@finly_last_currencies'; // Array of last 3 currencies

/**
 * Currency interface
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string; // Emoji flag for visual representation
}

// In-memory cache for currencies list
let currenciesCache: Currency[] | null = null;
let lastUsedCurrencyCache: string | null = null;
let lastUsedCurrenciesCache: string[] | null = null;

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
 * Uses in-memory cache to avoid repeated fetches
 */
export const getCurrencies = async (): Promise<Currency[]> => {
  // Return cached currencies if available
  if (currenciesCache !== null) {
    return currenciesCache;
  }
  
  // Simulate API delay (only on first fetch)
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Cache and return sorted currencies (popular ones first)
  currenciesCache = [...POPULAR_CURRENCIES];
  return currenciesCache;
};

/**
 * Get last used currency (for backward compatibility)
 * Uses in-memory cache to avoid repeated AsyncStorage reads
 */
export const getLastUsedCurrency = async (): Promise<string | null> => {
  const lastCurrencies = await getLastUsedCurrencies();
  return lastCurrencies.length > 0 ? lastCurrencies[0] : null;
};

/**
 * Get last 3 used currencies (most recent first)
 * Uses in-memory cache to avoid repeated AsyncStorage reads
 */
export const getLastUsedCurrencies = async (): Promise<string[]> => {
  // Return cached value if available
  if (lastUsedCurrenciesCache !== null) {
    return lastUsedCurrenciesCache;
  }
  
  try {
    const lastCurrenciesJson = await AsyncStorage.getItem(LAST_CURRENCIES_KEY);
    if (lastCurrenciesJson) {
      const currencies = JSON.parse(lastCurrenciesJson);
      lastUsedCurrenciesCache = Array.isArray(currencies) ? currencies : [];
      return lastUsedCurrenciesCache;
    }
    lastUsedCurrenciesCache = [];
    return [];
  } catch (error) {
    console.error('Error getting last currencies:', error);
    lastUsedCurrenciesCache = [];
    return [];
  }
};

/**
 * Save last used currency
 * Updates the list of last 3 currencies (most recent first)
 * Updates both AsyncStorage and in-memory cache
 */
export const saveLastUsedCurrency = async (currencyCode: string): Promise<void> => {
  try {
    // Get current list of last currencies
    const lastCurrencies = await getLastUsedCurrencies();
    
    // Remove the currency if it already exists in the list
    const filtered = lastCurrencies.filter(code => code !== currencyCode);
    
    // Add the new currency at the beginning (most recent)
    const updated = [currencyCode, ...filtered].slice(0, 3); // Keep only last 3
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(LAST_CURRENCIES_KEY, JSON.stringify(updated));
    
    // Update caches
    lastUsedCurrenciesCache = updated;
    lastUsedCurrencyCache = updated[0] || null;
    
    // Also update the legacy single currency key for backward compatibility
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

/**
 * Currency name aliases - maps common/ambiguous currency names to their possible codes
 * Used for disambiguating user input like "rupee" which could mean INR, PKR, etc.
 * Structure: { lowercaseName: [currencyCodes in priority order] }
 */
export const CURRENCY_NAME_ALIASES: Record<string, string[]> = {
  // Rupee variants
  'rupee': ['INR', 'PKR', 'NPR', 'LKR', 'MUR', 'SCR'],
  'rupees': ['INR', 'PKR', 'NPR', 'LKR', 'MUR', 'SCR'],
  'indian rupee': ['INR'],
  'indian rupees': ['INR'],
  'pakistani rupee': ['PKR'],
  'pakistani rupees': ['PKR'],
  'nepalese rupee': ['NPR'],
  'sri lankan rupee': ['LKR'],
  'mauritian rupee': ['MUR'],
  
  // Dollar variants
  'dollar': ['USD', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD'],
  'dollars': ['USD', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD'],
  'us dollar': ['USD'],
  'us dollars': ['USD'],
  'american dollar': ['USD'],
  'australian dollar': ['AUD'],
  'australian dollars': ['AUD'],
  'canadian dollar': ['CAD'],
  'canadian dollars': ['CAD'],
  'singapore dollar': ['SGD'],
  'hong kong dollar': ['HKD'],
  'new zealand dollar': ['NZD'],
  
  // Pound variants
  'pound': ['GBP', 'EGP', 'SYP', 'LBP'],
  'pounds': ['GBP', 'EGP', 'SYP', 'LBP'],
  'british pound': ['GBP'],
  'sterling': ['GBP'],
  'quid': ['GBP'],
  
  // Peso variants
  'peso': ['MXN', 'PHP', 'ARS', 'COP', 'CLP'],
  'pesos': ['MXN', 'PHP', 'ARS', 'COP', 'CLP'],
  'mexican peso': ['MXN'],
  'philippine peso': ['PHP'],
  
  // Yen/Yuan variants (share same symbol ¥)
  'yen': ['JPY'],
  'yuan': ['CNY'],
  'renminbi': ['CNY'],
  'rmb': ['CNY'],
  
  // Krona/Krone variants (share same symbol kr)
  'krona': ['SEK', 'ISK'],
  'krone': ['NOK', 'DKK'],
  'kronor': ['SEK'],
  'kroner': ['NOK', 'DKK'],
  'swedish krona': ['SEK'],
  'norwegian krone': ['NOK'],
  'danish krone': ['DKK'],
  
  // Franc variants
  'franc': ['CHF', 'XAF', 'XOF'],
  'francs': ['CHF', 'XAF', 'XOF'],
  'swiss franc': ['CHF'],
  
  // Dirham variants
  'dirham': ['AED', 'MAD'],
  'dirhams': ['AED', 'MAD'],
  'uae dirham': ['AED'],
  'emirati dirham': ['AED'],
  
  // Riyal/Rial variants
  'riyal': ['SAR', 'QAR', 'OMR'],
  'rial': ['IRR', 'OMR', 'YER'],
  'saudi riyal': ['SAR'],
  
  // Other common names
  'euro': ['EUR'],
  'euros': ['EUR'],
  'baht': ['THB'],
  'won': ['KRW'],
  'ringgit': ['MYR'],
  'rupiah': ['IDR'],
  'lira': ['TRY'],
  'ruble': ['RUB'],
  'rubles': ['RUB'],
  'shekel': ['ILS'],
  'shekels': ['ILS'],
  'rand': ['ZAR'],
  'real': ['BRL'],
  'reais': ['BRL'],
  'zloty': ['PLN'],
};

/**
 * Map of currency symbols to their possible currency codes
 * Used for normalizing currency symbols in AI responses
 */
export const CURRENCY_SYMBOL_TO_CODES: Record<string, string[]> = {
  '$': ['USD', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD', 'MXN'],
  '€': ['EUR'],
  '£': ['GBP'],
  '¥': ['JPY', 'CNY'],
  '₹': ['INR'],
  '₨': ['PKR', 'NPR', 'LKR', 'MUR'],
  'Rs': ['PKR', 'INR', 'NPR', 'LKR'],
  'Rs.': ['PKR', 'INR', 'NPR', 'LKR'],
  'kr': ['SEK', 'NOK', 'DKK', 'ISK'],
  '₩': ['KRW'],
  '฿': ['THB'],
  'RM': ['MYR'],
  'Rp': ['IDR'],
  '₱': ['PHP'],
  'د.إ': ['AED'],
  '﷼': ['SAR'],
  '₪': ['ILS'],
  '₺': ['TRY'],
  '₽': ['RUB'],
  'R$': ['BRL'],
  'R': ['ZAR'],
  'zł': ['PLN'],
  'CHF': ['CHF'],
  'A$': ['AUD'],
  'C$': ['CAD'],
  'S$': ['SGD'],
  'HK$': ['HKD'],
  'NZ$': ['NZD'],
};

/**
 * Get the preferred currency code for an ambiguous currency name
 * Prioritizes user's active currency if it matches one of the possible codes
 * @param name - The currency name/alias (e.g., "rupee", "dollar")
 * @param activeCurrencyCode - User's currently active currency code
 * @returns The preferred currency code, or null if no match found
 */
export const getPreferredCurrencyCode = (
  name: string,
  activeCurrencyCode: string
): string | null => {
  const normalizedName = name.toLowerCase().trim();
  const possibleCodes = CURRENCY_NAME_ALIASES[normalizedName];
  
  if (!possibleCodes || possibleCodes.length === 0) {
    return null;
  }
  
  // If user's active currency is in the list of possible codes, prefer it
  if (possibleCodes.includes(activeCurrencyCode)) {
    return activeCurrencyCode;
  }
  
  // Otherwise, return the first (most common) option
  return possibleCodes[0];
};

/**
 * Get currency info for display, including symbol and full name
 * Useful for providing context to AI or displaying to users
 */
export const getCurrencyDisplayInfo = (code: string): {
  code: string;
  symbol: string;
  name: string;
  flag: string;
} | null => {
  const currency = getCurrencyByCode(code);
  if (!currency) return null;
  
  return {
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
    flag: currency.flag,
  };
};

/**
 * Normalize currency symbols in a text to match the user's active currency
 * This is useful for post-processing AI responses to ensure consistent currency display
 * @param text - The text containing currency amounts
 * @param activeCurrencyCode - User's active currency code
 * @returns Text with currency symbols normalized to user's active currency
 */
export const normalizeCurrencySymbolsInText = (
  text: string,
  activeCurrencyCode: string
): string => {
  const activeCurrency = getCurrencyByCode(activeCurrencyCode);
  if (!activeCurrency) return text;
  
  const activeSymbol = activeCurrency.symbol;
  
  // Find symbols that should be replaced based on ambiguous currencies
  // Only replace symbols from currencies that share a name with active currency
  const symbolsToReplace: string[] = [];
  
  // Get all symbols that could represent similar currencies
  for (const [symbol, codes] of Object.entries(CURRENCY_SYMBOL_TO_CODES)) {
    // If the active currency is NOT in this symbol's codes but shares a name category
    // (e.g., both are "rupee" currencies), then replace this symbol
    if (!codes.includes(activeCurrencyCode)) {
      // Check if active currency shares a name alias with any of these codes
      const activeCurrencyAliases = Object.entries(CURRENCY_NAME_ALIASES)
        .filter(([_, aliasCodes]) => aliasCodes.includes(activeCurrencyCode))
        .map(([alias, _]) => alias);
      
      const symbolCurrencyAliases = Object.entries(CURRENCY_NAME_ALIASES)
        .filter(([_, aliasCodes]) => codes.some(c => aliasCodes.includes(c)))
        .map(([alias, _]) => alias);
      
      // If they share any alias, this symbol should be replaced
      const sharesAlias = activeCurrencyAliases.some(alias => 
        symbolCurrencyAliases.includes(alias)
      );
      
      if (sharesAlias && symbol !== activeSymbol) {
        symbolsToReplace.push(symbol);
      }
    }
  }
  
  if (symbolsToReplace.length === 0) return text;
  
  // Create regex patterns for currency amounts with these symbols
  // Match patterns like: ₹1,234.56, Rs. 1234, Rs 1,234.56, $100, etc.
  let result = text;
  
  for (const symbol of symbolsToReplace) {
    // Escape special regex characters in the symbol
    const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern to match currency symbol followed by optional space and number
    // Handles: ₹1234, ₹ 1234, ₹1,234.56, Rs.1234, Rs. 1234, etc.
    const pattern = new RegExp(
      `${escapedSymbol}\\.?\\s*([\\d,]+(?:\\.\\d{1,2})?)`,
      'g'
    );
    
    result = result.replace(pattern, `${activeSymbol}$1`);
  }
  
  return result;
};

/**
 * Build currency context string for AI prompts
 * Provides comprehensive currency information for AI to use
 */
export const buildCurrencyContextForAI = (currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    return `User's active currency: ${currencyCode}`;
  }
  
  // Find what aliases this currency belongs to (for disambiguation hints)
  const aliases = Object.entries(CURRENCY_NAME_ALIASES)
    .filter(([_, codes]) => codes.includes(currencyCode))
    .map(([alias, _]) => alias)
    .filter(alias => !alias.includes(currency.name.toLowerCase())); // Exclude full name matches
  
  let context = `User's active currency: ${currency.name} (${currencyCode}, symbol: ${currency.symbol})`;
  
  if (aliases.length > 0) {
    context += `\nIMPORTANT: When the user mentions "${aliases[0]}" without specifying a country, always use ${currency.name} (${currency.symbol}) as they have set this as their preferred currency.`;
  }
  
  return context;
};

