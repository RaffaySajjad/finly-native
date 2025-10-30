/**
 * CSV Import Service
 * Purpose: Parse and import transaction data from Wallet by BudgetBakers CSV files
 * Features: CSV parsing, category mapping, data transformation, duplicate detection
 */

import { Expense, CategoryType, PaymentMethod } from '../types';
import { apiService } from './api';
import { addIncomeTransaction } from './incomeService';

interface WalletCSVRow {
  account: string;
  category: string;
  currency: string;
  amount: string;
  ref_currency_amount: string;
  type: string; // "Income" or "Expense"
  payment_type: string; // "Cash", "Transfer", "Debit card", etc.
  note: string;
  date: string; // ISO format
  transfer: string; // "true" or "false"
  payee: string;
  labels: string; // Comma-separated tags
}

/**
 * Map Wallet categories to Finly categories
 */
const mapWalletCategoryToFinly = (walletCategory: string): CategoryType => {
  const categoryLower = walletCategory.toLowerCase();
  
  // Food & Dining
  if (categoryLower.includes('food') || categoryLower.includes('restaurant') || categoryLower.includes('groceries')) {
    return 'food';
  }
  
  // Transport
  if (categoryLower.includes('transport') || categoryLower.includes('car') || categoryLower.includes('taxi') || categoryLower.includes('fuel')) {
    return 'transport';
  }
  
  // Shopping
  if (categoryLower.includes('shopping') || categoryLower.includes('clothes') || categoryLower.includes('apparel')) {
    return 'shopping';
  }
  
  // Entertainment
  if (categoryLower.includes('entertainment') || categoryLower.includes('movie') || categoryLower.includes('tv') || categoryLower.includes('streaming') || categoryLower.includes('netflix')) {
    return 'entertainment';
  }
  
  // Health
  if (categoryLower.includes('health') || categoryLower.includes('medical') || categoryLower.includes('pharmacy') || categoryLower.includes('fitness') || categoryLower.includes('sport')) {
    return 'health';
  }
  
  // Utilities
  if (categoryLower.includes('utilities') || categoryLower.includes('electricity') || categoryLower.includes('water') || categoryLower.includes('internet') || categoryLower.includes('phone')) {
    return 'utilities';
  }
  
  // Default to other
  return 'other';
};

/**
 * Map Wallet payment types to Finly payment methods
 */
const mapWalletPaymentTypeToFinly = (paymentType: string): PaymentMethod | undefined => {
  const typeLower = paymentType.toLowerCase();
  
  if (typeLower.includes('cash')) {
    return 'cash';
  }
  if (typeLower.includes('credit')) {
    return 'credit_card';
  }
  if (typeLower.includes('debit')) {
    return 'debit_card';
  }
  if (typeLower.includes('transfer')) {
    return 'bank_transfer';
  }
  if (typeLower.includes('check')) {
    return 'check';
  }
  
  return undefined;
};

/**
 * Parse CSV content into WalletCSVRow objects
 */
const parseCSV = (csvContent: string): WalletCSVRow[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(';').map(h => h.trim());
  const rows: WalletCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    if (values.length !== headers.length) {
      console.warn(`Skipping row ${i + 1}: column count mismatch`);
      continue;
    }
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    rows.push(row as WalletCSVRow);
  }
  
  return rows;
};

/**
 * Transform Wallet CSV row to Finly expense/income
 */
const transformWalletRow = (row: WalletCSVRow, existingExpenses: Expense[]): { expense?: Expense; income?: { amount: number; date: string; description: string } } | null => {
  // Skip transfer rows (they're internal transfers between accounts)
  if (row.transfer === 'true') {
    return null;
  }
  
  const amount = parseFloat(row.amount);
  if (isNaN(amount) || amount === 0) {
    return null;
  }
  
  const date = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
  
  // Check for duplicates (same amount, date, and description)
  const isDuplicate = existingExpenses.some(exp => {
    const expDate = new Date(exp.date).toISOString().split('T')[0];
    const rowDate = date.split('T')[0];
    return (
      Math.abs(exp.amount - Math.abs(amount)) < 0.01 &&
      expDate === rowDate &&
      exp.description.toLowerCase() === (row.note || '').toLowerCase()
    );
  });
  
  if (isDuplicate) {
    return null; // Skip duplicate
  }
  
  const description = row.note || row.payee || `${row.category} - ${row.account}`;
  
  if (row.type === 'Income') {
    return {
      income: {
        amount: Math.abs(amount),
        date,
        description: `Imported: ${description}`,
      },
    };
  } else {
    return {
      expense: {
        id: `imported_${Date.now()}_${Math.random()}`, // Temporary ID, will be replaced by API
        amount: Math.abs(amount),
        category: mapWalletCategoryToFinly(row.category),
        description: `Imported: ${description}`,
        date,
        paymentMethod: mapWalletPaymentTypeToFinly(row.payment_type),
      },
    };
  }
};

/**
 * Import CSV file content with progress callback
 */
export const importWalletCSV = async (
  csvContent: string,
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void
): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  try {
    // Parse CSV
    const rows = parseCSV(csvContent);
    const totalRows = rows.length;
    
    // Get existing expenses to check for duplicates
    const existingExpenses = await apiService.getExpenses();
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    // Process each row with progress updates
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const transformed = transformWalletRow(row, existingExpenses);
        
        if (!transformed) {
          skipped++;
        } else {
          if (transformed.expense) {
            // Create expense
            await apiService.createExpense({
              amount: transformed.expense.amount,
              category: transformed.expense.category,
              description: transformed.expense.description,
              date: transformed.expense.date,
              paymentMethod: transformed.expense.paymentMethod,
            });
            imported++;
          } else if (transformed.income) {
            // Create income transaction
            await addIncomeTransaction({
              incomeSourceId: 'csv_import',
              amount: transformed.income.amount,
              date: transformed.income.date,
              description: transformed.income.description,
              autoAdded: false,
            });
            imported++;
          }
        }
        
        // Update progress
        if (onProgress) {
          const current = i + 1;
          const percentage = Math.round((current / totalRows) * 100);
          onProgress({ current, total: totalRows, percentage });
        }
      } catch (error: any) {
        errors.push(`Row ${row.date}: ${error.message || 'Unknown error'}`);
        skipped++;
        
        // Still update progress even on error
        if (onProgress) {
          const current = i + 1;
          const percentage = Math.round((current / totalRows) * 100);
          onProgress({ current, total: totalRows, percentage });
        }
      }
    }
    
    return { imported, skipped, errors };
  } catch (error: any) {
    throw new Error(`Failed to import CSV: ${error.message}`);
  }
};

/**
 * Validate CSV format (basic check)
 */
export const validateWalletCSV = (csvContent: string): { valid: boolean; error?: string } => {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'CSV file must have at least a header row and one data row' };
    }
    
    const headers = lines[0].split(';').map(h => h.trim());
    const requiredHeaders = ['account', 'category', 'currency', 'amount', 'type', 'date'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        return { valid: false, error: `Missing required column: ${required}` };
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
};

