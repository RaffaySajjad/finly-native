/**
 * AI Transaction Service
 * Purpose: Handles natural language processing for multi-transaction entry
 * Parses voice/text input and extracts transaction details
 */

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
 */
export async function parseTransactionInput(
  input: string,
  categories: Category[],
  currencySymbol: string = '$'
): Promise<Array<Omit<Expense, 'id' | 'date' | 'category' | 'createdAt' | 'updatedAt'>>> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const transactions: Array<Omit<Expense, 'id' | 'date' | 'category' | 'createdAt' | 'updatedAt'>> = [];

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

  // Helper to find category by name match
  const findCategoryId = (categoryName: string): string => {
    const lowerName = categoryName.toLowerCase();
    const matched = categories.find(cat => 
      cat.name.toLowerCase().includes(lowerName) ||
      lowerName.includes(cat.name.toLowerCase())
    );
    return matched?.id || categories.find(c => c.name.toLowerCase() === 'other')?.id || categories[0]?.id || '';
  };

  for (const part of parts) {
    // Extract amount (look for currency symbol + amount pattern)
    const amountRegex = new RegExp(`${escapedSymbol}?(\\d+\\.?\\d*)`);
    const amountMatch = part.match(amountRegex);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1]);

    // Extract merchant/category from keywords
    const lowerPart = part.toLowerCase();
    let categoryId = findCategoryId('other');
    let description = part;

    // Category detection by matching against category names
    const foodKeywords = ['food', 'restaurant', 'coffee', 'cafe', 'dining', 'mcdonalds', 'chipotle', 'subway', 'pizza', 'starbucks'];
    const transportKeywords = ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'transport', 'car', 'parking'];
    const shoppingKeywords = ['target', 'amazon', 'walmart', 'shopping', 'store', 'mall'];
    const entertainmentKeywords = ['movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'game'];
    const healthKeywords = ['pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'health', 'medicine'];
    const utilitiesKeywords = ['electric', 'gas', 'water', 'utility', 'internet', 'phone'];

    if (foodKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('food');
    } else if (transportKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('transport');
    } else if (shoppingKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('shopping');
    } else if (entertainmentKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('entertainment');
    } else if (healthKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('health');
    } else if (utilitiesKeywords.some(kw => lowerPart.includes(kw))) {
      categoryId = findCategoryId('utilities');
    }

    // Clean up description - remove currency symbol and amount
    const cleanupRegex = new RegExp(`${escapedSymbol}?\\d+\\.?\\d*`, 'g');
    description = part
      .replace(cleanupRegex, '')
      .trim()
      .replace(/^at\s+/i, '')
      .replace(/^for\s+/i, '');

    if (!description) {
      const matchedCategory = categories.find(c => c.id === categoryId);
      description = `${matchedCategory?.name || 'Other'} Expense`;
    }

    transactions.push({
      amount,
      categoryId,
      description
    });
  }

  // If no transactions found, try to parse as single transaction
  if (transactions.length === 0) {
    const amountRegex = new RegExp(`${escapedSymbol}?(\\d+\\.?\\d*)`);
    const amountMatch = input.match(amountRegex);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const lowerInput = input.toLowerCase();
      let categoryId = findCategoryId('other');

      if (lowerInput.match(/\b(food|restaurant|coffee|cafe)\b/)) {
        categoryId = findCategoryId('food');
      } else if (lowerInput.match(/\b(transport|uber|gas)\b/)) {
        categoryId = findCategoryId('transport');
      } else if (lowerInput.match(/\b(shopping|store)\b/)) {
        categoryId = findCategoryId('shopping');
      }

      const cleanupRegex = new RegExp(`${escapedSymbol}?\\d+\\.?\\d*`, 'g');
      transactions.push({
        amount,
        categoryId,
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

