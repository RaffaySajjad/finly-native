/**
 * Finly AI Service
 * Purpose: Handle AI queries for transaction questions, feature explanations, and financial insights
 * Features: Rate limiting, premium gating, context-aware responses, currency normalization
 * Uses backend API for OpenAI integration
 */

import { api } from './apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import {
  normalizeCurrencySymbolsInText,
  buildCurrencyContextForAI,
  getCurrencyByCode,
  CURRENCY_NAME_ALIASES
} from './currencyService';

/**
 * Common qualifiers that indicate a currency is already explicitly specified
 * Used to avoid double-qualifying terms like "Pakistani rupees" → "Pakistani Pakistani rupees"
 */
const CURRENCY_QUALIFIERS = new Set([
  'indian',
  'pakistani',
  'nepalese',
  'sri lankan',
  'mauritian',
  'us',
  'american',
  'australian',
  'canadian',
  'singapore',
  'hong kong',
  'new zealand',
  'british',
  'egyptian',
  'mexican',
  'philippine',
  'argentine',
  'colombian',
  'chilean',
  'japanese',
  'chinese',
  'swedish',
  'norwegian',
  'danish',
  'icelandic',
  'swiss',
  'uae',
  'emirati',
  'moroccan',
  'saudi',
  'qatari',
  'omani',
  'iranian',
  'yemeni'
]);

/**
 * Check if a currency term at a given position is already qualified
 * E.g., "Pakistani rupees" - "rupees" is already qualified
 */
const isAlreadyQualified = (text: string, matchIndex: number): boolean => {
  // Get text before the match
  const textBefore = text.substring(0, matchIndex).toLowerCase();

  // Check if any qualifier word appears right before (with optional space)
  const words = textBefore.trim().split(/\s+/);
  if (words.length === 0) return false;

  const lastWord = words[words.length - 1];
  return CURRENCY_QUALIFIERS.has(lastWord);
};

/**
 * Pre-process user query to disambiguate currency references
 * Replaces ambiguous currency terms with explicit currency names based on user's active currency
 * E.g., "20k rupees" → "20k Pakistani Rupees" when active currency is PKR
 */
const disambiguateCurrencyInQuery = (
  query: string,
  currencyCode: string
): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return query;

  // Extract the country/region qualifier from currency name
  // E.g., "Pakistani Rupee" → "Pakistani"
  const currencyNameParts = currency.name.split(' ');
  const qualifier = currencyNameParts.length > 1 ? currencyNameParts[0] : '';

  if (!qualifier) return query;

  let processedQuery = query;

  // Find which ambiguous terms map to the user's currency
  for (const [alias, codes] of Object.entries(CURRENCY_NAME_ALIASES)) {
    // Only process if:
    // 1. User's currency is one of the possible currencies for this alias
    // 2. The alias is ambiguous (maps to multiple currencies)
    if (codes.includes(currencyCode) && codes.length > 1) {
      // Create regex to match the alias as a whole word (case insensitive)
      const aliasRegex = new RegExp(`\\b(${alias})\\b`, 'gi');

      // Replace each match, but only if not already qualified
      let match;
      let lastIndex = 0;
      let result = '';

      // Reset regex state
      aliasRegex.lastIndex = 0;

      while ((match = aliasRegex.exec(processedQuery)) !== null) {
        const matchedText = match[1];
        const matchIndex = match.index;

        // Add text before this match
        result += processedQuery.substring(lastIndex, matchIndex);

        // Check if already qualified (e.g., "Pakistani rupees")
        if (isAlreadyQualified(processedQuery, matchIndex)) {
          // Keep as-is
          result += matchedText;
        } else {
          // Add qualifier - preserve original casing
          const isCapitalized = matchedText[0] === matchedText[0].toUpperCase();
          const qualifiedTerm = isCapitalized
            ? `${qualifier} ${matchedText}`
            : `${qualifier.toLowerCase()} ${matchedText}`;
          result += qualifiedTerm;
        }

        lastIndex = matchIndex + matchedText.length;
      }

      // Add remaining text
      result += processedQuery.substring(lastIndex);
      processedQuery = result;
    }
  }

  return processedQuery;
};

export interface AIQuery {
  id: string;
  query: string;
  response: string;
  timestamp: string;
  context?: {
    transactionId?: string;
    categoryId?: string;
    screen?: string;
  };
}

export interface QueryLimits {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
}

export const getQueryLimits = async (isPremium: boolean): Promise<QueryLimits> => {
  try {
    const response = await api.get<QueryLimits>(API_ENDPOINTS.AI.LIMITS);
    if (!response.success || !response.data) {
      // Fallback defaults if API fails
      return {
        limit: isPremium ? Infinity : 5,
        used: 0,
        remaining: isPremium ? Infinity : 5,
        resetDate: new Date().toISOString(),
      };
    }
    return response.data;
  } catch (error) {
    console.error('Error getting query limits:', error);
    return {
      limit: isPremium ? Infinity : 5,
      used: 0,
      remaining: isPremium ? Infinity : 5,
      resetDate: new Date().toISOString(),
    };
  }
};

/**
 * Get query history
 */
export const getQueryHistory = async (): Promise<AIQuery[]> => {
  try {
    const response = await api.get<AIQuery[]>(API_ENDPOINTS.AI.HISTORY);
    if (!response.success || !response.data) {
      return [];
    }
    return response.data;
  } catch (error) {
    console.error('Error getting query history:', error);
    return [];
  }
};

/**
 * Process AI query using backend API
 * Handles currency context for proper disambiguation and normalizes currency symbols in responses
 */
export const processAIQuery = async (
  query: string,
  isPremium: boolean,
  formatCurrency: (amount: number) => string,
  context?: AIQuery['context'],
  currencyCode?: string
): Promise<{ response: string; query: AIQuery }> => {
  try {
    // Check rate limits first
    const limits = await getQueryLimits(isPremium);

    if (!isPremium && limits.used >= limits.limit) {
      // Soft landing: Return a friendly message instead of throwing an error
      const limitReachedResponse =
        "I've reached my daily energy limit for free insights! ⚡️\n\nI can help you again tomorrow, or you can upgrade to Premium for unlimited AI access right now.";

      const limitQuery: AIQuery = {
        id: 'limit-reached-' + Date.now(),
        query: query,
        response: limitReachedResponse,
        timestamp: new Date().toISOString(),
        context
      };

      return { response: limitReachedResponse, query: limitQuery };
    }

    // Get currency info for comprehensive context
    const activeCurrency = currencyCode
      ? getCurrencyByCode(currencyCode)
      : null;

    // Pre-process query to disambiguate currency references
    // E.g., "20k rupees" → "20k Pakistani Rupees" when active currency is PKR
    const processedQuery = currencyCode
      ? disambiguateCurrencyInQuery(query.trim(), currencyCode)
      : query.trim();

    // Build request body with comprehensive currency context
    const requestBody: {
      query: string;
      context?: AIQuery['context'];
      currencyCode?: string;
      currencyContext?: string;
      currencySymbol?: string;
      currencyName?: string;
    } = {
      query: processedQuery // Use the disambiguated query
    };

    if (context) {
      requestBody.context = context;
    }

    // Include comprehensive currency information for proper disambiguation
    if (currencyCode) {
      requestBody.currencyCode = currencyCode.trim();

      // Add additional currency context for AI disambiguation
      requestBody.currencyContext = buildCurrencyContextForAI(currencyCode);

      if (activeCurrency) {
        requestBody.currencySymbol = activeCurrency.symbol;
        requestBody.currencyName = activeCurrency.name;
      }
    }

    const response = await api.post<{
      id: string;
      query: string;
      response: string;
      timestamp: string;
      processingTime: number;
      cached: boolean;
    }>(API_ENDPOINTS.AI.QUERY, requestBody);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to process AI query');
    }

    const result = response.data;

    // Post-process response to normalize currency symbols to user's active currency
    // This ensures that even if AI uses wrong symbol (e.g., ₹ instead of ₨ for PKR),
    // the user sees the correct symbol for their active currency
    let normalizedResponse = result.response;
    if (currencyCode) {
      normalizedResponse = normalizeCurrencySymbolsInText(
        result.response,
        currencyCode
      );
    }

    // Convert to AIQuery format
    const aiQuery: AIQuery = {
      id: result.id,
      query: result.query,
      response: normalizedResponse,
      timestamp: result.timestamp,
      context
    };

    return { response: normalizedResponse, query: aiQuery };
  } catch (error: any) {
    console.error('Error processing AI query:', error);
    
    // Handle rate limit errors from backend (429 status code)
    if (error.response?.status === 429 || error.response?.data?.error?.code === 'RATE_LIMIT_EXCEEDED') {
      // Soft landing for backend rate limits as well
      const limitReachedResponse = "I've reached my daily energy limit for free insights! ⚡️\n\nI can help you again tomorrow, or you can upgrade to Premium for unlimited AI access right now.";
      
      const limitQuery: AIQuery = {
        id: 'limit-reached-' + Date.now(),
        query: query,
        response: limitReachedResponse,
        timestamp: new Date().toISOString(),
        context
      };
      
      return { response: limitReachedResponse, query: limitQuery };
    }
    
    // Handle API response errors (when response.success is false)
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      if (apiError.code === 'RATE_LIMIT_EXCEEDED' || apiError.statusCode === 429) {
        const rateLimitError = new Error(
          apiError.message || 'You\'ve reached your daily query limit. Upgrade to Premium for unlimited queries.'
        );
        (rateLimitError as any).isRateLimit = true;
        (rateLimitError as any).statusCode = 429;
        throw rateLimitError;
      }
      throw new Error(apiError.message || 'Failed to process AI query');
    }
    
    // Re-throw original error if it's already a proper Error instance
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback for unknown error types
    throw new Error(error.message || 'Failed to process AI query. Please try again.');
  }
};

