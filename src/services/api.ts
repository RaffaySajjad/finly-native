/**
 * API Service for Finly app
 * Purpose: Handles all API calls with mock data for demonstration
 * Uses axios with retry logic and proper error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Expense, Category, Insight, MonthlyStats, User } from '../types';

// Mock API base URL (replace with real API later)
const API_BASE_URL = 'https://api.finly.mock/v1';

/**
 * Creates axios instance with default configuration
 * Includes timeout, retry logic, and error handling
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for adding auth tokens
  client.interceptors.request.use(
    (config) => {
      // Add auth token here when implemented
      // config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
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
 * These will be replaced with real API calls
 */

// Mock expenses data
const mockExpenses: Expense[] = [
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

// Mock categories data
const mockCategories: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'food', color: '#F59E0B', totalSpent: 485.50, budgetLimit: 600 },
  { id: 'transport', name: 'Transportation', icon: 'car', color: '#3B82F6', totalSpent: 120.00, budgetLimit: 200 },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: '#EC4899', totalSpent: 289.99, budgetLimit: 400 },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie', color: '#8B5CF6', totalSpent: 95.75, budgetLimit: 150 },
  { id: 'health', name: 'Health', icon: 'heart-pulse', color: '#10B981', totalSpent: 0, budgetLimit: 100 },
  { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt', color: '#6366F1', totalSpent: 0, budgetLimit: 300 },
  { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#6B7280', totalSpent: 50.00 },
];

// Mock insights data
const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'savings',
    title: 'Save $180 this month',
    description: 'You could save $180 by cooking at home 5 times this week instead of dining out.',
    amount: 180,
    icon: 'lightbulb-on',
    color: '#10B981',
  },
  {
    id: '2',
    type: 'achievement',
    title: 'Great job! 🎉',
    description: 'You spent 15% less on transportation this month compared to last month.',
    icon: 'trophy',
    color: '#F59E0B',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Budget Alert',
    description: 'You\'re approaching your food budget limit. $114.50 remaining.',
    icon: 'alert-circle',
    color: '#EF4444',
  },
  {
    id: '4',
    type: 'tip',
    title: 'Smart Spending Tip',
    description: 'Consider setting aside 20% of your income for savings. You\'re currently at 12%.',
    icon: 'brain',
    color: '#8B5CF6',
  },
];

// Mock monthly stats
const mockStats: MonthlyStats = {
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
  currency: 'USD',
};

/**
 * API Service methods
 */

export const apiService = {
  /**
   * Fetches all expenses for the current user
   * @returns Promise<Expense[]> Array of expense objects
   */
  getExpenses: async (): Promise<Expense[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockExpenses;
  },

  /**
   * Creates a new expense
   * @param expense Expense data without ID
   * @returns Promise<Expense> Created expense with ID
   */
  createExpense: async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
    };
    mockExpenses.unshift(newExpense);
    return newExpense;
  },

  /**
   * Fetches all expense categories
   * @returns Promise<Category[]> Array of category objects
   */
  getCategories: async (): Promise<Category[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockCategories;
  },

  /**
   * Fetches AI-generated insights
   * @returns Promise<Insight[]> Array of insight objects
   */
  getInsights: async (): Promise<Insight[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockInsights;
  },

  /**
   * Fetches monthly statistics
   * @returns Promise<MonthlyStats> Monthly financial statistics
   */
  getMonthlyStats: async (): Promise<MonthlyStats> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockStats;
  },

  /**
   * Fetches current user profile
   * @returns Promise<User> User profile data
   */
  getUser: async (): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockUser;
  },

  /**
   * Deletes an expense by ID
   * @param id Expense ID to delete
   * @returns Promise<void>
   */
  deleteExpense: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockExpenses.findIndex(e => e.id === id);
    if (index > -1) {
      mockExpenses.splice(index, 1);
    }
  },

  /**
   * Mock AI expense generator
   * Simulates AI-powered expense recognition and categorization
   * @returns Promise<Expense> Auto-generated expense with smart categorization
   */
  mockAIExpense: async (): Promise<Expense> => {
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate AI processing
    
    const aiGeneratedExpenses = [
      {
        amount: 42.50,
        category: 'food' as const,
        description: '🤖 Coffee & breakfast at Cafe Luna',
        type: 'expense' as const,
      },
      {
        amount: 89.99,
        category: 'shopping' as const,
        description: '🤖 Amazon package delivery',
        type: 'expense' as const,
      },
      {
        amount: 15.00,
        category: 'transport' as const,
        description: '🤖 Uber ride to downtown',
        type: 'expense' as const,
      },
      {
        amount: 12.50,
        category: 'entertainment' as const,
        description: '🤖 Netflix subscription',
        type: 'expense' as const,
      },
      {
        amount: 65.00,
        category: 'health' as const,
        description: '🤖 Pharmacy - vitamins',
        type: 'expense' as const,
      },
    ];

    const randomExpense = aiGeneratedExpenses[Math.floor(Math.random() * aiGeneratedExpenses.length)];
    
    const newExpense: Expense = {
      ...randomExpense,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    
    mockExpenses.unshift(newExpense);
    return newExpense;
  },
};

export default apiService;

