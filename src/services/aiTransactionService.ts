/**
 * AI Transaction Service
 * Purpose: Handles natural language processing for multi-transaction entry
 * Parses voice/text input and extracts transaction details
 */

import { api } from './apiClient';
import { Expense, Category } from '../types';

/**
 * Parse natural language input to extract transactions (both income and expense)
 * Examples:
 * - "Lunch at Cafe Luna $42.50, Uber $15, Groceries $89.99"
 * - "Coffee $5.50 yesterday, Gas $30 today"
 * - "Received salary $5000, Freelance payment $2000"
 * - "Starbucks $8.75, Target $67.50, Dinner $45"
 * 
 * @param input - The natural language input string
 * @param categories - Available categories to match against (kept for compatibility)
 * @param currencySymbol - Optional currency symbol to use in parsing (defaults to $ for backwards compatibility)
 * @param currencyCode - Optional currency code (e.g., 'PKR', 'USD') to provide context to the AI
 */
export async function parseTransactionInput(
  input: string,
  categories: Category[], // Kept for signature compatibility, but unused as backend handles it
  currencySymbol: string = '$',
  currencyCode?: string
): Promise<
  Array<{
    type: 'expense' | 'income';
    amount: number;
    description: string;
    categoryId?: string;
    incomeSourceId?: string;
    date: string;
  }>
> {
  try {
    const response = await api.post<
      Array<{
        type: 'expense' | 'income';
        amount: number;
        description: string;
        categoryId?: string;
        incomeSourceId?: string;
        date: string;
      }>
    >('/ai/parse-transactions', {
      input,
      ...(currencyCode && { currencyCode })
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to parse transactions');
    }

    return response.data;
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

