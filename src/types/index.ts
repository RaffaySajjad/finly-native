/**
 * TypeScript type definitions for Finly app
 * Purpose: Centralized type definitions for type safety across the application
 */

export type ThemeMode = 'light' | 'dark';

export type CategoryType = 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'utilities' | 'other';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'other';

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: CategoryType;
  description: string;
  date: string;
  paymentMethod?: PaymentMethod;
  tags?: string[]; // Array of tag IDs
}

export type IncomeFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom'
  | 'manual';

export interface IncomeSource {
  id: string;
  name: string; // e.g., "Salary", "Freelance", "Side Gig"
  amount: number;
  frequency: IncomeFrequency;
  startDate: string; // ISO date string
  dayOfMonth?: number; // For monthly: 1-31
  dayOfWeek?: number; // For weekly: 0-6 (Sunday-Saturday)
  customDates?: number[]; // For custom: array of days of month (e.g., [15, 30] for 15th and 30th)
  autoAdd: boolean; // Whether to automatically add income on schedule
  createdAt: string;
  updatedAt: string;
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

export type SubscriptionTier = 'free' | 'premium';

export interface Subscription {
  tier: SubscriptionTier;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  trialEndDate?: string;
  isTrial: boolean;
}

export interface UsageLimits {
  receiptScans: {
    used: number;
    limit: number;
    resetDate: string;
  };
  insights: {
    used: number;
    limit: number;
    resetDate: string;
  };
  categories: {
    used: number;
    limit: number;
  };
}

export interface Receipt {
  id: string;
  imageUri: string;
  extractedData?: {
    merchant: string;
    date: string;
    total: number;
    tax?: number;
    tip?: number;
    items?: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  };
  category?: CategoryType;
  expenseId?: string;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  merchantPattern: string;
  category: CategoryType;
  isActive: boolean;
}
