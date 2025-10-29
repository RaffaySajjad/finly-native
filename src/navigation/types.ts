/**
 * Navigation type definitions
 * Purpose: Type-safe navigation parameters for React Navigation
 */

import { Expense, CategoryType } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  AddExpense: { expense?: Partial<Expense> } | undefined;
  ReceiptUpload: undefined;
  TransactionDetails: { expense: Expense };
  CategoryDetails: { categoryId: CategoryType };
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Insights: undefined;
  Trends: undefined;
  Profile: undefined;
};

