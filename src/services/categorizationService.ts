/**
 * Categorization Service
 * Purpose: Smart categorization rules and merchant learning
 * Premium feature - allows users to create custom rules
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryRule, CategoryType } from '../types';

const RULES_STORAGE_KEY = '@finly_category_rules';

/**
 * Get all categorization rules
 */
export async function getCategoryRules(): Promise<CategoryRule[]> {
  try {
    const data = await AsyncStorage.getItem(RULES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading rules:', error);
    return [];
  }
}

/**
 * Save a categorization rule
 */
export async function saveCategoryRule(rule: Omit<CategoryRule, 'id'>): Promise<CategoryRule> {
  try {
    const rules = await getCategoryRules();
    const newRule: CategoryRule = {
      ...rule,
      id: Date.now().toString(),
    };
    rules.push(newRule);
    await AsyncStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    return newRule;
  } catch (error) {
    console.error('Error saving rule:', error);
    throw error;
  }
}

/**
 * Delete a categorization rule
 */
export async function deleteCategoryRule(ruleId: string): Promise<void> {
  try {
    const rules = await getCategoryRules();
    const filtered = rules.filter((r) => r.id !== ruleId);
    await AsyncStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
}

/**
 * Apply categorization rules to a merchant name
 */
export function categorizeByRules(
  merchant: string,
  rules: CategoryRule[]
): CategoryType | null {
  const merchantLower = merchant.toLowerCase();

  for (const rule of rules) {
    if (!rule.isActive) continue;

    // Simple pattern matching (in production, use regex)
    const pattern = rule.merchantPattern.toLowerCase();
    
    if (merchantLower.includes(pattern) || pattern.includes(merchantLower)) {
      return rule.category;
    }
  }

  return null;
}

/**
 * Smart categorization based on merchant name
 */
export function smartCategorize(merchant: string): CategoryType {
  const merchantLower = merchant.toLowerCase();

  // Built-in smart categorization
  if (
    merchantLower.match(/\b(starbucks|coffee|cafe|restaurant|food|dining|mcdonalds|chipotle|subway|pizza|burger|taco|waffle|bakery)\b/)
  ) {
    return 'food';
  }
  if (
    merchantLower.match(/\b(uber|lyft|taxi|gas|fuel|transport|car|parking|shell|chevron|exxon)\b/)
  ) {
    return 'transport';
  }
  if (
    merchantLower.match(/\b(target|amazon|walmart|shopping|store|mall|nike|adidas|best buy|home depot)\b/)
  ) {
    return 'shopping';
  }
  if (
    merchantLower.match(/\b(movie|cinema|netflix|spotify|entertainment|game|steam|disney)\b/)
  ) {
    return 'entertainment';
  }
  if (
    merchantLower.match(/\b(pharmacy|cvs|walgreens|doctor|hospital|health|medicine|gym|fitness)\b/)
  ) {
    return 'health';
  }
  if (
    merchantLower.match(/\b(electric|gas company|water|utility|internet|phone|verizon|at&t)\b/)
  ) {
    return 'utilities';
  }

  return 'other';
}

export default {
  getCategoryRules,
  saveCategoryRule,
  deleteCategoryRule,
  categorizeByRules,
  smartCategorize,
};

