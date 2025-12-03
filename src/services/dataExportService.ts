/**
 * Data Export Service
 * Purpose: Export user data in various formats (JSON, CSV, PDF)
 * Privacy-first: Allows users to export all their data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Category, MonthlyStats } from '../types';

const STORAGE_KEYS = {
  EXPENSES: '@finly_expenses',
  CATEGORIES: '@finly_categories',
  STATS: '@finly_stats',
};

/**
 * Export all user data as JSON
 */
export async function exportDataAsJSON(): Promise<string> {
  try {
    const [expenses, categories, stats] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.EXPENSES),
      AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
      AsyncStorage.getItem(STORAGE_KEYS.STATS),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      expenses: expenses ? JSON.parse(expenses) : [],
      categories: categories ? JSON.parse(categories) : [],
      stats: stats ? JSON.parse(stats) : null,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Export expenses as CSV
 */
export async function exportExpensesAsCSV(): Promise<string> {
  try {
    const expensesData = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
    const expenses: Expense[] = expensesData ? JSON.parse(expensesData) : [];

    if (expenses.length === 0) {
      return 'Date,Amount,Category,Description,Type\n';
    }

    const csvHeaders = 'Date,Amount,Category,Description\n';
    const csvRows = expenses
      .map(
        (exp) =>
          `${new Date(exp.date).toLocaleDateString()},${exp.amount},${exp.category?.name || 'Uncategorized'},${exp.description.replace(/,/g, ';')}`
      )
      .join('\n');

    return csvHeaders + csvRows;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export CSV');
  }
}

/**
 * Delete all user data
 * Purpose: Comprehensive deletion of all user data from backend and local storage
 * Clears: Database records, AsyncStorage, and ensures complete data removal
 */
export async function deleteAllData(): Promise<void> {
  try {
    // Import apiService and cache service dynamically to avoid circular dependency
    const { apiService } = await import('./api');
    const { apiCacheService } = await import('./apiCacheService');

    // Step 1: Call backend API to delete all data from database
    // This deletes: expenses, income, categories, receipts, tags, AI queries
    await apiService.deleteAllData();
    console.log('[DataExport] Backend data deleted successfully');

    // Step 1.5: Clear API cache
    await apiCacheService.clear();
    console.log('[DataExport] API cache cleared');

    // Step 2: Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Step 3: Explicitly list category-related keys to ensure they're cleared
    const categoryRelatedKeys = ['@finly_categories', '@finly_category_rules'];

    // Step 4: Filter keys that start with @finly_ but exclude auth tokens (they'll be cleared on logout)
    const keysToRemove = allKeys.filter(
      key =>
        key.startsWith('@finly_') &&
        !key.includes('access_token') &&
        !key.includes('refresh_token') &&
        !key.includes('token_expiry') &&
        !key.includes('user_data') // Keep user_data for logout process
    );

    // Step 5: Combine explicit category keys with filtered keys (remove duplicates)
    const allKeysToRemove = Array.from(
      new Set([...categoryRelatedKeys, ...keysToRemove])
    );

    // Step 6: Clear all keys
    if (allKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(allKeysToRemove);
      console.log(
        `[DataExport] Cleared ${allKeysToRemove.length} AsyncStorage keys:`,
        allKeysToRemove
      );
    } else {
      console.log('[DataExport] No AsyncStorage keys to clear');
    }

    // Step 7: Verify category-related keys are cleared
    const remainingCategoryKeys = allKeysToRemove.filter(
      key => key.includes('category') || key.includes('categories')
    );

    if (remainingCategoryKeys.length > 0) {
      // Double-check: try to remove category keys again if they still exist
      const stillExists = await Promise.all(
        remainingCategoryKeys.map(async key => {
          const value = await AsyncStorage.getItem(key);
          return value !== null ? key : null;
        })
      );

      const existingKeys = stillExists.filter(Boolean) as string[];
      if (existingKeys.length > 0) {
        await AsyncStorage.multiRemove(existingKeys);
        console.log(
          `[DataExport] Removed remaining category keys:`,
          existingKeys
        );
      }
    }

    console.log('[DataExport] All data deletion completed successfully');
  } catch (error) {
    console.error('[DataExport] Error deleting data:', error);
    throw new Error('Failed to delete data');
  }
}

export default {
  exportDataAsJSON,
  exportExpensesAsCSV,
  deleteAllData,
};

