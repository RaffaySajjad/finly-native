/**
 * AI Assistant Service
 * Purpose: Handle AI queries for transaction questions, feature explanations, and financial insights
 * Features: Rate limiting, premium gating, context-aware responses
 * Uses backend API for OpenAI integration
 */

import { api } from './apiClient';
import { API_ENDPOINTS } from '../config/api.config';

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
 */
export const processAIQuery = async (
  query: string,
  isPremium: boolean,
  formatCurrency: (amount: number) => string,
  context?: AIQuery['context']
): Promise<{ response: string; query: AIQuery }> => {
  try {
    // Check rate limits first
    const limits = await getQueryLimits(isPremium);
    
    if (!isPremium && limits.used >= limits.limit) {
      throw new Error(`You've reached your daily limit of ${limits.limit} queries. Upgrade to Premium for unlimited queries.`);
    }

    // Process query via backend API
    const response = await api.post<{
      id: string;
      query: string;
      response: string;
      timestamp: string;
      processingTime: number;
      cached: boolean;
    }>(API_ENDPOINTS.AI.QUERY, {
      query: query.trim(),
      context,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to process AI query');
    }

    const result = response.data;

    // Convert to AIQuery format
    const aiQuery: AIQuery = {
      id: result.id,
      query: result.query,
      response: result.response,
      timestamp: result.timestamp,
      context,
    };

    return { response: result.response, query: aiQuery };
  } catch (error: any) {
    console.error('Error processing AI query:', error);
    throw error;
  }
};

