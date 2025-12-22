/**
 * Prefetch Service
 * Purpose: Prefetches data for screens that users frequently visit
 * This runs in the background when the app loads to improve perceived performance
 */

import { apiService } from './api';

/**
 * Prefetch data for TrendsScreen
 * Fetches spending trends and forecast data
 */
export const prefetchTrendsData = async (): Promise<void> => {
  try {
    console.log('[Prefetch] Starting TrendsScreen data prefetch...');
    await Promise.all([
      apiService.getSpendingTrends(),
      apiService.getSpendingForecast(),
    ]);
    console.log('[Prefetch] TrendsScreen data prefetched successfully');
  } catch (error) {
    // Silently fail - this is just a performance optimization
    console.warn('[Prefetch] TrendsScreen prefetch failed:', error);
  }
};

/**
 * Prefetch data for BalanceHistoryScreen
 * Fetches monthly stats and unified transactions
 */
export const prefetchBalanceHistoryData = async (): Promise<void> => {
  try {
    console.log('[Prefetch] Starting BalanceHistoryScreen data prefetch...');
    
    // Get date range for last 30 days (default for BalanceHistoryScreen)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Also get previous 30 days for comparison
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - 30);
    
    await Promise.all([
      apiService.getMonthlyStats(),
      apiService.getUnifiedTransactions({
        startDate: prevStartDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 10000,
        type: 'all',
      }),
    ]);
    console.log('[Prefetch] BalanceHistoryScreen data prefetched successfully');
  } catch (error) {
    // Silently fail - this is just a performance optimization
    console.warn('[Prefetch] BalanceHistoryScreen prefetch failed:', error);
  }
};

/**
 * Prefetch all screen data
 * Call this when the app loads and user is authenticated
 */
export const prefetchAllScreenData = async (): Promise<void> => {
  console.log('[Prefetch] Starting background data prefetch...');
  
  // Run both prefetches in parallel - they don't depend on each other
  await Promise.all([
    prefetchTrendsData(),
    prefetchBalanceHistoryData(),
  ]);
  
  console.log('[Prefetch] All background data prefetch complete');
};
