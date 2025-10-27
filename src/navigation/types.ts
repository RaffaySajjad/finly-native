/**
 * Navigation type definitions
 * Purpose: Type-safe navigation parameters for React Navigation
 */

import { Expense } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  AddExpense: { expense?: Partial<Expense> } | undefined;
  ReceiptUpload: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Insights: undefined;
  Trends: undefined;
  Profile: undefined;
};

