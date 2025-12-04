/**
 * Widget Sync Service
 * Purpose: Synchronize financial data from React Native app to native widgets
 * Supports iOS WidgetKit and Android App Widgets
 * 
 * Feature Flag: EXPO_PUBLIC_ENABLE_WIDGETS
 * Set to 'true' to enable widgets, 'false' or unset to disable
 * Useful for development with free Apple Developer accounts where App Groups may cause errors
 */

import { NativeModules, Platform } from 'react-native';
import { WidgetData } from '../types';
import { apiService } from './api';
import { getCurrentUserId } from './userService';
import { getStartingBalance } from './userService';

const { WidgetDataSync } = NativeModules;

/**
 * Check if widgets are enabled via environment variable
 * Defaults to false (disabled) if not set
 */
const isWidgetsEnabled = (): boolean => {
  const enableWidgets = process.env.EXPO_PUBLIC_ENABLE_WIDGETS;
  return enableWidgets === 'true' || enableWidgets === '1';
};

/**
 * Check if widget sync is available
 * Returns true only if:
 * 1. Widgets are enabled via EXPO_PUBLIC_ENABLE_WIDGETS env var
 * 2. Native module is available on the platform
 */
export const isWidgetSyncAvailable = (): boolean => {
  if (!isWidgetsEnabled()) {
    return false;
  }
  return WidgetDataSync !== undefined && WidgetDataSync !== null;
};

/**
 * Sync widget data to native storage
 * This function fetches current stats and syncs them to widget-accessible storage
 * @param currencyCode - Currency code (default: 'USD')
 * @param currencySymbol - Currency symbol (default: '$')
 */
export const syncWidgetData = async (
  currencyCode: string = 'USD',
  currencySymbol: string = '$'
): Promise<void> => {
  if (!isWidgetSyncAvailable()) {
    console.log('[WidgetSync] Widget sync not available on this platform');
    return;
  }

  try {
    // Get current user ID
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('[WidgetSync] No user ID found, skipping widget sync');
      return;
    }

    // Fetch current monthly stats
    const stats = await apiService.getMonthlyStats(false);
    
    // Get starting balance
    const startingBalance = await getStartingBalance();
    
    // Calculate current balance (starting balance + income - expenses)
    const currentBalance = startingBalance + stats.totalIncome - stats.totalExpenses;

    const widgetData: WidgetData = {
      balance: currentBalance,
      monthlyIncome: stats.totalIncome,
      monthlyExpenses: stats.totalExpenses,
      currencyCode,
      currencySymbol,
      lastUpdated: new Date().toISOString(),
    };

    console.log('[WidgetSync] Calling native module with data:', {
      balance: widgetData.balance,
      currencyCode: widgetData.currencyCode,
      currencySymbol: widgetData.currencySymbol,
    });

    // Sync to native module
    try {
      if (Platform.OS === 'ios') {
        console.log('[WidgetSync] Calling WidgetDataSync.syncWidgetData (iOS)...');
        await WidgetDataSync.syncWidgetData(widgetData);
        console.log('[WidgetSync] ✅ Native module call completed');
      } else if (Platform.OS === 'android') {
        await WidgetDataSync.syncWidgetData(widgetData);
        console.log('[WidgetSync] ✅ Native module call completed');
      }
    } catch (error) {
      console.error('[WidgetSync] ❌ Native module call failed:', error);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('[WidgetSync] Error syncing widget data:', error);
    // Don't throw - widget sync failures shouldn't break the app
  }
};

/**
 * Sync widget data with custom data
 * Useful when you already have the stats and don't want to fetch again
 */
export const syncWidgetDataWithStats = async (
  stats: {
    totalIncome: number;
    totalExpenses: number;
  },
  currencyCode: string = 'USD',
  currencySymbol: string = '$'
): Promise<void> => {
  if (!isWidgetSyncAvailable()) {
    console.log('[WidgetSync] Widget sync not available on this platform');
    return;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('[WidgetSync] No user ID found, skipping widget sync');
      return;
    }

    // Get starting balance
    const startingBalance = await getStartingBalance();
    
    // Calculate current balance
    const currentBalance = startingBalance + stats.totalIncome - stats.totalExpenses;

    const widgetData: WidgetData = {
      balance: currentBalance,
      monthlyIncome: stats.totalIncome,
      monthlyExpenses: stats.totalExpenses,
      currencyCode,
      currencySymbol,
      lastUpdated: new Date().toISOString(),
    };

    // Sync to native module
    if (Platform.OS === 'ios') {
      await WidgetDataSync.syncWidgetData(widgetData);
    } else if (Platform.OS === 'android') {
      await WidgetDataSync.syncWidgetData(widgetData);
    }

    console.log('[WidgetSync] Widget data synced successfully');
  } catch (error) {
    console.error('[WidgetSync] Error syncing widget data:', error);
    // Don't throw - widget sync failures shouldn't break the app
  }
};

