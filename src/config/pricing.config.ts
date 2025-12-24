/**
 * Pricing Configuration
 * Central source of truth for all pricing information in the native app
 * Reads from environment variables with fallback to defaults
 * 
 * Environment Variables (via .env.development / .env.production):
 * - EXPO_PUBLIC_MONTHLY_PRICE: Monthly subscription price (default: 9.99)
 * - EXPO_PUBLIC_YEARLY_PRICE: Yearly subscription price (default: 83.99)
 * - EXPO_PUBLIC_YEARLY_MONTHLY_EQUIVALENT: Monthly equivalent for yearly plan (default: 6.99)
 * - EXPO_PUBLIC_SAVINGS_PERCENT: Yearly savings percentage (default: 30)
 * - EXPO_PUBLIC_DISCOUNT_PERCENT: Web signup discount percentage (default: 20)
 */

// Parse environment variables with fallbacks
const monthlyPrice = process.env.EXPO_PUBLIC_MONTHLY_PRICE || '9.99';
const yearlyPrice = process.env.EXPO_PUBLIC_YEARLY_PRICE || '83.99';
const yearlyMonthlyEquivalent = process.env.EXPO_PUBLIC_YEARLY_MONTHLY_EQUIVALENT || '6.99';
const savingsPercent = process.env.EXPO_PUBLIC_SAVINGS_PERCENT || '30';
const discountPercent = process.env.EXPO_PUBLIC_DISCOUNT_PERCENT || '20';

export const PRICING_CONFIG = {
  // Monthly subscription
  MONTHLY: {
    price: parseFloat(monthlyPrice),
    priceFormatted: `$${monthlyPrice}`,
    period: 'month' as const,
  },
  
  // Yearly subscription
  YEARLY: {
    price: parseFloat(yearlyPrice),
    priceFormatted: `$${yearlyPrice}`,
    period: 'year' as const,
    // Monthly equivalent for yearly plan
    monthlyEquivalent: parseFloat(yearlyMonthlyEquivalent),
    monthlyEquivalentFormatted: `$${yearlyMonthlyEquivalent}`,
  },
  
  // Calculated savings
  SAVINGS: {
    percent: parseInt(savingsPercent),
    percentFormatted: `${savingsPercent}%`,
  },
  
  // Web signup discount
  DISCOUNT: {
    percent: parseInt(discountPercent),
    percentFormatted: `${discountPercent}%`,
  },
} as const;

/**
 * IAP Product Price Configurations
 * Used for in-app purchase price display fallbacks
 */
export const getProductPrices = () => ({
  PREMIUM_MONTHLY: {
    price: PRICING_CONFIG.MONTHLY.priceFormatted,
    priceValue: PRICING_CONFIG.MONTHLY.price,
  },
  PREMIUM_YEARLY: {
    price: PRICING_CONFIG.YEARLY.priceFormatted,
    priceValue: PRICING_CONFIG.YEARLY.price,
  },
});

export default PRICING_CONFIG;
