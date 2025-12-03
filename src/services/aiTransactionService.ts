/**
 * AI Transaction Service
 * Purpose: Handles natural language processing for multi-transaction entry
 * Parses voice/text input and extracts transaction details
 */

import { api } from './apiClient';
import { Expense, Category } from '../types';

/**
 * Parse natural language input to extract transactions
 * Examples:
 * - "Lunch at Cafe Luna $42.50, Uber $15, Groceries $89.99"
 * - "Coffee $5.50 yesterday, Gas $30 today"
 * - "Starbucks $8.75, Target $67.50, Dinner $45"
 * 
 * @param input - The natural language input string
 * @param categories - Available categories to match against
 * @param currencySymbol - Optional currency symbol to use in parsing (defaults to $ for backwards compatibility)
 * @param currencyCode - Optional currency code (e.g., 'PKR', 'USD') to provide context to the AI
 */
export async function parseTransactionInput(
  input: string,
  categories: Category[], // Kept for signature compatibility, but unused as backend handles it
  currencySymbol: string = '$',
  currencyCode?: string
): Promise<Array<Omit<Expense, 'id' | 'date' | 'category' | 'createdAt' | 'updatedAt'>>> {
  try {
    const response = await api.post<Array<{
      amount: number;
      description: string;
      categoryId: string;
      date: string;
    }>>('/ai/parse-transactions', { 
      input,
      ...(currencyCode && { currencyCode })
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to parse transactions');
    }

    return response.data.map((tx) => ({
      amount: tx.amount,
      description: tx.description,
      categoryId: tx.categoryId,
      // Date is returned by backend but not used in the return type of this function
      // The calling component handles the date assignment if needed, or we can update the type
    }));
  } catch (error) {
    console.error('Error parsing transactions:', error);
    throw error;
  }
}

/**
 * Validate parsed transactions
 */
export function validateTransactions(
  transactions: Array<Omit<Expense, 'id' | 'date'>>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (transactions.length === 0) {
    errors.push('No transactions found in input');
  }

  transactions.forEach((tx, index) => {
    if (tx.amount <= 0) {
      errors.push(`Transaction ${index + 1}: Invalid amount`);
    }
    if (!tx.description || tx.description.trim().length === 0) {
      errors.push(`Transaction ${index + 1}: Missing description`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  parseTransactionInput,
  validateTransactions,
};

