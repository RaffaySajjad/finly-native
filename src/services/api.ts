/**
 * API Service for Finly app
 * Purpose: Handles all API calls with mock data for demonstration
 * Includes dynamic budget calculations, AI insights, and AsyncStorage persistence
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Expense,
  Category,
  Insight,
  MonthlyStats,
  User,
  CategoryType
} from '../types';

// Mock API base URL (replace with real API later)
const API_BASE_URL = 'https://api.finly.mock/v1';

// AsyncStorage keys
const STORAGE_KEYS = {
  EXPENSES: '@finly_expenses',
  CATEGORIES: '@finly_categories',
  STATS: '@finly_stats',
};

/**
 * Creates axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    config => {
      // Add auth token here when implemented
      return config;
    },
    error => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      console.error('API Error:', error.message);
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

/**
 * Mock data for demonstration
 */

// Initial mock expenses data
let mockExpenses: Expense[] = [
  {
    id: '1',
    amount: 42.50,
    category: 'food',
    description: 'Lunch at Cafe Luna',
    date: new Date().toISOString(),
    type: 'expense',
  },
  {
    id: '2',
    amount: 15.00,
    category: 'transport',
    description: 'Uber to work',
    date: new Date(Date.now() - 86400000).toISOString(),
    type: 'expense',
  },
  {
    id: '3',
    amount: 89.99,
    category: 'shopping',
    description: 'New running shoes',
    date: new Date(Date.now() - 172800000).toISOString(),
    type: 'expense',
  },
  {
    id: '4',
    amount: 3500.00,
    category: 'other',
    description: 'Monthly salary',
    date: new Date(Date.now() - 259200000).toISOString(),
    type: 'income',
  },
  {
    id: '5',
    amount: 28.75,
    category: 'entertainment',
    description: 'Movie tickets',
    date: new Date(Date.now() - 345600000).toISOString(),
    type: 'expense',
  },
];

// Initial mock categories data
let mockCategories: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'food', color: '#F59E0B', totalSpent: 485.50, budgetLimit: 600 },
  { id: 'transport', name: 'Transportation', icon: 'car', color: '#3B82F6', totalSpent: 120.00, budgetLimit: 200 },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: '#EC4899', totalSpent: 289.99, budgetLimit: 400 },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie', color: '#8B5CF6', totalSpent: 95.75, budgetLimit: 150 },
  { id: 'health', name: 'Health', icon: 'heart-pulse', color: '#10B981', totalSpent: 0, budgetLimit: 100 },
  { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt', color: '#6366F1', totalSpent: 0, budgetLimit: 300 },
  { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#6B7280', totalSpent: 50.00 },
];

// Initial mock stats
let mockStats: MonthlyStats = {
  totalIncome: 3500.00,
  totalExpenses: 1041.24,
  balance: 2458.76,
  savings: 420.00,
  savingsRate: 12,
};

// Mock user data
const mockUser: User = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex@finly.app',
  currency: 'USD'
};

/**
 * Storage utilities
 */
const storage = {
  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.EXPENSES,
        JSON.stringify(expenses)
      );
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  },

  async loadExpenses(): Promise<Expense[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading expenses:', error);
      return null;
    }
  },

  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify(categories)
      );
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  },

  async loadCategories(): Promise<Category[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading categories:', error);
      return null;
    }
  },

  async saveStats(stats: MonthlyStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  },

  async loadStats(): Promise<MonthlyStats | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading stats:', error);
      return null;
    }
  }
};

/**
 * Internal helper functions
 */

/**
 * Recalculates budget usage for all categories based on current expenses
 */
const updateBudgets = (): void => {
  // Reset all category spending
  mockCategories.forEach(cat => {
    cat.totalSpent = 0;
  });

  // Calculate spending per category
  mockExpenses.forEach(expense => {
    if (expense.type === 'expense') {
      const category = mockCategories.find(cat => cat.id === expense.category);
      if (category) {
        category.totalSpent += expense.amount;
      }
    }
  });

  // Save updated categories
  storage.saveCategories(mockCategories);
};

/**
 * Recalculates monthly statistics based on current expenses
 */
const updateStats = (): MonthlyStats => {
  const totalIncome = mockExpenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = mockExpenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savings = balance > 0 ? balance * 0.2 : 0; // Assume 20% savings goal
  const savingsRate =
    totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  mockStats = {
    totalIncome,
    totalExpenses,
    balance,
    savings,
    savingsRate
  };

  storage.saveStats(mockStats);
  return mockStats;
};

/**
 * Generates dynamic AI insights based on current spending patterns
 * Now with personality and achievement tracking
 */
const generateAIInsights = (): Insight[] => {
  const insights: Insight[] = [];

  // AI Personality intro messages (rotate these)
  const personalityIntros = [
    "Let's save smartly this week 👀",
    "Time to check in on your finances! 💰",
    "Hey there, money master! 🌟",
    "Your financial assistant here! 👋",
  ];

  // Check for achievements/streaks
  const allRecentExpenses = mockExpenses.filter(e => e.type === 'expense');
  const last7Days = allRecentExpenses.filter(e => {
    const daysDiff = (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  // Achievement: 7-day budget streak
  const budgetCategoriesForStreakCheck = mockCategories.filter(c => c.budgetLimit);
  const allUnderBudget = budgetCategoriesForStreakCheck.every(c => 
    c.budgetLimit && c.totalSpent <= c.budgetLimit
  );
  
  if (allUnderBudget && budgetCategoriesForStreakCheck.length > 0) {
    insights.push({
      id: 'streak_achievement',
      type: 'achievement',
      title: '🏆 Budget Master Streak!',
      description: '7 days under budget across all categories. You\'re crushing it!',
      icon: 'trophy-award',
      color: '#F59E0B',
    });
  }

  // Trend-aware insights (week-over-week comparisons)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = mockExpenses.filter(e => 
    e.type === 'expense' && new Date(e.date) >= sevenDaysAgo
  );
  
  const lastWeek = mockExpenses.filter(e => {
    const date = new Date(e.date);
    return e.type === 'expense' && date >= fourteenDaysAgo && date < sevenDaysAgo;
  });

  // Entertainment trend
  const entertainmentThisWeek = thisWeek.filter(e => e.category === 'entertainment')
    .reduce((sum, e) => sum + e.amount, 0);
  const entertainmentLastWeek = lastWeek.filter(e => e.category === 'entertainment')
    .reduce((sum, e) => sum + e.amount, 0);

  if (entertainmentLastWeek > 0) {
    const entertainmentChange = ((entertainmentThisWeek - entertainmentLastWeek) / entertainmentLastWeek) * 100;
    if (entertainmentChange > 25) {
      insights.push({
        id: 'entertainment_trend',
        type: 'warning',
        title: '📈 Entertainment Spike',
        description: `Your entertainment spending increased by ${Math.round(entertainmentChange)}% this week. ${personalityIntros[0]}`,
        icon: 'chart-line',
        color: '#8B5CF6',
      });
    } else if (entertainmentChange < -20) {
      insights.push({
        id: 'entertainment_improvement',
        type: 'achievement',
        title: '🎯 Entertainment Savings!',
        description: `You cut entertainment costs by ${Math.abs(Math.round(entertainmentChange))}% this week. Well done!`,
        icon: 'trending-down',
        color: '#10B981',
      });
    }
  }

  // Analyze spending by category
  const foodCategory = mockCategories.find(c => c.id === 'food');
  const transportCategory = mockCategories.find(c => c.id === 'transport');
  const shoppingCategory = mockCategories.find(c => c.id === 'shopping');
  const entertainmentCategory = mockCategories.find(
    c => c.id === 'entertainment'
  );

  // Food spending insights
  if (foodCategory) {
    if (
      foodCategory.budgetLimit &&
      foodCategory.totalSpent > foodCategory.budgetLimit * 0.8
    ) {
      const remaining = foodCategory.budgetLimit - foodCategory.totalSpent;
      insights.push({
        id: 'food_budget',
        type: 'warning',
        title: 'Food Budget Alert',
        description: `You're approaching your food budget limit. $${remaining.toFixed(
          2
        )} remaining.`,
        icon: 'alert-circle',
        color: '#EF4444'
      });
    } else if (foodCategory.totalSpent > 100) {
      const potentialSavings = foodCategory.totalSpent * 0.3;
      insights.push({
        id: 'food_savings',
        type: 'savings',
        title: `Save $${potentialSavings.toFixed(0)} this month`,
        description:
          'You could save by cooking at home more often instead of dining out.',
        amount: potentialSavings,
        icon: 'lightbulb-on',
        color: '#10B981'
      });
    }
  }

  // Transport spending insights
  if (transportCategory && transportCategory.totalSpent > 0) {
    const weeklyAverage = transportCategory.totalSpent / 4;
    if (weeklyAverage > 50) {
      insights.push({
        id: 'transport_tip',
        type: 'tip',
        title: 'Transport Optimization',
        description: `Your weekly transport costs are $${weeklyAverage.toFixed(
          2
        )}. Consider carpooling or public transit.`,
        icon: 'car',
        color: '#3B82F6'
      });
    } else if (
      transportCategory.budgetLimit &&
      transportCategory.totalSpent < transportCategory.budgetLimit * 0.5
    ) {
      insights.push({
        id: 'transport_achievement',
        type: 'achievement',
        title: 'Great job! 🎉',
        description: `You're spending less on transportation. Keep it up!`,
        icon: 'trophy',
        color: '#F59E0B'
      });
    }
  }

  // Shopping insights
  if (shoppingCategory && shoppingCategory.totalSpent > 200) {
    insights.push({
      id: 'shopping_warning',
      type: 'warning',
      title: 'High Shopping Expenses',
      description: `You've spent $${shoppingCategory.totalSpent.toFixed(
        2
      )} on shopping this month. Consider reviewing your purchases.`,
      icon: 'shopping',
      color: '#EC4899'
    });
  }

  // Overall savings insights
  const savingsRate = mockStats.savingsRate;
  if (savingsRate < 15) {
    insights.push({
      id: 'savings_tip',
      type: 'tip',
      title: 'Smart Saving Tip',
      description: `Try to save at least 20% of your income. You're currently at ${savingsRate}%.`,
      icon: 'brain',
      color: '#8B5CF6'
    });
  } else if (savingsRate >= 20) {
    insights.push({
      id: 'savings_achievement',
      type: 'achievement',
      title: 'Excellent Savings! 🌟',
      description: `You're saving ${savingsRate}% of your income. You're on track to meet your financial goals!`,
      icon: 'trophy',
      color: '#10B981'
    });
  }

  // Budget tracking insights
  const budgetCategories = mockCategories.filter(c => c.budgetLimit);
  const onTrackCount = budgetCategories.filter(
    c => c.budgetLimit && c.totalSpent <= c.budgetLimit
  ).length;

  if (onTrackCount === budgetCategories.length) {
    insights.push({
      id: 'budget_achievement',
      type: 'achievement',
      title: 'All Budgets on Track! 🎯',
      description:
        "You're staying within budget for all categories. Excellent financial discipline!",
      icon: 'check-circle',
      color: '#10B981'
    });
  }

  // Recent spending trend
  const latest5Expenses = mockExpenses
    .filter(e => e.type === 'expense')
    .slice(0, 5);

  if (latest5Expenses.length >= 3) {
    const avgRecent =
      latest5Expenses.reduce((sum, e) => sum + e.amount, 0) /
      latest5Expenses.length;
    if (avgRecent < 30) {
      insights.push({
        id: 'spending_achievement',
        type: 'achievement',
        title: 'Smart Spending Streak',
        description:
          'Your recent transactions show mindful spending. Keep up the good work!',
        icon: 'star',
        color: '#F59E0B'
      });
    }
  }

  // Return unique insights (max 4)
  return insights.slice(0, 4);
};

/**
 * API Service methods
 */
export const apiService = {
  /**
   * Initialize app data from storage
   */
  async initialize(): Promise<void> {
    try {
      const [savedExpenses, savedCategories, savedStats] = await Promise.all([
        storage.loadExpenses(),
        storage.loadCategories(),
        storage.loadStats()
      ]);

      if (savedExpenses) mockExpenses = savedExpenses;
      if (savedCategories) mockCategories = savedCategories;
      if (savedStats) mockStats = savedStats;

      // Update budgets and stats in case data is stale
      updateBudgets();
      updateStats();
    } catch (error) {
      console.error('Error initializing app data:', error);
    }
  },

  /**
   * Fetches all expenses for the current user
   */
  async getExpenses(): Promise<Expense[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  /**
   * Creates a new expense
   */
  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString()
    };
    mockExpenses.unshift(newExpense);

    // Update budgets and stats
    updateBudgets();
    updateStats();

    // Persist to storage
    await storage.saveExpenses(mockExpenses);

    return newExpense;
  },

  /**
   * Edits an existing expense
   */
  async editExpense(
    id: string,
    updatedExpense: Partial<Omit<Expense, 'id'>>
  ): Promise<Expense> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const index = mockExpenses.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Expense not found');
    }

    mockExpenses[index] = {
      ...mockExpenses[index],
      ...updatedExpense
    };

    // Update budgets and stats
    updateBudgets();
    updateStats();

    // Persist to storage
    await storage.saveExpenses(mockExpenses);

    return mockExpenses[index];
  },

  /**
   * Deletes an expense by ID
   */
  async deleteExpense(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockExpenses.findIndex(e => e.id === id);
    if (index > -1) {
      mockExpenses.splice(index, 1);

      // Update budgets and stats
      updateBudgets();
      updateStats();

      // Persist to storage
      await storage.saveExpenses(mockExpenses);
    }
  },

  /**
   * Fetches all expense categories with updated budgets
   */
  async getCategories(): Promise<Category[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    updateBudgets(); // Ensure budgets are current
    return [...mockCategories];
  },

  /**
   * Fetches AI-generated insights based on current spending
   */
  async getInsights(): Promise<Insight[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return generateAIInsights();
  },

  /**
   * Fetches monthly statistics
   */
  async getMonthlyStats(): Promise<MonthlyStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return updateStats();
  },

  /**
   * Fetches current user profile
   */
  async getUser(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockUser;
  },

  /**
   * Mock AI expense generator
   */
  async mockAIExpense(): Promise<Expense> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const aiGeneratedExpenses = [
      {
        amount: 42.5,
        category: 'food' as CategoryType,
        description: '🤖 Coffee & breakfast at Cafe Luna',
        type: 'expense' as const
      },
      {
        amount: 89.99,
        category: 'shopping' as CategoryType,
        description: '🤖 Amazon package delivery',
        type: 'expense' as const
      },
      {
        amount: 15.0,
        category: 'transport' as CategoryType,
        description: '🤖 Uber ride to downtown',
        type: 'expense' as const
      },
      {
        amount: 12.5,
        category: 'entertainment' as CategoryType,
        description: '🤖 Netflix subscription',
        type: 'expense' as const
      },
      {
        amount: 65.0,
        category: 'health' as CategoryType,
        description: '🤖 Pharmacy - vitamins',
        type: 'expense' as const
      }
    ];

    const randomExpense =
      aiGeneratedExpenses[
        Math.floor(Math.random() * aiGeneratedExpenses.length)
      ];

    const newExpense: Expense = {
      ...randomExpense,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };

    mockExpenses.unshift(newExpense);

    // Update budgets and stats
    updateBudgets();
    updateStats();

    // Persist to storage
    await storage.saveExpenses(mockExpenses);

    return newExpense;
  },

  /**
   * Mock receipt OCR extraction
   * Simulates extracting data from a receipt image
   */
  async extractReceiptData(imageUri: string): Promise<Omit<Expense, 'id' | 'date'>> {
    // Simulate OCR processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 600 + 1200));

    // Mock receipt data variations
    const mockReceipts = [
      {
        amount: 5.75,
        category: 'food' as CategoryType,
        description: 'Starbucks - Latte and croissant',
        type: 'expense' as const,
      },
      {
        amount: 45.30,
        category: 'food' as CategoryType,
        description: 'Whole Foods Market - Groceries',
        type: 'expense' as const,
      },
      {
        amount: 18.99,
        category: 'transport' as CategoryType,
        description: 'Shell Gas Station - Fuel',
        type: 'expense' as const,
      },
      {
        amount: 12.50,
        category: 'entertainment' as CategoryType,
        description: 'AMC Theaters - Movie ticket',
        type: 'expense' as const,
      },
      {
        amount: 89.95,
        category: 'shopping' as CategoryType,
        description: 'Nike Store - Running shoes',
        type: 'expense' as const,
      },
      {
        amount: 32.40,
        category: 'food' as CategoryType,
        description: 'Chipotle - Burrito bowl and chips',
        type: 'expense' as const,
      },
      {
        amount: 67.80,
        category: 'health' as CategoryType,
        description: 'CVS Pharmacy - Prescription',
        type: 'expense' as const,
      },
      {
        amount: 125.00,
        category: 'utilities' as CategoryType,
        description: 'Pacific Gas & Electric - Monthly bill',
        type: 'expense' as const,
      },
    ];

    // Return random mock receipt data
    const randomReceipt = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
    return randomReceipt;
  },

  /**
   * Get spending trends for visualization
   * Returns daily, weekly, and category-wise spending data
   */
  async getSpendingTrends(): Promise<{
    dailySpending: Array<{ date: string; amount: number }>;
    categoryTotals: Array<{ category: string; amount: number; color: string }>;
    weeklyComparison: { thisWeek: number; lastWeek: number; percentChange: number };
    topCategory: { name: string; amount: number; emoji: string };
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Calculate daily spending for current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailySpending: Array<{ date: string; amount: number }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate actual spending for this day from mockExpenses
      const dayExpenses = mockExpenses.filter(e => {
        if (e.type !== 'expense') return false;
        const expenseDate = new Date(e.date).toISOString().split('T')[0];
        return expenseDate === dateStr;
      });
      
      const amount = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      dailySpending.push({ date: dateStr, amount });
    }

    // Calculate category totals
    const categoryMap = new Map<string, number>();
    mockExpenses
      .filter(e => e.type === 'expense')
      .forEach(e => {
        const current = categoryMap.get(e.category) || 0;
        categoryMap.set(e.category, current + e.amount);
      });

    const categoryTotals = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      color: mockCategories.find(c => c.id === category)?.color || '#6B7280',
    }));

    // Calculate weekly comparison
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekExpenses = mockExpenses
      .filter(e => e.type === 'expense' && new Date(e.date) >= sevenDaysAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastWeekExpenses = mockExpenses
      .filter(e => {
        const date = new Date(e.date);
        return e.type === 'expense' && date >= fourteenDaysAgo && date < sevenDaysAgo;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const percentChange = lastWeekExpenses > 0
      ? Math.round(((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100)
      : 0;

    // Find top category
    const sortedCategories = [...categoryTotals].sort((a, b) => b.amount - a.amount);
    const topCat = sortedCategories[0] || { category: 'Other', amount: 0 };
    
    const categoryEmojis: Record<string, string> = {
      Food: '🍔',
      Transport: '🚗',
      Shopping: '🛍️',
      Entertainment: '🎬',
      Health: '💊',
      Utilities: '⚡',
      Other: '📦',
    };

    return {
      dailySpending,
      categoryTotals,
      weeklyComparison: {
        thisWeek: thisWeekExpenses,
        lastWeek: lastWeekExpenses,
        percentChange,
      },
      topCategory: {
        name: topCat.category,
        amount: topCat.amount,
        emoji: categoryEmojis[topCat.category] || '📦',
      },
    };
  },
};

export default apiService;
