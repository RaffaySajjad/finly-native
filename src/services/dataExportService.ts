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
 */
export async function deleteAllData(): Promise<void> {
  try {
    // Import apiService dynamically to avoid circular dependency
    const { apiService } = await import('./api');
    
    // Call backend API to delete all data
    await apiService.deleteAllData();
    
    // Also clear local AsyncStorage
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.STATS,
    ]);
  } catch (error) {
    console.error('Error deleting data:', error);
    throw new Error('Failed to delete data');
  }
}

export default {
  exportDataAsJSON,
  exportExpensesAsCSV,
  deleteAllData,
};

