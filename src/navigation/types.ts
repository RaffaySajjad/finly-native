/**
 * Navigation type definitions
 * Purpose: Type-safe navigation parameters for React Navigation
 */

import { Expense, CategoryType } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
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
  AIAssistant:
    | {
        context?: {
          transactionId?: string;
          categoryId?: CategoryType;
          screen?: string;
        };
        initialQuery?: string;
      }
    | undefined;
  Insights: undefined;
  Settings: undefined;
  Trends: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Categories: undefined;
  AIAssistant: undefined;
  Settings: undefined;
  Insights: undefined;
};

