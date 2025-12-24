/**
 * TypeScript type definitions for Finly app
 * Purpose: Centralized type definitions for type safety across the application
 */

export type ThemeMode = 'light' | 'dark';

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'CHECK'
  | 'BANK_TRANSFER'
  | 'DIGITAL_WALLET'
  | 'OTHER';

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  category: CategoryInfo;
  description: string;
  date: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  tags?: Tag[]; // Array of tag objects (from API)
  createdAt: string;
  updatedAt: string;
  originalAmount?: number;
  originalCurrency?: string;
}

export type IncomeFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'CUSTOM'
  | 'MANUAL';

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
  isActive?: boolean;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeTransaction {
  id: string;
  userId: string;
  incomeSourceId?: string;
  amount: number;
  date: string;
  description: string;
  autoAdded: boolean;
  createdAt: string;
  originalAmount?: number;
  originalCurrency?: string;
}

export interface UnifiedTransaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  date: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  // Expense-specific fields
  category?: CategoryInfo;
  paymentMethod?: PaymentMethod;
  tags?: Tag[];
  notes?: string;
  // Income-specific fields
  incomeSource?: {
    id: string;
    name: string;
  };
  autoAdded?: boolean;
  originalAmount?: number;
  originalCurrency?: string;
}

// Budget type determines how budget is tracked over time
export type BudgetType = 'MONTHLY' | 'ROLLOVER';

// Rollover budget data for sinking fund categories
export interface CategoryRollover {
  accumulatedBudget: number; // Total available to spend (carriedOver + allocatedAmount - spentAmount)
  carriedOver: number; // Amount carried from previous months
  monthlyAllocation: number; // This month's allocation
  monthsAccumulating: number; // How many months have been accumulating
  percentUsed: number; // Percentage of accumulated budget used
}

export interface Category {
  id: string; // UUID string from database
  name: string;
  icon: string;
  color: string;
  totalSpent?: number; // Computed field, may not always be present
  budgetLimit?: number;
  budgetType?: BudgetType; // MONTHLY (default) or ROLLOVER (sinking fund)
  originalAmount?: number; // Budget amount in original currency
  originalCurrency?: string; // Original currency code when budget was set
  userId?: string | null;
  isSystemCategory?: boolean;
  isImportCreated?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Rollover-specific fields (only populated for ROLLOVER type)
  rollover?: CategoryRollover;
}

// Rollover state for a specific month
export interface RolloverState {
  id: string;
  categoryId: string;
  month: string; // ISO date string
  allocatedAmount: number;
  spentAmount: number;
  carriedOver: number;
  totalAvailable: number;
  percentUsed: number;
}

// Budget history entry for tracking changes
export interface BudgetHistoryEntry {
  id: string;
  categoryId: string;
  previousAmount: number | null;
  newAmount: number;
  effectiveFrom: string; // ISO date string
  appliedToCurrentMonth: boolean;
  note: string | null;
  createdAt: string;
}

// Complete rollover summary for a category
export interface RolloverSummary {
  categoryId: string;
  currentMonth: RolloverState;
  totalAccumulated: number;
  monthsAccumulating: number;
  history: BudgetHistoryEntry[];
  monthlyBreakdown: RolloverState[];
}

export type InsightType = 'warning' | 'success' | 'info' | 'achievement' | 'action';

export type InsightCategory = 
  | 'spending_pattern'
  | 'subscription'
  | 'budget'
  | 'saving_opportunity'
  | 'merchant'
  | 'timing'
  | 'comparison'
  | 'goal';

export type InsightActionType =
  | 'reduce_spending'
  | 'cancel_subscription'
  | 'set_budget'
  | 'review_merchant'
  | 'change_timing'
  | 'negotiate_rate'
  | 'switch_provider'
  | 'batch_purchases'
  | 'automate_savings'
  | 'celebrate_win';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  icon: string;
  color: string;
  isRead?: boolean;
  createdAt: string;
  // Enhanced actionable fields
  priority?: number;
  insightCategory?: InsightCategory;
  actionType?: InsightActionType;
  savingsAmount?: number;
  targetEntity?: string;
  actionMetadata?: Record<string, unknown>;
  actionTaken?: boolean;
}

export interface PaginatedInsightsResponse {
  insights: Insight[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    total: number;
  };
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

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export type PaymentState = 'VALID' | 'GRACE_PERIOD' | 'ON_HOLD' | 'PAUSED';

export interface Subscription {
  tier: SubscriptionTier;
  status?: string; // ACTIVE, CANCELED, EXPIRED, TRIAL, PAUSED, GRACE_PERIOD, ON_HOLD
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  trialEndDate?: string;
  isTrial: boolean;
  // Payment state (for Google Play lifecycle)
  paymentState?: PaymentState;
  gracePeriodEndDate?: string | null;
  // Pending plan change
  pendingPlanId?: string | null;
  pendingChangeDate?: string | null;
  // Current plan
  planId?: string | null;
  // Coupon/discount fields (for web signups with FINLY20 code)
  couponCode?: string | null;
  hasPendingDiscount?: boolean;
  discountPercent?: number;
  source?: string;
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
  voiceEntries: {
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
  imageUrl: string;
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
  categoryId?: string;
  expenseId?: string;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  merchantPattern: string;
  categoryId: string;
  isActive: boolean;
}

/**
 * Widget Data Model
 * Purpose: Data structure shared between React Native app and native widgets
 * Used for iOS WidgetKit and Android App Widgets
 */
export interface WidgetData {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currencyCode: string;
  currencySymbol?: string;
  lastUpdated: string; // ISO timestamp
}
