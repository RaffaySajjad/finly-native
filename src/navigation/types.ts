/**
 * Navigation type definitions
 * Purpose: Type-safe navigation parameters for React Navigation
 */

import { Expense, UnifiedTransaction } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  IncomeSetup: undefined;
  MainTabs: undefined;
  AddExpense: { expense?: Partial<Expense> } | undefined;
  AddIncome: undefined;
  ReceiptUpload: undefined;
  TransactionDetails: { transaction: UnifiedTransaction };
  CategoryDetails: { categoryId: string };
  Subscription: undefined;
  VoiceTransaction: undefined;
  BulkTransaction: undefined;
  PrivacySettings: undefined;
  PrivacyPolicy: undefined;
  ReceiptGallery: undefined;
  Analytics: undefined;
  BalanceHistory: undefined;
  TransactionsList: undefined;
  CategoryOnboarding: undefined;
  IncomeManagement: undefined;
  CSVImport: { firstTime?: boolean } | undefined;
  ExportTransactions: undefined;
  AIAssistant:
    | {
        context?: {
          transactionId?: string;
          categoryId?: string;
          screen?: string;
        };
        initialQuery?: string;
        threadId?: string;
      }
    | undefined;
  DevMenu: undefined;
  Insights: undefined;
  Settings: undefined;
  Trends: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  Trends: undefined;
  AIAssistant: undefined;
  Settings: undefined;
  Insights: undefined;
};
