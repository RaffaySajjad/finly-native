/**
 * Currency Formatter Utility
 * Purpose: Provides real-time currency formatting utilities for input fields
 * Features: Format as user types, parse formatted strings, handle decimals
 */

/**
 * Format a number or string to display with commas (e.g., "1,234.56")
 * @param value - The value to format (can be string or number)
 * @param allowDecimals - Whether to allow decimal points
 * @returns Formatted string with commas
 */
export const formatCurrencyInput = (value: string | number, allowDecimals: boolean = true): string => {
  // Convert to string and remove any non-numeric characters except decimal point
  let stringValue = String(value).replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const parts = stringValue.split('.');
  if (parts.length > 2) {
    stringValue = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // If decimals not allowed, remove decimal point
  if (!allowDecimals) {
    stringValue = stringValue.replace('.', '');
  }
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = stringValue.split('.');
  
  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Reconstruct the value
  if (decimalPart !== undefined) {
    // Limit decimal places to 2
    const limitedDecimal = decimalPart.slice(0, 2);
    return `${formattedInteger}.${limitedDecimal}`;
  }
  
  // If user just typed a decimal point, preserve it
  if (stringValue.endsWith('.')) {
    return `${formattedInteger}.`;
  }
  
  return formattedInteger;
};

/**
 * Remove formatting from a currency string to get the numeric value
 * @param formattedValue - Formatted string like "1,234.56"
 * @returns Plain numeric string like "1234.56"
 */
export const parseCurrencyInput = (formattedValue: string): string => {
  return formattedValue.replace(/,/g, '');
};

/**
 * Convert formatted string to number
 * @param formattedValue - Formatted string like "1,234.56"
 * @returns Number value or 0 if invalid
 */
export const currencyInputToNumber = (formattedValue: string): number => {
  const parsed = parseCurrencyInput(formattedValue);
  const num = parseFloat(parsed);
  return isNaN(num) ? 0 : num;
};

/**
 * Validate if a currency input string is valid
 * @param value - The value to validate
 * @returns True if valid
 */
export const isValidCurrencyInput = (value: string): boolean => {
  if (!value || value === '.') return false;
  const parsed = parseCurrencyInput(value);
  const num = parseFloat(parsed);
  return !isNaN(num) && num > 0;
};

/**
 * Format currency for display (not for input)
 * This is a simplified version - prefer using useCurrency().formatCurrency()
 * @param amount - The amount to format
 * @param currencySymbol - Currency symbol like '$'
 * @param showDecimals - Whether to show decimals
 * @returns Formatted currency string
 */
export const formatCurrencyDisplay = (
  amount: number,
  currencySymbol: string = '$',
  showDecimals: boolean = true
): string => {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
  
  return `${currencySymbol}${formattedNumber}`;
};

