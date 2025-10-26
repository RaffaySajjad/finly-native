/**
 * TypeScript type definitions for Finly app
 * Purpose: Centralized type definitions for type safety across the application
 */

export type ThemeMode = 'light' | 'dark';

export type CategoryType = 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'utilities' | 'other';

export interface Expense {
  id: string;
  amount: number;
  category: CategoryType;
  description: string;
  date: string;
  type: 'expense' | 'income';
}

export interface Category {
  id: CategoryType;
  name: string;
  icon: string;
  color: string;
  totalSpent: number;
  budgetLimit?: number;
}

export interface Insight {
  id: string;
  type: 'savings' | 'warning' | 'achievement' | 'tip';
  title: string;
  description: string;
  amount?: number;
  icon: string;
  color: string;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savings: number;
  savingsRate: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  avatar?: string;
}

