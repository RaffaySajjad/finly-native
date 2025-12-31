/**
 * Income Service
 * Purpose: Manages income sources and automatic income scheduling
 * Features: Multiple income sources, recurring schedules, manual income tracking
 * Uses backend API for persistence
 */

import { IncomeSource, IncomeFrequency, IncomeTransaction } from '../types';
import { apiService } from './api';

/**
 * Get all income sources for the current user
 */
export const getIncomeSources = async (): Promise<IncomeSource[]> => {
  try {
    const sources = await apiService.getIncomeSources();
    return sources;
  } catch (error) {
    console.error('Error loading income sources:', error);
    return [];
  }
};

/**
 * Create a new income source
 */
export const createIncomeSource = async (source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<IncomeSource> => {
  try {
    // Start date is already a string in the input type
    const startDate = source.startDate;
    
    const newSource = await apiService.createIncomeSource({
      name: source.name,
      amount: source.amount,
      frequency: source.frequency,
      startDate: startDate,
      dayOfMonth: source.dayOfMonth,
      dayOfWeek: source.dayOfWeek,
      customDates: source.customDates,
      autoAdd: source.autoAdd,
      originalAmount: source.originalAmount ?? undefined,
      originalCurrency: source.originalCurrency ?? undefined
    });
    return newSource;
  } catch (error) {
    console.error('Error creating income source:', error);
    throw error;
  }
};

/**
 * Update an existing income source
 */
export const updateIncomeSource = async (sourceId: string, updates: Partial<Omit<IncomeSource, 'id' | 'createdAt'>>): Promise<IncomeSource> => {
  try {
    // Start date is already a string in the input type
    const startDate = updates.startDate;
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (updates.dayOfMonth !== undefined) updateData.dayOfMonth = updates.dayOfMonth;
    if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
    if (updates.customDates !== undefined) updateData.customDates = updates.customDates;
    if (updates.autoAdd !== undefined) updateData.autoAdd = updates.autoAdd;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.originalAmount !== undefined)
      updateData.originalAmount = updates.originalAmount;
    if (updates.originalCurrency !== undefined)
      updateData.originalCurrency = updates.originalCurrency;
    
    const updatedSource = await apiService.updateIncomeSource(sourceId, updateData);
    return updatedSource;
  } catch (error) {
    console.error('Error updating income source:', error);
    throw error;
  }
};

/**
 * Delete an income source
 */
export const deleteIncomeSource = async (sourceId: string): Promise<void> => {
  try {
    await apiService.deleteIncomeSource(sourceId);
  } catch (error) {
    console.error('Error deleting income source:', error);
    throw error;
  }
};

/**
 * Get income transactions (for manual income entries)
 */
export const getIncomeTransactions = async (options?: {
  startDate?: Date;
  endDate?: Date;
  incomeSourceId?: string;
}): Promise<IncomeTransaction[]> => {
  try {
    const transactions = await apiService.getIncomeTransactions(options);
    return transactions;
  } catch (error) {
    console.error('Error loading income transactions:', error);
    return [];
  }
};

/**
 * Add a manual income transaction
 */
export const addIncomeTransaction = async (transaction: Omit<IncomeTransaction, 'id' | 'createdAt' | 'userId'>): Promise<IncomeTransaction> => {
  try {
    // Date is already a string in the input type
    const date = transaction.date;
    
    const newTransaction = await apiService.createIncomeTransaction({
      amount: transaction.amount,
      date: date,
      description: transaction.description,
      incomeSourceId: transaction.incomeSourceId,
    });
    return newTransaction;
  } catch (error) {
    console.error('Error creating income transaction:', error);
    throw error;
  }
};

/**
 * Calculate total income for a given period
 */
export const calculateIncomeForPeriod = async (
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const sources = await getIncomeSources();
  // Get transactions for the period from backend
  const transactions = await getIncomeTransactions({
    startDate,
    endDate,
  });
  let total = 0;

  // Calculate from auto-scheduled income sources
  for (const source of sources) {
    if (!source.autoAdd) continue;

    const dates = getIncomeDatesForPeriod(source, startDate, endDate);
    total += dates.length * source.amount;
  }

  // Add manual income transactions in the period (already filtered by backend)
  total += transactions.reduce((sum, t) => sum + t.amount, 0);

  return total;
};

/**
 * Get dates when income should be added for a source within a period
 */
const getIncomeDatesForPeriod = (
  source: IncomeSource,
  startDate: Date,
  endDate: Date
): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sourceStart = new Date(source.startDate);

  if (sourceStart > end) return dates; // Source hasn't started yet

  let currentDate = sourceStart > start ? new Date(sourceStart) : new Date(start);

  while (currentDate <= end) {
    if (matchesFrequency(currentDate, source)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Check if a date matches the income source frequency
 */
const matchesFrequency = (date: Date, source: IncomeSource): boolean => {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  switch (source.frequency) {
    case 'WEEKLY':
      return source.dayOfWeek !== undefined && dayOfWeek === source.dayOfWeek;
    case 'BIWEEKLY':
      // Simple biweekly: every 14 days from start date
      const startDate = new Date(source.startDate);
      const diffDays = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % 14 === 0;
    case 'MONTHLY':
      return source.dayOfMonth !== undefined && dayOfMonth === source.dayOfMonth;
    case 'CUSTOM':
      // Custom dates: check if day of month matches any in customDates array
      return source.customDates !== undefined && source.customDates.includes(dayOfMonth);
    case 'MANUAL':
      return false; // Manual handled separately
    default:
      return false;
  }
};

/**
 * Check for income that should be auto-added today
 */
export const checkAndAddScheduledIncome = async (): Promise<void> => {
  const sources = await getIncomeSources();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const source of sources) {
    if (!source.autoAdd) continue;

    const sourceStart = new Date(source.startDate);
    if (sourceStart > today) continue; // Source hasn't started

    if (matchesFrequency(today, source)) {
      // Check if already added today - query backend for today's transactions
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const transactions = await getIncomeTransactions({
        startDate: todayStart,
        endDate: todayEnd,
        incomeSourceId: source.id,
      });
      
      const alreadyAdded = transactions.some(t => t.autoAdded);

      if (!alreadyAdded) {
        await addIncomeTransaction({
          incomeSourceId: source.id,
          amount: source.amount,
          date: today.toISOString(),
          description: source.name,
          autoAdded: true,
        });
      }
    }
  }
};

