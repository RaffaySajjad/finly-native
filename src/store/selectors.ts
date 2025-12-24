/**
 * Redux Selectors with reselect for memoization
 * Purpose: Optimize Redux state selection and prevent unnecessary re-renders
 * Follows: Performance best practices, memoization patterns
 */

import { createSelector } from 'reselect';
import { RootState } from './index';
import { Expense } from '../types';

// ============== Auth Selectors ==============

export const selectAuth = (state: RootState) => state.auth;

export const selectUser = createSelector(
  [selectAuth],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [selectAuth],
  (auth) => !!auth.token
);

export const selectAuthLoading = createSelector(
  [selectAuth],
  (auth) => auth.isLoading
);

// ============== Categories Selectors ==============

export const selectCategoriesState = (state: RootState) => state.categories;

export const selectAllCategories = createSelector(
  [selectCategoriesState],
  (categories) => categories.categories
);

export const selectCategoriesLoading = createSelector(
  [selectCategoriesState],
  (categories) => categories.isLoading
);

// Memoized selector for categories with spending data
export const selectCategoriesWithSpending = createSelector(
  [selectAllCategories],
  (categories) => 
    categories.map(cat => {
      const totalSpent = cat.totalSpent || 0;
      return {
        ...cat,
        spendingPercentage: cat.budgetLimit ? (totalSpent / cat.budgetLimit) * 100 : 0,
        remainingBudget: cat.budgetLimit ? cat.budgetLimit - totalSpent : 0,
      };
    })
);

// Sort categories by total spent (descending)
export const selectTopSpendingCategories = createSelector(
  [selectCategoriesWithSpending],
  (categories) => 
    [...categories].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
);

// ============== Expenses Selectors ==============

export const selectExpensesState = (state: RootState) => state.expenses;

export const selectAllExpenses = createSelector(
  [selectExpensesState],
  (expenses) => expenses.expenses
);

export const selectExpensesLoading = createSelector(
  [selectExpensesState],
  (expenses) => expenses.isLoading
);

// Get expenses for current month
export const selectCurrentMonthExpenses = createSelector(
  [selectAllExpenses],
  (expenses) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });
  }
);

// Calculate total expenses for current month
export const selectCurrentMonthTotal = createSelector(
  [selectCurrentMonthExpenses],
  (expenses) => expenses.reduce((sum, expense) => sum + expense.amount, 0)
);

// Get expenses grouped by category
export const selectExpensesByCategory = createSelector(
  [selectAllExpenses, selectAllCategories],
  (expenses, categories) => {
    const grouped: Record<string, { category: any; expenses: Expense[]; total: number }> = {};
    
    categories.forEach(category => {
      grouped[category.id] = {
        category,
        expenses: [],
        total: 0,
      };
    });
    
    expenses.forEach(expense => {
      if (expense.categoryId && grouped[expense.categoryId]) {
        grouped[expense.categoryId].expenses.push(expense);
        grouped[expense.categoryId].total += expense.amount;
      }
    });
    
    return grouped;
  }
);

// Get recent expenses (last 10)
export const selectRecentExpenses = createSelector(
  [selectAllExpenses],
  (expenses) => 
    [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
);

// ============== Insights Selectors ==============

export const selectInsightsState = (state: RootState) => state.insights;

export const selectAllInsights = createSelector(
  [selectInsightsState],
  (insights) => insights.insights
);

export const selectInsightsLoading = createSelector(
  [selectInsightsState],
  (insights) => insights.isLoading
);

// Get insights by type (warnings first, then tips)
export const selectPriorityInsights = createSelector(
  [selectAllInsights],
  (insights) => 
    [...insights].sort((a, b) => {
      const typeOrder = { warning: 3, savings: 2, achievement: 1, tip: 0 };
      return typeOrder[b.type] - typeOrder[a.type];
    })
);

// ============== Subscription Selectors ==============

export const selectSubscriptionState = (state: RootState) => state.subscription;

export const selectIsPremium = createSelector(
  [selectSubscriptionState],
  (state) => state.subscription.tier === 'PREMIUM'
);

export const selectSubscriptionDetails = createSelector(
  [selectSubscriptionState],
  (state) => ({
    tier: state.subscription.tier,
    startDate: state.subscription.startDate,
    endDate: state.subscription.endDate,
    trialEndDate: state.subscription.trialEndDate,
  })
);

// ============== Combined Selectors ==============

// Dashboard data selector
export const selectDashboardData = createSelector(
  [
    selectCurrentMonthTotal,
    selectTopSpendingCategories,
    selectRecentExpenses,
    selectPriorityInsights,
  ],
  (totalSpent, topCategories, recentExpenses, insights) => ({
    totalSpent,
    topCategories: topCategories.slice(0, 5),
    recentExpenses,
    topInsight: insights[0],
  })
);

// Analytics data selector
export const selectAnalyticsData = createSelector(
  [selectExpensesByCategory, selectCurrentMonthTotal, selectAllCategories],
  (expensesByCategory, monthTotal, categories) => ({
    categoryBreakdown: Object.values(expensesByCategory).map(item => ({
      ...item,
      percentage: monthTotal ? (item.total / monthTotal) * 100 : 0,
    })),
    totalSpent: monthTotal,
    categoriesCount: categories.length,
  })
);

