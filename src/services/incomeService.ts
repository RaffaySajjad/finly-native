/**
 * Income Service
 * Purpose: Manages income sources and automatic income scheduling
 * Features: Multiple income sources, recurring schedules, manual income tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IncomeSource, IncomeFrequency } from '../types';
import { getCurrentUserId } from './userService';

const INCOME_SOURCES_STORAGE_KEY = '@finly_income_sources';
const INCOME_TRANSACTIONS_STORAGE_KEY = '@finly_income_transactions';

interface IncomeTransaction {
  id: string;
  incomeSourceId: string;
  amount: number;
  date: string;
  description: string;
  autoAdded: boolean; // Whether this was auto-added by scheduler
}

const getUserIncomeSourcesKey = (userId: string): string => `${INCOME_SOURCES_STORAGE_KEY}_${userId}`;
const getUserIncomeTransactionsKey = (userId: string): string => `${INCOME_TRANSACTIONS_STORAGE_KEY}_${userId}`;

/**
 * Get all income sources for the current user
 */
export const getIncomeSources = async (): Promise<IncomeSource[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const key = getUserIncomeSourcesKey(userId);
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading income sources:', error);
    return [];
  }
};

/**
 * Save income sources for the current user
 */
export const saveIncomeSources = async (sources: IncomeSource[]): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const key = getUserIncomeSourcesKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(sources));
  } catch (error) {
    console.error('Error saving income sources:', error);
  }
};

/**
 * Create a new income source
 */
export const createIncomeSource = async (source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeSource> => {
  const newSource: IncomeSource = {
    ...source,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sources = await getIncomeSources();
  sources.push(newSource);
  await saveIncomeSources(sources);
  return newSource;
};

/**
 * Update an existing income source
 */
export const updateIncomeSource = async (sourceId: string, updates: Partial<Omit<IncomeSource, 'id' | 'createdAt'>>): Promise<IncomeSource> => {
  const sources = await getIncomeSources();
  const index = sources.findIndex(s => s.id === sourceId);

  if (index === -1) {
    throw new Error('Income source not found');
  }

  sources[index] = {
    ...sources[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveIncomeSources(sources);
  return sources[index];
};

/**
 * Delete an income source
 */
export const deleteIncomeSource = async (sourceId: string): Promise<void> => {
  const sources = await getIncomeSources();
  const updatedSources = sources.filter(s => s.id !== sourceId);
  await saveIncomeSources(updatedSources);
};

/**
 * Get income transactions (for manual income entries)
 */
export const getIncomeTransactions = async (): Promise<IncomeTransaction[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const key = getUserIncomeTransactionsKey(userId);
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading income transactions:', error);
    return [];
  }
};

/**
 * Add a manual income transaction
 */
export const addIncomeTransaction = async (transaction: Omit<IncomeTransaction, 'id'>): Promise<IncomeTransaction> => {
  const newTransaction: IncomeTransaction = {
    ...transaction,
    id: Date.now().toString(),
  };

  const transactions = await getIncomeTransactions();
  transactions.push(newTransaction);
  
  const userId = await getCurrentUserId();
  if (userId) {
    const key = getUserIncomeTransactionsKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(transactions));
  }

  return newTransaction;
};

/**
 * Calculate total income for a given period
 */
export const calculateIncomeForPeriod = async (
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const sources = await getIncomeSources();
  const transactions = await getIncomeTransactions();
  let total = 0;

  // Calculate from auto-scheduled income sources
  for (const source of sources) {
    if (!source.autoAdd) continue;

    const dates = getIncomeDatesForPeriod(source, startDate, endDate);
    total += dates.length * source.amount;
  }

  // Add manual income transactions in the period
  const periodTransactions = transactions.filter(
    t => {
      const txDate = new Date(t.date);
      return txDate >= startDate && txDate <= endDate;
    }
  );
  total += periodTransactions.reduce((sum, t) => sum + t.amount, 0);

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
      // Check if already added today
      const transactions = await getIncomeTransactions();
      const alreadyAdded = transactions.some(
        t => {
          const txDate = new Date(t.date);
          txDate.setHours(0, 0, 0, 0);
          return txDate.getTime() === today.getTime() && 
                 t.incomeSourceId === source.id && 
                 t.autoAdded;
        }
      );

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

