/**
 * Navigation type definitions
 * Purpose: Type-safe navigation parameters for React Navigation
 */

import { Expense } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  AddExpense: { expense?: Expense } | undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Insights: undefined;
  Profile: undefined;
};

