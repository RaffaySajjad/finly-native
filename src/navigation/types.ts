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
  Onboarding: undefined;
  IncomeSetup: undefined;
  MainTabs: undefined;
  AddExpense: { expense?: Partial<Expense> } | undefined;
  ReceiptUpload: undefined;
  TransactionDetails: { expense: Expense };
  CategoryDetails: { categoryId: CategoryType };
  Subscription: undefined;
  VoiceTransaction: undefined;
  BulkTransaction: undefined;
  PrivacySettings: undefined;
  ReceiptGallery: undefined;
  Analytics: undefined;
  BalanceHistory: undefined;
  TransactionsList: undefined;
  CategoryOnboarding: undefined;
  IncomeManagement: undefined;
  CSVImport: { firstTime?: boolean } | undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Insights: undefined;
  Trends: undefined;
  Profile: undefined;
};

