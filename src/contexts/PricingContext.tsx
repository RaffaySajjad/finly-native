/**
 * Pricing Context
 * Purpose: Provides dynamic pricing fetched from App Store/Google Play
 * 
 * Features:
 * - Fetches real localized prices from stores
 * - Shows regional pricing in user's currency
 * - Falls back to config values if fetch fails
 * - Loading state for UI
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { iapService, ProductInfo } from '../services/iap.service';
import { PRICING_CONFIG } from '../config/pricing.config';
import { IAP_CONFIG } from '../config/iap.config';

/**
 * Dynamic pricing information
 */
export interface DynamicPricing {
  monthly: {
    price: string;        // Localized price string (e.g., "$12.99", "€10.99")
    priceValue: number;   // Numeric value
    productId: string;
  };
  yearly: {
    price: string;
    priceValue: number;
    monthlyEquivalent: string;  // e.g., "$9.99/mo"
    productId: string;
  };
  savings: {
    percent: number;
    percentFormatted: string;
  };
  discount: {
    percent: number;
    percentFormatted: string;
  };
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

interface PricingContextValue extends DynamicPricing {
  refreshPricing: () => Promise<void>;
  debugMessage: string;
  rawProducts: string;
}

/**
 * Default pricing from config (fallback)
 */
const getDefaultPricing = (): DynamicPricing => ({
  monthly: {
    price: PRICING_CONFIG.MONTHLY.priceFormatted,
    priceValue: PRICING_CONFIG.MONTHLY.price,
    productId: IAP_CONFIG.PRODUCTS.PREMIUM_MONTHLY.android,
  },
  yearly: {
    price: PRICING_CONFIG.YEARLY.priceFormatted,
    priceValue: PRICING_CONFIG.YEARLY.price,
    monthlyEquivalent: PRICING_CONFIG.YEARLY.monthlyEquivalentFormatted,
    productId: IAP_CONFIG.PRODUCTS.PREMIUM_YEARLY.android,
  },
  savings: {
    percent: PRICING_CONFIG.SAVINGS.percent,
    percentFormatted: PRICING_CONFIG.SAVINGS.percentFormatted,
  },
  discount: {
    percent: PRICING_CONFIG.DISCOUNT.percent,
    percentFormatted: PRICING_CONFIG.DISCOUNT.percentFormatted,
  },
  isLoading: false,
  isLoaded: false,
  error: null,
});

const PricingContext = createContext<PricingContextValue | undefined>(undefined);

interface PricingProviderProps {
  children: ReactNode;
}

/**
 * Parse price string to number
 * Handles various currency formats
 */
const parsePriceToNumber = (priceInput: string | number | undefined | null): number => {
  if (priceInput === undefined || priceInput === null) return 0;
  // If it's already a number, return it directly
  if (typeof priceInput === 'number') {
    return priceInput;
  }
  // Remove currency symbols and spaces, keep numbers and decimal point
  // Remove commas (thousands separator) entirely, keep only digits and period
  const cleaned = String(priceInput)
    .replace(/[^0-9.,]/g, '')  // Keep only digits, comma, period
    .replace(/,/g, '');         // Remove commas (thousands separator)
  return parseFloat(cleaned) || 0;
};

/**
 * Format number with thousands separators
 * Shows decimals only if they're not .00
 */
const formatNumber = (num: number): string => {
  // Check if the number has meaningful decimals
  const hasDecimals = num % 1 !== 0;

  if (hasDecimals) {
    // Format with 2 decimal places and thousands separators
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    // No decimals, just format with thousands separators
    return Math.round(num).toLocaleString('en-US');
  }
};

/**
 * Calculate monthly equivalent for yearly price
 */
const calculateMonthlyEquivalent = (yearlyPrice: string | number | undefined | null): string => {
  if (!yearlyPrice) return 'Rs 0';
  const yearlyValue = parsePriceToNumber(yearlyPrice);
  const monthlyValue = yearlyValue / 12;
  
  // Extract currency symbol from original price if it's a string
  if (typeof yearlyPrice === 'string') {
    const currencyMatch = yearlyPrice.match(/^[^0-9]*/);
    const currency = currencyMatch ? currencyMatch[0].trim() : 'Rs';
    return `${currency} ${formatNumber(monthlyValue)}`;
  }
  
  // If it was a number, just format with Rs
  return `Rs ${formatNumber(monthlyValue)}`;
};

/**
 * Calculate savings percentage
 */
const calculateSavingsPercent = (monthlyPrice: number, yearlyPrice: number): number => {
  if (monthlyPrice === 0) return 0;
  const yearlyIfMonthly = monthlyPrice * 12;
  const savings = ((yearlyIfMonthly - yearlyPrice) / yearlyIfMonthly) * 100;
  return Math.round(savings);
};

export const PricingProvider: React.FC<PricingProviderProps> = ({ children }) => {
  const [pricing, setPricing] = useState<DynamicPricing>(getDefaultPricing());
  const [debugMessage, setDebugMessage] = useState<string>('Initializing...');
  const [rawProducts, setRawProducts] = useState<string>('Not fetched yet');

  const fetchPricing = useCallback(async () => {
    setDebugMessage('Starting fetch...');
    setPricing(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch products from IAP
      setDebugMessage('Calling iapService.getProducts()...');
      const products = await iapService.getProducts();
      
      // Store raw response for debugging - show structure
      try {
        if (products && products.length > 0) {
          const p = products[0];
          // Show all keys and their values
          const keys = Object.keys(p || {});
          const vals = keys.map(k => `${k}=${JSON.stringify((p as any)[k]).substring(0, 20)}`);
          setRawProducts(`Keys: ${keys.join(',')} | productId=${p?.productId}, price=${p?.localizedPrice}`);
        } else {
          setRawProducts('No products array');
        }
      } catch (e: any) {
        setRawProducts(`Serialize error: ${e.message}`);
      }

      setDebugMessage(`Got ${products?.length || 0} products`);

      if (!products || products.length === 0) {
        console.warn('[Pricing] No products returned, using defaults');
        setDebugMessage('No products returned!');
        setPricing(prev => ({ 
          ...prev, 
          isLoading: false, 
          isLoaded: true,
          error: 'No products available' 
        }));
        return;
      }

      // Find monthly and yearly products
      // Note: On Android with base plans, we get one product with subscription offers
      let monthlyProduct: ProductInfo | undefined;
      let yearlyProduct: ProductInfo | undefined;

      // Try to find products by ID or title
      setDebugMessage(`Processing ${products.length} products...`);
      for (const product of products) {
        // Safe access with fallbacks
        const lowerTitle = (product?.title || '').toLowerCase();
        const lowerProductId = (product?.productId || '').toLowerCase();
        
        if (lowerProductId.includes('monthly') || lowerTitle.includes('monthly')) {
          monthlyProduct = product;
        } else if (lowerProductId.includes('yearly') || lowerTitle.includes('yearly') || lowerTitle.includes('annual')) {
          yearlyProduct = product;
        }
      }

      // If we only got one product (Android base plans), use subscription offers
      // For now, use the product info and calculate based on config ratios
      if (products.length === 1 && !monthlyProduct && !yearlyProduct) {
        const product = products[0];
        const localizedPrice = product?.localizedPrice || '$9.99';
        const basePrice = parsePriceToNumber(localizedPrice);
        
        // Use config ratios to estimate prices
        // Monthly price is the base, yearly is discounted
        monthlyProduct = product;
        
        // Create a synthetic yearly product based on savings percentage
        const yearlySavingsMultiplier = 1 - (PRICING_CONFIG.SAVINGS.percent / 100);
        const estimatedYearlyMonthly = basePrice * yearlySavingsMultiplier;
        const estimatedYearlyTotal = estimatedYearlyMonthly * 12;
        
        // Extract currency safely - convert to string first in case it's a number
        const priceStr = String(localizedPrice);
        const currencyMatch = priceStr.match(/^[^0-9]*/);
        const currency = currencyMatch ? currencyMatch[0].trim() : 'PKR';
        
        yearlyProduct = {
          productId: product?.productId || 'finly_premium',
          title: product?.title || 'Finly Premium Yearly',
          description: product?.description || '',
          price: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
          currency: product?.currency || 'USD',
          localizedPrice: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
        };
      }

      // Use first product as monthly if not found
      if (!monthlyProduct && products.length > 0) {
        monthlyProduct = products[0];
      }
      
      // Use last product as yearly if not found and we have multiple
      if (!yearlyProduct && products.length > 1) {
        yearlyProduct = products[products.length - 1];
      }

      // If still no yearly, derive from monthly
      if (!yearlyProduct && monthlyProduct) {
        const localizedPrice = monthlyProduct?.localizedPrice || '$9.99';
        const basePrice = parsePriceToNumber(localizedPrice);
        const yearlySavingsMultiplier = 1 - (PRICING_CONFIG.SAVINGS.percent / 100);
        const estimatedYearlyMonthly = basePrice * yearlySavingsMultiplier;
        const estimatedYearlyTotal = estimatedYearlyMonthly * 12;
        // Extract currency safely - convert to string first in case it's a number
        const priceStr2 = String(localizedPrice);
        const currencyMatch = priceStr2.match(/^[^0-9]*/);
        const currency = currencyMatch ? currencyMatch[0].trim() : 'PKR';

        yearlyProduct = {
          productId: monthlyProduct?.productId || 'finly_premium',
          title: 'Finly Premium Yearly',
          description: '',
          price: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
          currency: monthlyProduct?.currency || 'USD',
          localizedPrice: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
        };
      }

      const monthlyPrice = monthlyProduct?.localizedPrice || PRICING_CONFIG.MONTHLY.priceFormatted;
      const yearlyPrice = yearlyProduct?.localizedPrice || PRICING_CONFIG.YEARLY.priceFormatted;
      const monthlyValue = parsePriceToNumber(monthlyPrice);
      const yearlyValue = parsePriceToNumber(yearlyPrice);
      
      const savingsPercent = calculateSavingsPercent(monthlyValue, yearlyValue);

      setDebugMessage(`✅ Loaded: Monthly ${monthlyPrice}, Yearly ${yearlyPrice}`);

      setPricing({
        monthly: {
          price: monthlyPrice,
          priceValue: monthlyValue,
          productId: monthlyProduct?.productId || IAP_CONFIG.PRODUCTS.PREMIUM_MONTHLY.android,
        },
        yearly: {
          price: yearlyPrice,
          priceValue: yearlyValue,
          monthlyEquivalent: calculateMonthlyEquivalent(yearlyPrice),
          productId: yearlyProduct?.productId || IAP_CONFIG.PRODUCTS.PREMIUM_YEARLY.android,
        },
        savings: {
          percent: savingsPercent,
          percentFormatted: `${savingsPercent}%`,
        },
        discount: {
          percent: PRICING_CONFIG.DISCOUNT.percent,
          percentFormatted: PRICING_CONFIG.DISCOUNT.percentFormatted,
        },
        isLoading: false,
        isLoaded: true,
        error: null,
      });
    } catch (error: any) {
      console.error('[Pricing] Failed to fetch pricing:', error);
      setDebugMessage(`Error: ${error.message}`);
      setPricing(prev => ({ 
        ...prev, 
        isLoading: false, 
        isLoaded: true,
        error: error.message || 'Failed to load pricing' 
      }));
    }
  }, []);

  // Fetch pricing on mount
  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const value: PricingContextValue = {
    ...pricing,
    refreshPricing: fetchPricing,
    debugMessage,
    rawProducts,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
};

/**
 * Hook to access dynamic pricing
 * Returns default pricing if not within PricingProvider (for safety during init)
 */
export const usePricing = (): PricingContextValue => {
  const context = useContext(PricingContext);
  
  // Return defaults if not within provider (safety during app init)
  if (!context) {
    console.warn('[usePricing] No PricingProvider found, using defaults');
    const defaults = getDefaultPricing();
    return {
      ...defaults,
      refreshPricing: async () => {},
      debugMessage: 'No provider',
      rawProducts: 'No provider',
    };
  }
  
  return context;
};

export default PricingContext;
