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
const parsePriceToNumber = (priceString: string): number => {
  // Remove currency symbols and spaces, keep numbers and decimal
  const cleaned = priceString.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

/**
 * Calculate monthly equivalent for yearly price
 */
const calculateMonthlyEquivalent = (yearlyPrice: string): string => {
  const yearlyValue = parsePriceToNumber(yearlyPrice);
  const monthlyValue = yearlyValue / 12;
  
  // Extract currency symbol from original price
  const currencyMatch = yearlyPrice.match(/^[^0-9]*/);
  const currency = currencyMatch ? currencyMatch[0].trim() : '$';
  
  return `${currency}${monthlyValue.toFixed(2)}`;
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

  const fetchPricing = useCallback(async () => {
    setPricing(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch products from IAP
      const products = await iapService.getProducts();
      
      if (!products || products.length === 0) {
        console.warn('[Pricing] No products returned, using defaults');
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
      for (const product of products) {
        const lowerTitle = product.title.toLowerCase();
        const lowerProductId = product.productId.toLowerCase();
        
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
        const basePrice = parsePriceToNumber(product.localizedPrice);
        
        // Use config ratios to estimate prices
        // Monthly price is the base, yearly is discounted
        monthlyProduct = product;
        
        // Create a synthetic yearly product based on savings percentage
        const yearlySavingsMultiplier = 1 - (PRICING_CONFIG.SAVINGS.percent / 100);
        const estimatedYearlyMonthly = basePrice * yearlySavingsMultiplier;
        const estimatedYearlyTotal = estimatedYearlyMonthly * 12;
        
        // Extract currency
        const currencyMatch = product.localizedPrice.match(/^[^0-9]*/);
        const currency = currencyMatch ? currencyMatch[0].trim() : '$';
        
        yearlyProduct = {
          ...product,
          productId: product.productId,
          localizedPrice: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
          price: `${currency}${estimatedYearlyTotal.toFixed(2)}`,
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

      const monthlyPrice = monthlyProduct?.localizedPrice || PRICING_CONFIG.MONTHLY.priceFormatted;
      const yearlyPrice = yearlyProduct?.localizedPrice || PRICING_CONFIG.YEARLY.priceFormatted;
      const monthlyValue = parsePriceToNumber(monthlyPrice);
      const yearlyValue = parsePriceToNumber(yearlyPrice);
      
      const savingsPercent = calculateSavingsPercent(monthlyValue, yearlyValue);

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

      console.log('[Pricing] Fetched dynamic pricing:', { monthlyPrice, yearlyPrice, savingsPercent });
    } catch (error: any) {
      console.error('[Pricing] Failed to fetch pricing:', error);
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
    };
  }
  
  return context;
};

export default PricingContext;
