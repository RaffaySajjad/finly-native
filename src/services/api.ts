/**
 * API Service for Finly app
 * Purpose: Handles all API calls with mock data for demonstration
 * Includes dynamic budget calculations, AI insights, and AsyncStorage persistence
 * User-specific data storage - each user has their own data
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Expense,
  Category,
  Insight,
  MonthlyStats,
  User,
  CategoryType,
  Receipt
} from '../types';
import { calculateIncomeForPeriod } from './incomeService';
import {
  getCurrentUserId,
  getStartingBalance,
  setStartingBalance
} from './userService';
import { addIncomeTransaction } from './incomeService';

// Mock API base URL (replace with real API later)
const API_BASE_URL = 'https://api.finly.mock/v1';

// AsyncStorage keys
const STORAGE_KEYS = {
  USER_DATA: '@finly_user_data'
};

// Get user-specific storage key
const getUserStorageKey = (key: string, userId: string): string => {
  return `${key}_${userId}`;
};

/**
 * Creates axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  client.interceptors.request.use(
    config => {
      // Add auth token here when implemented
      return config;
    },
    error => Promise.reject(error)
  );

  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      console.error('API Error:', error.message);
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

/**
 * Default categories template (for new users)
 */
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'food',
    color: '#F59E0B',
    totalSpent: 0,
    budgetLimit: 600
  },
  {
    id: 'transport',
    name: 'Transportation',
    icon: 'car',
    color: '#3B82F6',
    totalSpent: 0,
    budgetLimit: 200
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'shopping',
    color: '#EC4899',
    totalSpent: 0,
    budgetLimit: 400
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'movie',
    color: '#8B5CF6',
    totalSpent: 0,
    budgetLimit: 150
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'heart-pulse',
    color: '#10B981',
    totalSpent: 0,
    budgetLimit: 100
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: 'lightning-bolt',
    color: '#6366F1',
    totalSpent: 0,
    budgetLimit: 300
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'dots-horizontal',
    color: '#6B7280',
    totalSpent: 0
  }
];

/**
 * Default stats template (for new users)
 */
const DEFAULT_STATS: MonthlyStats = {
  totalIncome: 0,
  totalExpenses: 0,
  balance: 0,
  savings: 0,
  savingsRate: 0
};

/**
 * Storage utilities - user-specific
 */
const storage = {
  async saveExpenses(expenses: Expense[], userId: string): Promise<void> {
    try {
      const key = getUserStorageKey('@finly_expenses', userId);
      await AsyncStorage.setItem(key, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  },

  async loadExpenses(userId: string): Promise<Expense[] | null> {
    try {
      const key = getUserStorageKey('@finly_expenses', userId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading expenses:', error);
      return null;
    }
  },

  async saveCategories(categories: Category[], userId: string): Promise<void> {
    try {
      const key = getUserStorageKey('@finly_categories', userId);
      await AsyncStorage.setItem(key, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  },

  async loadCategories(userId: string): Promise<Category[] | null> {
    try {
      const key = getUserStorageKey('@finly_categories', userId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading categories:', error);
      return null;
    }
  },

  async saveStats(stats: MonthlyStats, userId: string): Promise<void> {
    try {
      const key = getUserStorageKey('@finly_stats', userId);
      await AsyncStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  },

  async loadStats(userId: string): Promise<MonthlyStats | null> {
    try {
      const key = getUserStorageKey('@finly_stats', userId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading stats:', error);
      return null;
    }
  },

  /**
   * Initialize user data (called when user signs up or first login)
   */
  async initializeUserData(userId: string): Promise<void> {
    // Check if user already has data
    const existingExpenses = await this.loadExpenses(userId);
    if (existingExpenses !== null) {
      // User already has data, don't initialize
      return;
    }

    // Initialize with empty data for new user
    await this.saveExpenses([], userId);
    await this.saveCategories([...DEFAULT_CATEGORIES], userId);
    await this.saveStats({ ...DEFAULT_STATS }, userId);
  }
};

/**
 * Internal helper functions
 */

/**
 * Recalculates budget usage for all categories based on current expenses
 */
const updateBudgets = (
  expenses: Expense[],
  categories: Category[]
): Category[] => {
  // Reset all category spending
  const updatedCategories = categories.map(cat => ({ ...cat, totalSpent: 0 }));

  // Calculate spending per category (all expenses are expenses now)
  expenses.forEach(expense => {
    const category = updatedCategories.find(cat => cat.id === expense.category);
    if (category) {
      category.totalSpent += expense.amount;
    }
  });

  return updatedCategories;
};

/**
 * Recalculates monthly statistics based on current expenses and income sources
 */
const updateStats = async (expenses: Expense[]): Promise<MonthlyStats> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // Calculate income from income sources for current month (for display)
  const totalIncome = await calculateIncomeForPeriod(startOfMonth, endOfMonth);

  // Filter expenses to only current month (for display)
  const currentMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
  });

  // Calculate total expenses for current month only (for display)
  const totalExpenses = currentMonthExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  // Get starting balance - this is the balance at the start of tracking
  const startingBalance = await getStartingBalance();

  // Calculate ALL income from the very beginning (for balance calculation)
  const allIncomeStart = new Date(0); // From epoch start
  const allIncome = await calculateIncomeForPeriod(allIncomeStart, endOfMonth);

  // Calculate ALL expenses from the very beginning (for balance calculation)
  const allExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Balance = starting balance + ALL income ever - ALL expenses ever
  const balance = startingBalance + allIncome - allExpenses;

  const savings = balance > 0 ? balance * 0.2 : 0; // Assume 20% savings goal
  const savingsRate =
    totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  return {
    totalIncome, // Current month income (for display)
    totalExpenses, // Current month expenses (for display)
    balance, // Cumulative balance (starting + all income - all expenses)
    savings,
    savingsRate
  };
};

/**
 * Generates dynamic AI insights based on current spending patterns
 */
const generateAIInsights = (
  expenses: Expense[],
  categories: Category[],
  stats: MonthlyStats
): Insight[] => {
  const insights: Insight[] = [];

  // AI Personality intro messages (rotate these)
  const personalityIntros = [
    "Let's save smartly this week 👀",
    'Time to check in on your finances! 💰',
    'Hey there, money master! 🌟',
    'Your financial assistant here! 👋'
  ];

  // If no expenses, show welcome message
  if (expenses.length === 0) {
    insights.push({
      id: 'welcome',
      type: 'tip',
      title: 'Welcome to Finly! 👋',
      description:
        'Start tracking your expenses to get personalized insights and tips.',
      icon: 'wallet',
      color: '#3B82F6'
    });
    return insights;
  }

  // Check for achievements/streaks
  const allRecentExpenses = expenses; // All expenses are expenses now
  const last7Days = allRecentExpenses.filter(e => {
    const daysDiff =
      (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  // Achievement: 7-day budget streak
  const budgetCategoriesForStreakCheck = categories.filter(c => c.budgetLimit);
  const allUnderBudget = budgetCategoriesForStreakCheck.every(
    c => c.budgetLimit && c.totalSpent <= c.budgetLimit
  );

  if (
    allUnderBudget &&
    budgetCategoriesForStreakCheck.length > 0 &&
    last7Days.length > 0
  ) {
    insights.push({
      id: 'streak_achievement',
      type: 'achievement',
      title: '🏆 Budget Master Streak!',
      description:
        "7 days under budget across all categories. You're crushing it!",
      icon: 'trophy-award',
      color: '#F59E0B'
    });
  }

  // Trend-aware insights (week-over-week comparisons)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = expenses.filter(e => new Date(e.date) >= sevenDaysAgo);

  const lastWeek = expenses.filter(e => {
    const date = new Date(e.date);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });

  // Entertainment trend
  if (lastWeek.length > 0) {
    const entertainmentThisWeek = thisWeek
      .filter(e => e.category === 'entertainment')
      .reduce((sum, e) => sum + e.amount, 0);
    const entertainmentLastWeek = lastWeek
      .filter(e => e.category === 'entertainment')
      .reduce((sum, e) => sum + e.amount, 0);

    if (entertainmentLastWeek > 0) {
      const entertainmentChange =
        ((entertainmentThisWeek - entertainmentLastWeek) /
          entertainmentLastWeek) *
        100;
      if (entertainmentChange > 25) {
        insights.push({
          id: 'entertainment_trend',
          type: 'warning',
          title: '📈 Entertainment Spike',
          description: `Your entertainment spending increased by ${Math.round(
            entertainmentChange
          )}% this week. ${personalityIntros[0]}`,
          icon: 'chart-line',
          color: '#8B5CF6'
        });
      } else if (entertainmentChange < -20) {
        insights.push({
          id: 'entertainment_improvement',
          type: 'achievement',
          title: '🎯 Entertainment Savings!',
          description: `You cut entertainment costs by ${Math.abs(
            Math.round(entertainmentChange)
          )}% this week. Well done!`,
          icon: 'trending-down',
          color: '#10B981'
        });
      }
    }
  }

  // Analyze spending by category
  const foodCategory = categories.find(c => c.id === 'food');
  const transportCategory = categories.find(c => c.id === 'transport');
  const shoppingCategory = categories.find(c => c.id === 'shopping');

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
  const savingsRate = stats.savingsRate;
  if (stats.totalIncome > 0) {
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
  }

  // Budget tracking insights
  const budgetCategories = categories.filter(c => c.budgetLimit);
  const onTrackCount = budgetCategories.filter(
    c => c.budgetLimit && c.totalSpent <= c.budgetLimit
  ).length;

  if (budgetCategories.length > 0 && onTrackCount === budgetCategories.length) {
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
  const latest5Expenses = expenses.slice(0, 5);

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
   * Initialize user data (call this after login/signup)
   */
  async initializeUser(userId: string): Promise<void> {
    await storage.initializeUserData(userId);
  },

  /**
   * Initialize app data from storage (for existing users)
   */
  async initialize(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return; // No user logged in
      }

      // Initialize user data if needed
      await storage.initializeUserData(userId);
    } catch (error) {
      console.error('Error initializing app data:', error);
    }
  },

  /**
   * Fetches all expenses for the current user
   */
  async getExpenses(): Promise<Expense[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const expenses = await storage.loadExpenses(userId);
    if (!expenses) {
      return [];
    }

    return [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  /**
   * Creates a new expense
   */
  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString()
    };

    const expenses = (await storage.loadExpenses(userId)) || [];
    expenses.unshift(newExpense);

    // Update budgets and stats
    const categories = (await storage.loadCategories(userId)) || [
      ...DEFAULT_CATEGORIES
    ];
    const updatedCategories = updateBudgets(expenses, categories);
    const updatedStats = await updateStats(expenses);

    // Persist to storage
    await storage.saveExpenses(expenses, userId);
    await storage.saveCategories(updatedCategories, userId);
    await storage.saveStats(updatedStats, userId);

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

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Expense not found');
    }

    expenses[index] = {
      ...expenses[index],
      ...updatedExpense
    };

    // Update budgets and stats
    const categories = (await storage.loadCategories(userId)) || [
      ...DEFAULT_CATEGORIES
    ];
    const updatedCategories = updateBudgets(expenses, categories);
    const updatedStats = await updateStats(expenses);

    // Persist to storage
    await storage.saveExpenses(expenses, userId);
    await storage.saveCategories(updatedCategories, userId);
    await storage.saveStats(updatedStats, userId);

    return expenses[index];
  },

  /**
   * Deletes an expense by ID
   */
  async deleteExpense(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    const index = expenses.findIndex(e => e.id === id);
    if (index > -1) {
      expenses.splice(index, 1);

      // Update budgets and stats
      const categories = (await storage.loadCategories(userId)) || [
        ...DEFAULT_CATEGORIES
      ];
      const updatedCategories = updateBudgets(expenses, categories);
      const updatedStats = await updateStats(expenses);

      // Persist to storage
      await storage.saveExpenses(expenses, userId);
      await storage.saveCategories(updatedCategories, userId);
      await storage.saveStats(updatedStats, userId);
    }
  },

  /**
   * Fetches all expense categories with updated budgets
   */
  async getCategories(): Promise<Category[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    let categories = (await storage.loadCategories(userId)) || [];

    // If no categories exist, return empty array (user needs to set up)
    if (categories.length === 0) {
      return [];
    }

    const updatedCategories = updateBudgets(expenses, categories);
    await storage.saveCategories(updatedCategories, userId);
    return updatedCategories;
  },

  /**
   * Set up default categories for new users
   */
  async setupDefaultCategories(): Promise<Category[]> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Check if categories already exist
    const existingCategories = await storage.loadCategories(userId);
    if (existingCategories && existingCategories.length > 0) {
      // User already has categories, return them
      return existingCategories;
    }

    // Set up default categories
    await storage.saveCategories([...DEFAULT_CATEGORIES], userId);
    return [...DEFAULT_CATEGORIES];
  },

  /**
   * Fetches AI-generated insights based on current spending
   */
  async getInsights(): Promise<Insight[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    const categories = (await storage.loadCategories(userId)) || [
      ...DEFAULT_CATEGORIES
    ];
    const stats = (await storage.loadStats(userId)) || { ...DEFAULT_STATS };

    // Recalculate stats to ensure they're current
    const updatedStats = await updateStats(expenses);
    const updatedCategories = updateBudgets(expenses, categories);

    return generateAIInsights(expenses, updatedCategories, updatedStats);
  },

  /**
   * Fetches monthly statistics
   */
  async getMonthlyStats(): Promise<MonthlyStats> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      return { ...DEFAULT_STATS };
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    const stats = await updateStats(expenses);
    await storage.saveStats(stats, userId);
    return stats;
  },

  /**
   * Fetches current user profile
   */
  async getUser(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) {
      const user = JSON.parse(userData);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: 'USD'
      };
    }

    throw new Error('User not found');
  },

  /**
   * Mock AI expense generator
   */
  async mockAIExpense(): Promise<Expense> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const aiGeneratedExpenses = [
      {
        amount: 42.5,
        category: 'food' as CategoryType,
        description: '🤖 Coffee & breakfast at Cafe Luna'
      },
      {
        amount: 89.99,
        category: 'shopping' as CategoryType,
        description: '🤖 Amazon package delivery'
      },
      {
        amount: 15.0,
        category: 'transport' as CategoryType,
        description: '🤖 Uber ride to downtown'
      },
      {
        amount: 12.5,
        category: 'entertainment' as CategoryType,
        description: '🤖 Netflix subscription'
      },
      {
        amount: 65.0,
        category: 'health' as CategoryType,
        description: '🤖 Pharmacy - vitamins'
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

    const expenses = (await storage.loadExpenses(userId)) || [];
    expenses.unshift(newExpense);

    // Update budgets and stats
    const categories = (await storage.loadCategories(userId)) || [
      ...DEFAULT_CATEGORIES
    ];
    const updatedCategories = updateBudgets(expenses, categories);
    const updatedStats = await updateStats(expenses);

    // Persist to storage
    await storage.saveExpenses(expenses, userId);
    await storage.saveCategories(updatedCategories, userId);
    await storage.saveStats(updatedStats, userId);

    return newExpense;
  },

  /**
   * Mock receipt OCR extraction
   * Simulates extracting data from a receipt image
   */
  async extractReceiptData(
    imageUri: string
  ): Promise<Omit<Expense, 'id' | 'date'>> {
    // Simulate OCR processing time
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 600 + 1200)
    );

    // Mock receipt data variations
    const mockReceipts = [
      {
        amount: 5.75,
        category: 'food' as CategoryType,
        description: 'Starbucks - Latte and croissant'
      },
      {
        amount: 45.3,
        category: 'food' as CategoryType,
        description: 'Whole Foods Market - Groceries'
      },
      {
        amount: 18.99,
        category: 'transport' as CategoryType,
        description: 'Shell Gas Station - Fuel'
      },
      {
        amount: 12.5,
        category: 'entertainment' as CategoryType,
        description: 'AMC Theaters - Movie ticket'
      },
      {
        amount: 89.95,
        category: 'shopping' as CategoryType,
        description: 'Nike Store - Running shoes'
      },
      {
        amount: 32.4,
        category: 'food' as CategoryType,
        description: 'Chipotle - Burrito bowl and chips'
      },
      {
        amount: 67.8,
        category: 'health' as CategoryType,
        description: 'CVS Pharmacy - Prescription'
      },
      {
        amount: 125.0,
        category: 'utilities' as CategoryType,
        description: 'Pacific Gas & Electric - Monthly bill'
      }
    ];

    // Return random mock receipt data
    const randomReceipt =
      mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
    return randomReceipt;
  },

  /**
   * Advanced receipt extraction (Premium)
   * Extracts detailed receipt data including merchant, date, items, tax, tip
   */
  async extractReceiptDataAdvanced(imageUri: string): Promise<{
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
    category?: CategoryType;
  }> {
    // Simulate advanced OCR processing time
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 800 + 1500)
    );

    // Mock advanced receipt data with multiple items
    const mockAdvancedReceipts = [
      {
        merchant: 'Starbucks',
        date: new Date().toISOString(),
        total: 12.45,
        tax: 1.05,
        tip: 0,
        items: [
          { name: 'Grande Latte', price: 5.95, quantity: 1 },
          { name: 'Croissant', price: 3.5, quantity: 1 },
          { name: 'Bottle Water', price: 2.95, quantity: 1 }
        ],
        category: 'food' as CategoryType
      },
      {
        merchant: 'Whole Foods Market',
        date: new Date().toISOString(),
        total: 67.89,
        tax: 5.43,
        tip: 0,
        items: [
          { name: 'Organic Chicken Breast', price: 18.99, quantity: 1 },
          { name: 'Organic Spinach', price: 4.99, quantity: 2 },
          { name: 'Organic Eggs', price: 8.99, quantity: 1 },
          { name: 'Organic Bread', price: 5.99, quantity: 1 },
          { name: 'Various Groceries', price: 28.5, quantity: 1 }
        ],
        category: 'food' as CategoryType
      },
      {
        merchant: 'Shell Gas Station',
        date: new Date().toISOString(),
        total: 48.75,
        tax: 3.9,
        tip: 0,
        items: [{ name: 'Regular Gasoline', price: 44.85, quantity: 12.5 }],
        category: 'transport' as CategoryType
      },
      {
        merchant: 'Chipotle Mexican Grill',
        date: new Date().toISOString(),
        total: 14.67,
        tax: 1.17,
        tip: 0,
        items: [
          { name: 'Burrito Bowl', price: 10.95, quantity: 1 },
          { name: 'Chips & Guacamole', price: 2.55, quantity: 1 }
        ],
        category: 'food' as CategoryType
      }
    ];

    const randomReceipt =
      mockAdvancedReceipts[
        Math.floor(Math.random() * mockAdvancedReceipts.length)
      ];
    return randomReceipt;
  },

  /**
   * Get spending trends for visualization
   * Returns daily, weekly, and category-wise spending data
   */
  async getSpendingTrends(): Promise<{
    dailySpending: Array<{ date: string; amount: number }>;
    categoryTotals: Array<{ category: string; amount: number; color: string }>;
    weeklyComparison: {
      thisWeek: number;
      lastWeek: number;
      percentChange: number;
    };
    topCategory: { name: string; amount: number; emoji: string };
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        dailySpending: [],
        categoryTotals: [],
        weeklyComparison: { thisWeek: 0, lastWeek: 0, percentChange: 0 },
        topCategory: { name: 'Other', amount: 0, emoji: '📦' }
      };
    }

    const expenses = (await storage.loadExpenses(userId)) || [];
    const categories = (await storage.loadCategories(userId)) || [
      ...DEFAULT_CATEGORIES
    ];

    // Calculate daily spending for current month
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const dailySpending: Array<{ date: string; amount: number }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];

      // Calculate actual spending for this day from expenses
      const dayExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date).toISOString().split('T')[0];
        return expenseDate === dateStr;
      });

      const amount = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      dailySpending.push({ date: dateStr, amount });
    }

    // Calculate category totals
    const categoryMap = new Map<string, number>();
    expenses.forEach(e => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + e.amount);
    });

    const categoryTotals = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        color: categories.find(c => c.id === category)?.color || '#6B7280'
      })
    );

    // Calculate weekly comparison
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekExpenses = expenses
      .filter(e => new Date(e.date) >= sevenDaysAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastWeekExpenses = expenses
      .filter(e => {
        const date = new Date(e.date);
        return date >= fourteenDaysAgo && date < sevenDaysAgo;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const percentChange =
      lastWeekExpenses > 0
        ? Math.round(
            ((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100
          )
        : 0;

    // Find top category
    const sortedCategories = [...categoryTotals].sort(
      (a, b) => b.amount - a.amount
    );
    const topCat = sortedCategories[0] || { category: 'Other', amount: 0 };

    const categoryEmojis: Record<string, string> = {
      Food: '🍔',
      Transport: '🚗',
      Shopping: '🛍️',
      Entertainment: '🎬',
      Health: '💊',
      Utilities: '⚡',
      Other: '📦'
    };

    return {
      dailySpending,
      categoryTotals,
      weeklyComparison: {
        thisWeek: thisWeekExpenses,
        lastWeek: lastWeekExpenses,
        percentChange
      },
      topCategory: {
        name: topCat.category,
        amount: topCat.amount,
        emoji: categoryEmojis[topCat.category] || '📦'
      }
    };
  },

  /**
   * Adjust balance by updating the starting balance directly
   * This is used when user manually adjusts their balance
   */
  async adjustBalance(newBalance: number, description?: string): Promise<void> {
    const currentStats = await this.getMonthlyStats();
    const currentBalance = currentStats.balance;
    const difference = newBalance - currentBalance;

    if (Math.abs(difference) < 0.01) {
      return; // No change needed
    }

    // Get current starting balance
    const startingBalance = await getStartingBalance();

    // Calculate what the new starting balance should be
    // Current balance = startingBalance + allIncome - allExpenses
    // New balance = newStartingBalance + allIncome - allExpenses
    // So: newStartingBalance = startingBalance + (newBalance - currentBalance)
    const newStartingBalance = startingBalance + difference;

    // Update starting balance directly (don't create a transaction to avoid doubling)
    await setStartingBalance(newStartingBalance);
  }
};

export default apiService;
