/* API Service for Finly app
 * Purpose: Handles expense, category, income, and analytics operations using backend API
*/

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Expense,
  Category,
  Insight,
  MonthlyStats,
  Receipt,
  IncomeSource,
  IncomeTransaction,
  UnifiedTransaction,
  PaginatedInsightsResponse
} from '../types';
import { api, apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Category API Service
 */
export const apiService = {
  /**
   * Initialize API service (no-op for backend API)
   * @deprecated - No longer needed with real backend
   */
  async initialize(): Promise<void> {
    // No initialization needed for backend API
    return Promise.resolve();
  },

  /**
   * Initialize user data (no-op for backend API)
   * @deprecated - No longer needed with real backend
   */
  async initializeUser(userId: string): Promise<void> {
    // No initialization needed for backend API
    return Promise.resolve();
  },
  /**
   * Get all categories with current month spending
   * @param skipCache - Whether to skip cache and fetch fresh data
   */
  async getCategories(skipCache: boolean = false): Promise<Category[]> {
    try {
      const response = await api.get<Category[]>(
        API_ENDPOINTS.CATEGORIES.LIST,
        { skipCache }
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch categories'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get categories error:', error);
      throw error;
    }
  },

  /**
   * Setup default categories for new users
   */
  async setupDefaultCategories(): Promise<Category[]> {
    try {
      const response = await api.post<Category[]>(
        API_ENDPOINTS.CATEGORIES.SETUP_DEFAULTS
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to setup categories'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Setup default categories error:', error);
      throw error;
    }
  },

  /**
   * Check if user has completed category setup
   */
  async hasCategorySetupCompleted(): Promise<boolean> {
    try {
      const response = await api.get<{ completed: boolean }>(
        API_ENDPOINTS.CATEGORIES.SETUP_STATUS
      );
      if (!response.success) {
        return false;
      }
      return response.data?.completed || false;
    } catch (error) {
      console.error('[API] Check category setup error:', error);
      return false;
    }
  },

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    icon: string;
    color: string;
    budgetLimit?: number;
  }): Promise<Category> {
    try {
      const response = await api.post<Category>(
        API_ENDPOINTS.CATEGORIES.LIST,
        data
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create category');
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Create category error:', error);
      throw error;
    }
  },

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      budgetLimit?: number | null;
      isActive?: boolean;
    }
  ): Promise<Category> {
    try {
      const response = await api.put<Category>(
        API_ENDPOINTS.CATEGORIES.DETAIL.replace(':id', categoryId),
        data
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update category');
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Update category error:', error);
      throw error;
    }
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const response = await api.delete(
        API_ENDPOINTS.CATEGORIES.DETAIL.replace(':id', categoryId)
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('[API] Delete category error:', error);
      throw error;
    }
  },

  /**
   * Get all expenses with optional filtering
   */
  async getExpenses(options?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<Expense[]> {
    try {
      const params: Record<string, string> = {};
      if (options?.startDate)
        params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();
      if (options?.categoryId) params.categoryId = options.categoryId;
      if (options?.limit) params.limit = options.limit.toString();
      if (options?.cursor) params.cursor = options.cursor;

      const response = await api.get<Expense[]>(
        API_ENDPOINTS.EXPENSES.LIST,
        params
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch expenses');
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get expenses error:', error);
      throw error;
    }
  },

  /**
   * Get expenses with pagination
   * @param options - Pagination options
   * @returns Paginated expenses response
   */
  async getExpensesPaginated(options?: {
    categoryId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    expenses: Expense[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
      total: number;
    };
  }> {
    try {
      const params: Record<string, string> = {};
      if (options?.categoryId) params.categoryId = options.categoryId;
      if (options?.limit) params.limit = options.limit.toString();
      if (options?.cursor) params.cursor = options.cursor;

      console.log('[API] getExpensesPaginated called with:', {
        categoryId: options?.categoryId,
        limit: options?.limit,
        cursor: options?.cursor,
        params
      });

      // Skip cache for category-specific requests to ensure fresh data
      // Cache key might not properly differentiate categoryId in some cases
      const skipCache = !!options?.categoryId;

      // Backend returns: { success: true, data: [...expenses...], pagination: {...} }
      // We need to access the raw axios response because api.get extracts response.data
      // which loses the pagination metadata when cached data is an array
      // Use apiClient directly to bypass the api.get wrapper and get the full response
      const axiosResponse = await apiClient.get<{
        success: boolean;
        data: Expense[];
        pagination: {
          hasMore: boolean;
          nextCursor: string | null;
          total: number;
        };
      }>(API_ENDPOINTS.EXPENSES.LIST, { params });

      // Axios response structure: axiosResponse.data = { success: true, data: [...], pagination: {...} }
      const backendResponse = axiosResponse.data;

      if (!backendResponse.success) {
        throw new Error('Failed to fetch expenses');
      }

      console.log('[API] getExpensesPaginated parsed:', {
        expensesCount: backendResponse.data?.length || 0,
        pagination: backendResponse.pagination,
        hasData: !!backendResponse.data,
        hasPagination: !!backendResponse.pagination
      });

      return {
        expenses: backendResponse.data || [],
        pagination: backendResponse.pagination || {
          hasMore: false,
          nextCursor: null,
          total: 0
        }
      };
    } catch (error) {
      console.error('[API] Get paginated expenses error:', error);
      throw error;
    }
  },

  /**
   * Get expenses for the current month
   */
  async getMonthlyExpenses(): Promise<Expense[]> {
    try {
      const response = await api.get<Expense[]>(API_ENDPOINTS.EXPENSES.MONTHLY);
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch monthly expenses'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get monthly expenses error:', error);
      throw error;
    }
  },

  /**
   * Create a new expense
   */
  async addExpense(data: {
    amount: number;
    categoryId: string;
    description: string;
    date?: Date;
    paymentMethod?: string;
    notes?: string;
    tags?: string[]; // Array of tag IDs
    originalAmount?: number;
    originalCurrency?: string;
  }): Promise<Expense> {
    try {
      const response = await api.post<Expense>(API_ENDPOINTS.EXPENSES.LIST, {
        ...data,
        date: data.date || new Date()
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create expense');
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Add expense error:', error);
      throw error;
    }
  },

  /**
   * Update an existing expense
   */
  async updateExpense(
    expenseId: string,
    data: {
      amount?: number;
      categoryId?: string;
      description?: string;
      date?: Date;
      paymentMethod?: string;
      notes?: string;
      tags?: string[]; // Array of tag IDs
      originalAmount?: number;
      originalCurrency?: string;
    }
  ): Promise<Expense> {
    try {
      const response = await api.put<Expense>(
        API_ENDPOINTS.EXPENSES.DETAIL.replace(':id', expenseId),
        data
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update expense');
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Update expense error:', error);
      throw error;
    }
  },

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string): Promise<void> {
    try {
      const response = await api.delete(
        API_ENDPOINTS.EXPENSES.DETAIL.replace(':id', expenseId)
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('[API] Delete expense error:', error);
      throw error;
    }
  },

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(skipCache: boolean = false): Promise<MonthlyStats> {
    try {
      const response = await api.get<MonthlyStats>(
        API_ENDPOINTS.ANALYTICS.STATS,
        { skipCache }
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch stats');
      }
      return (
        response.data || {
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          savings: 0,
          savingsRate: 0
        }
      );
    } catch (error) {
      console.error('[API] Get monthly stats error:', error);
      throw error;
    }
  },

  /**
   * Get AI-powered insights with pagination
   * @param limit - Number of insights to fetch (default: 20)
   * @param cursor - Cursor for pagination (ISO date string)
   * @param includeRead - Whether to include read insights (default: true)
   * @param forceRefresh - Force refresh by generating new insights (default: false)
   */
  async getInsights(options?: {
    limit?: number;
    cursor?: string;
    includeRead?: boolean;
    forceRefresh?: boolean;
  }): Promise<PaginatedInsightsResponse> {
    try {
      const params: Record<string, string> = {};
      if (options?.limit) params.limit = options.limit.toString();
      if (options?.cursor) params.cursor = options.cursor;
      if (options?.includeRead === false) params.includeRead = 'false';
      if (options?.forceRefresh) params.forceRefresh = 'true';

      // Skip cache when forceRefresh is true
      const skipCache = options?.forceRefresh === true;

      const response = await api.get<
        | {
            insights: Insight[];
            pagination: {
              hasMore: boolean;
              nextCursor: string | null;
              total: number;
            };
          }
        | Insight[]
      >(API_ENDPOINTS.ANALYTICS.INSIGHTS, { params, skipCache });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch insights');
      }

      // Handle both old cached format (array) and new paginated format
      if (Array.isArray(response.data)) {
        // Old format - convert to new format
        return {
          insights: response.data,
          pagination: {
            hasMore: false,
            nextCursor: null,
            total: response.data.length
          }
        };
      }

      return {
        insights: response.data?.insights || [],
        pagination: response.data?.pagination || {
          hasMore: false,
          nextCursor: null,
          total: 0
        }
      };
    } catch (error) {
      console.error('[API] Get insights error:', error);
      throw error;
    }
  },

  /**
   * Get AI-powered balance insights
   */
  async getBalanceInsights(balanceData: {
    dailyBalances: Array<{ date: string; balance: number }>;
    monthlyBalances: Array<{
      month: string;
      balance: number;
      income: number;
      expenses: number;
    }>;
    projection: {
      endOfMonth: number;
      daysRemaining: number;
      dailySpendingRate: number;
      isPositive: boolean;
    };
  }): Promise<
    Array<{
      id: string;
      type: 'info' | 'warning' | 'success';
      title: string;
      description: string;
      icon: string;
    }>
  > {
    try {
      const response = await api.post<
        Array<{
          id: string;
          type: 'info' | 'warning' | 'success';
          title: string;
          description: string;
          icon: string;
        }>
      >(API_ENDPOINTS.AI.BALANCE_INSIGHTS, {
        balanceData
      });
      if (!response.success || !response.data) {
        return [];
      }
      return response.data;
    } catch (error) {
      console.error('[API] Get balance insights error:', error);
      return [];
    }
  },

  /**
   * Get daily spending data
   */
  async getDailySpending(): Promise<Array<{ date: string; amount: number }>> {
    try {
      const response = await api.get<Array<{ date: string; amount: number }>>(
        API_ENDPOINTS.ANALYTICS.DAILY_SPENDING
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch daily spending'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get daily spending error:', error);
      throw error;
    }
  },

  /**
   * Get spending trend (this week vs last week)
   */
  async getSpendingTrend(): Promise<{
    thisWeek: number;
    lastWeek: number;
    change: number;
    changePercentage: number;
  }> {
    try {
      const response = await api.get<{
        thisWeek: number;
        lastWeek: number;
        change: number;
        changePercentage: number;
      }>(API_ENDPOINTS.ANALYTICS.TREND);
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch spending trend'
        );
      }
      return (
        response.data || {
          thisWeek: 0,
          lastWeek: 0,
          change: 0,
          changePercentage: 0
        }
      );
    } catch (error) {
      console.error('[API] Get spending trend error:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive spending trends data for Trends screen
   * Combines daily spending, category totals, weekly comparison, and top category
   */
  async getSpendingTrends(skipCache: boolean = false): Promise<{
    dailySpending: Array<{ date: string; amount: number }>;
    categoryTotals: Array<{ category: string; amount: number; color: string }>;
    weeklyComparison: {
      thisWeek: number;
      lastWeek: number;
      percentChange: number;
    };
    topCategory: { name: string; amount: number; emoji: string };
  }> {
    try {
      const [
        dailySpendingResponse,
        trendResponse,
        statsResponse,
        categoryTotalsResponse
      ] = await Promise.all([
        api.get<Array<{ date: string; amount: number }>>(
          API_ENDPOINTS.ANALYTICS.DAILY_SPENDING,
          { skipCache }
        ),
        api.get<{
          thisWeek: number;
          lastWeek: number;
          change: number;
          changePercentage: number;
        }>(API_ENDPOINTS.ANALYTICS.TREND, { skipCache }),
        api.get<MonthlyStats>(API_ENDPOINTS.ANALYTICS.STATS, { skipCache }),
        api.get<{
          total: number;
          byCategory: Array<{
            categoryId: string;
            categoryName: string;
            categoryColor: string;
            amount: number;
          }>;
        }>(API_ENDPOINTS.EXPENSES.STATS_MONTHLY, { skipCache })
      ]);

      const dailySpending =
        dailySpendingResponse.success && dailySpendingResponse.data
          ? dailySpendingResponse.data
          : [];

      const trend =
        trendResponse.success && trendResponse.data
          ? trendResponse.data
          : { thisWeek: 0, lastWeek: 0, change: 0, changePercentage: 0 };

      const stats =
        statsResponse.success && statsResponse.data ? statsResponse.data : null;

      const categoryTotals =
        categoryTotalsResponse.success && categoryTotalsResponse.data
          ? categoryTotalsResponse.data.byCategory.map(cat => ({
              category: cat.categoryName,
              amount: cat.amount,
              color: cat.categoryColor
            }))
          : [];

      // Map emoji for top category (simple mapping)
      const getCategoryEmoji = (categoryName: string): string => {
        const name = categoryName.toLowerCase();
        if (
          name.includes('food') ||
          name.includes('restaurant') ||
          name.includes('dining')
        )
          return '🍔';
        if (
          name.includes('transport') ||
          name.includes('car') ||
          name.includes('gas')
        )
          return '🚗';
        if (name.includes('shopping') || name.includes('store')) return '🛍️';
        if (
          name.includes('entertainment') ||
          name.includes('movie') ||
          name.includes('game')
        )
          return '🎬';
        if (
          name.includes('health') ||
          name.includes('medical') ||
          name.includes('pharmacy')
        )
          return '🏥';
        if (
          name.includes('utility') ||
          name.includes('electric') ||
          name.includes('water')
        )
          return '⚡';
        if (
          name.includes('bills') ||
          name.includes('rent') ||
          name.includes('mortgage')
        )
          return '📄';
        return '💰';
      };

      // Top category needs to be derived from categoryTotals
      const topCategoryData = categoryTotals.reduce(
        (max, cat) => (cat.amount > max.amount ? cat : max),
        categoryTotals[0] || { category: 'None', amount: 0, color: '#000000' }
      );

      const topCategory =
        categoryTotals.length > 0
          ? {
              name: topCategoryData.category,
              amount: topCategoryData.amount,
              emoji: getCategoryEmoji(topCategoryData.category)
            }
          : { name: 'None', amount: 0, emoji: '📊' };

      return {
        dailySpending,
        categoryTotals,
        weeklyComparison: {
          thisWeek: trend.thisWeek,
          lastWeek: trend.lastWeek,
          percentChange: trend.changePercentage
        },
        topCategory
      };
    } catch (error) {
      console.error('[API] Get spending trends error:', error);
      throw error;
    }
  },

  /**
   * Get budget status
   */
  async getBudgetStatus(): Promise<{
    onTrack: number;
    overBudget: number;
    noBudget: number;
    total: number;
  }> {
    try {
      const response = await api.get<{
        onTrack: number;
        overBudget: number;
        noBudget: number;
        total: number;
      }>(API_ENDPOINTS.ANALYTICS.BUDGET_STATUS);
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch budget status'
        );
      }
      return (
        response.data || {
          onTrack: 0,
          overBudget: 0,
          noBudget: 0,
          total: 0
        }
      );
    } catch (error) {
      console.error('[API] Get budget status error:', error);
      throw error;
    }
  },

  /**
   * Get income sources
   */
  async getIncomeSources(): Promise<any[]> {
    try {
      const response = await api.get<any[]>(API_ENDPOINTS.INCOME.SOURCES);
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch income sources'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get income sources error:', error);
      throw error;
    }
  },

  /**
   * Create an income source
   */
  async createIncomeSource(data: {
    name: string;
    amount: number;
    frequency: string;
    startDate: string | Date;
    dayOfMonth?: number;
    dayOfWeek?: number;
    customDates?: number[];
    autoAdd?: boolean;
  }): Promise<any> {
    try {
      // Convert Date to ISO string if needed
      const payload = {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
      };
      const response = await api.post<any>(API_ENDPOINTS.INCOME.SOURCES, payload);
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to create income source'
        );
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Create income source error:', error);
      throw error;
    }
  },

  /**
   * Update an income source
   */
  async updateIncomeSource(sourceId: string, data: any): Promise<any> {
    try {
      const response = await api.put<any>(
        API_ENDPOINTS.INCOME.SOURCES + `/${sourceId}`,
        data
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to update income source'
        );
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Update income source error:', error);
      throw error;
    }
  },

  /**
   * Delete an income source
   */
  async deleteIncomeSource(sourceId: string): Promise<void> {
    try {
      const response = await api.delete(
        API_ENDPOINTS.INCOME.SOURCES + `/${sourceId}`
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to delete income source'
        );
      }
    } catch (error) {
      console.error('[API] Delete income source error:', error);
      throw error;
    }
  },

  /**
   * Get income transactions
   */
  async getIncomeTransactions(options?: {
    startDate?: Date;
    endDate?: Date;
    incomeSourceId?: string;
  }): Promise<any[]> {
    try {
      const params: Record<string, string> = {};
      if (options?.startDate)
        params.startDate = options.startDate.toISOString();
      if (options?.endDate) params.endDate = options.endDate.toISOString();
      if (options?.incomeSourceId)
        params.incomeSourceId = options.incomeSourceId;

      const response = await api.get<any[]>(
        API_ENDPOINTS.INCOME.TRANSACTIONS,
        params
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch income transactions'
        );
      }
      return response.data || [];
    } catch (error) {
      console.error('[API] Get income transactions error:', error);
      throw error;
    }
  },

  /**
   * Create a manual income transaction
   */
  async createIncomeTransaction(data: {
    amount: number;
    date: string | Date; // Accept both ISO string or Date object
    description: string;
    incomeSourceId?: string;
    originalAmount?: number;
    originalCurrency?: string;
  }): Promise<any> {
    try {
      // Convert date to ISO string if it's a Date object
      const dateValue =
        data.date instanceof Date ? data.date.toISOString() : data.date;

      const response = await api.post<any>(API_ENDPOINTS.INCOME.TRANSACTIONS, {
        ...data,
        date: dateValue
      });
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to create income transaction'
        );
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Create income transaction error:', error);
      throw error;
    }
  },

  /**
   * Update an income transaction
   */
  async updateIncomeTransaction(
    transactionId: string,
    data: {
      amount?: number;
      date?: string | Date;
      description?: string;
      incomeSourceId?: string;
      originalAmount?: number;
      originalCurrency?: string;
    }
  ): Promise<any> {
    try {
      // Convert date to ISO string if it's a Date object
      const dateValue =
        data.date instanceof Date ? data.date.toISOString() : data.date;

      const response = await api.put<any>(
        API_ENDPOINTS.INCOME.TRANSACTIONS + `/${transactionId}`,
        {
          ...data,
          ...(dateValue && { date: dateValue })
        }
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to update income transaction'
        );
      }
      return response.data!;
    } catch (error) {
      console.error('[API] Update income transaction error:', error);
      throw error;
    }
  },

  /**
   * Delete an income transaction
   */
  async deleteIncomeTransaction(transactionId: string): Promise<void> {
    try {
      const response = await api.delete(
        API_ENDPOINTS.INCOME.TRANSACTIONS + `/${transactionId}`
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to delete income transaction'
        );
      }
    } catch (error) {
      console.error('[API] Delete income transaction error:', error);
      throw error;
    }
  },

  /**
   * Get monthly income total
   */
  async getMonthlyIncomeTotal(): Promise<number> {
    try {
      const response = await api.get<{ total: number }>(
        API_ENDPOINTS.INCOME.STATS_MONTHLY
      );
      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch monthly income'
        );
      }
      return response.data?.total || 0;
    } catch (error) {
      console.error('[API] Get monthly income error:', error);
      throw error;
    }
  },

  /**
   * Create multiple expenses in batch
   */
  async addExpensesBatch(data: {
    expenses: Array<{
      amount: number;
      categoryId: string;
      description: string;
      date: Date;
      paymentMethod?: string;
      notes?: string;
      tags?: string[];
    }>;
  }): Promise<Expense[]> {
    try {
      const response = await api.post<{ expenses: Expense[] }>(
        API_ENDPOINTS.EXPENSES.BATCH,
        data
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create expenses');
      }
      return response.data?.expenses || [];
    } catch (error) {
      console.error('[API] Add expenses batch error:', error);
      throw error;
    }
  },

  /**
   * Get unified transactions (income and expenses)
   * @param options - Query options including limit, date range, type, and includeTotal
   * @returns Transactions array, or object with transactions and total if includeTotal is true
   */
  async getUnifiedTransactions(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    type?: 'expense' | 'income' | 'all';
    includeTotal?: boolean;
  }): Promise<
    UnifiedTransaction[] | { transactions: UnifiedTransaction[]; total: number }
  > {
    try {
      const params: any = {};
      if (options?.startDate) params.startDate = options.startDate;
      if (options?.endDate) params.endDate = options.endDate;
      if (options?.limit) params.limit = options.limit.toString();
      if (options?.type) params.type = options.type;
      if (options?.includeTotal) params.includeTotal = 'true';

      // Backend returns paginated format: { data: [], pagination: { total } }
      // Use apiClient directly to access pagination metadata
      const axiosResponse = await apiClient.get<{
        success: boolean;
        data: UnifiedTransaction[];
        pagination?: {
          hasMore: boolean;
          nextCursor: string | null;
          total: number;
        };
      }>(API_ENDPOINTS.ANALYTICS.TRANSACTIONS, { params });

      const backendResponse = axiosResponse.data;

      if (!backendResponse.success) {
        throw new Error('Failed to fetch unified transactions');
      }

      const transactions = backendResponse.data || [];
      const total = backendResponse.pagination?.total;

      // If includeTotal is requested or limit is provided, return with total
      if (options?.includeTotal || (options?.limit && total !== undefined)) {
        return {
          transactions,
          total: total ?? transactions.length
        };
      }

      return transactions;
    } catch (error) {
      console.error('[API] Get unified transactions error:', error);
      throw error;
    }
  },

  /**
   * Get unified transactions with pagination
   * @param options - Pagination options
   * @returns Paginated unified transactions response
   */
  async getUnifiedTransactionsPaginated(options?: {
    startDate?: string;
    endDate?: string;
    type?: 'expense' | 'income' | 'all';
    limit?: number;
    cursor?: string;
  }): Promise<{
    transactions: UnifiedTransaction[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
      total: number;
    };
  }> {
    try {
      const params: Record<string, string> = {};
      if (options?.startDate) params.startDate = options.startDate;
      if (options?.endDate) params.endDate = options.endDate;
      if (options?.type) params.type = options.type;
      if (options?.limit) params.limit = options.limit.toString();
      if (options?.cursor) params.cursor = options.cursor;

      console.log('[API] getUnifiedTransactionsPaginated called with:', {
        startDate: options?.startDate,
        endDate: options?.endDate,
        type: options?.type,
        limit: options?.limit,
        cursor: options?.cursor,
        params
      });

      // Use apiClient directly to bypass the api.get wrapper and get the full response
      // This ensures we get pagination metadata even when cached data might be an array
      const axiosResponse = await apiClient.get<{
        success: boolean;
        data: UnifiedTransaction[];
        pagination: {
          hasMore: boolean;
          nextCursor: string | null;
          total: number;
        };
      }>(API_ENDPOINTS.ANALYTICS.TRANSACTIONS, { params });

      // Axios response structure: axiosResponse.data = { success: true, data: [...], pagination: {...} }
      const backendResponse = axiosResponse.data;

      if (!backendResponse.success) {
        throw new Error('Failed to fetch unified transactions');
      }

      console.log('[API] getUnifiedTransactionsPaginated parsed:', {
        transactionsCount: backendResponse.data?.length || 0,
        pagination: backendResponse.pagination,
        hasData: !!backendResponse.data,
        hasPagination: !!backendResponse.pagination
      });

      return {
        transactions: backendResponse.data || [],
        pagination: backendResponse.pagination || {
          hasMore: false,
          nextCursor: null,
          total: 0
        }
      };
    } catch (error) {
      console.error('[API] Get paginated unified transactions error:', error);
      throw error;
    }
  },

  /**
   * Upload and process a receipt (placeholder for future implementation)
   */
  async uploadReceipt(imageUri: string): Promise<Receipt> {
    // TODO: Implement when receipt endpoint is ready
    throw new Error('Receipt upload not yet implemented');
  },

  /**
   * Adjust user's starting balance
   */
  async adjustBalance(
    balance: number,
    description?: string
  ): Promise<{ startingBalance: number }> {
    try {
      const response = await api.put<{ startingBalance: number }>(
        API_ENDPOINTS.AUTH.UPDATE_BALANCE,
        {
          balance
        }
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to adjust balance');
      }
      return response.data || { startingBalance: balance };
    } catch (error) {
      console.error('[API] Adjust balance error:', error);
      throw error;
    }
  },

  /**
   * Get exchange rate from USD to display currency
   */
  async getExchangeRate(toCurrency: string): Promise<number> {
    try {
      const response = await api.get<{
        rate: number;
        from: string;
        to: string;
      }>(API_ENDPOINTS.CURRENCY.EXCHANGE_RATE, {
        params: { to: toCurrency }
      });
      if (!response.success) {
        console.error(
          '[API] Exchange rate API returned error:',
          response.error
        );
        throw new Error(
          response.error?.message || 'Failed to get exchange rate'
        );
      }
      // Backend returns { success: true, data: { rate, from, to } }
      // api.get returns ApiResponse<T>, so response is { success: true, data?: T }
      // So response.data is { rate, from, to } | undefined
      let rate = response.data?.rate;

      // Defensive check: if rate is not found, log the full response for debugging
      if (!rate || rate <= 0 || isNaN(rate)) {
        console.error('[API] Invalid exchange rate received:', {
          rate,
          responseData: response.data,
          fullResponse: response,
          toCurrency
        });
        return 1;
      }

      // Log the exchange rate clearly for debugging
      console.log(
        `[API] ✅ Exchange rate fetched: 1 USD = ${rate} ${toCurrency}`
      );
      console.log(`[API] Response structure:`, {
        success: response.success,
        data: response.data,
        rate: rate,
        toCurrency: toCurrency
      });
      return rate;
    } catch (error) {
      console.error('[API] Get exchange rate error:', error);
      // Return 1 as fallback to avoid breaking the app
      return 1;
    }
  },
  /**
   * Get spending forecast
   * @param forceRefresh - Force refresh even if rate limited (default: false)
   */
  async getSpendingForecast(forceRefresh: boolean = false): Promise<{
    predictedAmount: number;
    confidence: 'high' | 'medium' | 'low';
    factors: string[];
    rateLimit?: {
      remaining: number;
      resetAt: number;
    };
  }> {
    const CACHE_KEY = '@finly_forecast_cache';
    const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

    try {
      // 1. Check cache first
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_DURATION;
          
          if (!isExpired) {
            console.log('[API] Returning cached forecast');
            return data;
          }
        }
      }

      // 2. Fetch fresh data
      const params = forceRefresh ? { forceRefresh: 'true' } : {};
      const response = await api.get<{
        predictedAmount: number;
        confidence: 'high' | 'medium' | 'low';
        factors: string[];
        rateLimit?: {
          remaining: number;
          resetAt: number;
        };
      }>(API_ENDPOINTS.ANALYTICS.FORECAST, params);

      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to fetch spending forecast'
        );
      }

      const data = response.data || {
        predictedAmount: 0,
        confidence: 'low',
        factors: []
      };

      // 3. Update cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    } catch (error) {
      console.error('[API] Get spending forecast error:', error);
      
      // Fallback to cache if API fails, even if expired
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          console.warn('[API] Using expired cache due to API error');
          return JSON.parse(cached).data;
        }
      } catch (e) {
        // Ignore cache error
      }

      return {
        predictedAmount: 0,
        confidence: 'low',
        factors: []
      };
    }
  },

  /**
   * Delete all user data but keep the account
   */
  async deleteAllData(): Promise<void> {
    try {
      const response = await api.delete(API_ENDPOINTS.AUTH.DELETE_ALL_DATA);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete all data');
      }
    } catch (error) {
      console.error('[API] Delete all data error:', error);
      throw error;
    }
  }
};

export default apiService;
