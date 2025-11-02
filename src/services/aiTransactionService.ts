/**
 * AI Transaction Service
 * Purpose: Handles natural language processing for multi-transaction entry
 * Parses voice/text input and extracts transaction details
 */

import { Expense, CategoryType } from '../types';

/**
 * Parse natural language input to extract transactions
 * Examples:
 * - "Lunch at Cafe Luna $42.50, Uber $15, Groceries $89.99"
 * - "Coffee $5.50 yesterday, Gas $30 today"
 * - "Starbucks $8.75, Target $67.50, Dinner $45"
 * 
 * @param input - The natural language input string
 * @param currencySymbol - Optional currency symbol to use in parsing (defaults to $ for backwards compatibility)
 */
export async function parseTransactionInput(
  input: string,
  currencySymbol: string = '$'
): Promise<Array<Omit<Expense, 'id' | 'date'>>> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const transactions: Array<Omit<Expense, 'id' | 'date'>> = [];

  // Escape special regex characters in currency symbol for use in regex patterns
  const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Simple parsing logic (in production, use actual NLP)
  // Split by common delimiters
  const parts = input
    .split(/[,;]|and|then/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Extract date mentions
  const now = new Date();
  let inferredDate = now.toISOString();

  if (input.toLowerCase().includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    inferredDate = yesterday.toISOString();
  } else if (input.toLowerCase().includes('today')) {
    inferredDate = now.toISOString();
  }

  for (const part of parts) {
    // Extract amount (look for currency symbol + amount pattern)
    const amountRegex = new RegExp(`${escapedSymbol}?(\\d+\\.?\\d*)`);
    const amountMatch = part.match(amountRegex);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1]);

    // Extract merchant/category from keywords
    const lowerPart = part.toLowerCase();
    let category: CategoryType = 'other';
    let description = part;

    // Category detection
    if (
      lowerPart.match(
        /\b(starbucks|coffee|cafe|restaurant|food|dining|mcdonalds|chipotle|subway|pizza)\b/
      )
    ) {
      category = 'food';
    } else if (
      lowerPart.match(/\b(uber|lyft|taxi|gas|fuel|transport|car|parking)\b/)
    ) {
      category = 'transport';
    } else if (
      lowerPart.match(/\b(target|amazon|walmart|shopping|store|mall)\b/)
    ) {
      category = 'shopping';
    } else if (
      lowerPart.match(/\b(movie|cinema|netflix|spotify|entertainment|game)\b/)
    ) {
      category = 'entertainment';
    } else if (
      lowerPart.match(
        /\b(pharmacy|cvs|walgreens|doctor|hospital|health|medicine)\b/
      )
    ) {
      category = 'health';
    } else if (
      lowerPart.match(/\b(electric|gas|water|utility|internet|phone)\b/)
    ) {
      category = 'utilities';
    }

    // Clean up description - remove currency symbol and amount
    const cleanupRegex = new RegExp(`${escapedSymbol}?\\d+\\.?\\d*`, 'g');
    description = part
      .replace(cleanupRegex, '')
      .trim()
      .replace(/^at\s+/i, '')
      .replace(/^for\s+/i, '');

    if (!description) {
      description = `${
        category.charAt(0).toUpperCase() + category.slice(1)
      } Expense`;
    }

    transactions.push({
      amount,
      category,
      description
    });
  }

  // If no transactions found, try to parse as single transaction
  if (transactions.length === 0) {
    const amountRegex = new RegExp(`${escapedSymbol}?(\\d+\\.?\\d*)`);
    const amountMatch = input.match(amountRegex);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      let category: CategoryType = 'other';

      const lowerInput = input.toLowerCase();
      if (lowerInput.match(/\b(food|restaurant|coffee|cafe)\b/)) {
        category = 'food';
      } else if (lowerInput.match(/\b(transport|uber|gas)\b/)) {
        category = 'transport';
      } else if (lowerInput.match(/\b(shopping|store)\b/)) {
        category = 'shopping';
      }

      const cleanupRegex = new RegExp(`${escapedSymbol}?\\d+\\.?\\d*`, 'g');
      transactions.push({
        amount,
        category,
        description: input.replace(cleanupRegex, '').trim() || 'Transaction'
      });
    }
  }

  return transactions;
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

