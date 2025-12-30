
/**
 * useBalanceHistory Hook
 * Purpose: Fetches and calculates balance history with filtering support
 * Features: Date range filtering, period presets, stats calculation, period comparison, caching
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { apiService } from '../services/api';
import { MonthlyStats, UnifiedTransaction } from '../types';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: BalanceHistoryData;
  stats: MonthlyStats;
  timestamp: number;
}

// In-memory cache for balance history data
const balanceHistoryCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from date range
 */
const getCacheKey = (startDate: Date, endDate: Date): string => {
  return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
};

/**
 * Check if cache entry is valid
 */
const isCacheValid = (entry: CacheEntry | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

export interface BalanceInsight {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  description: string;
  icon: string;
}

export interface DailyBalance {
  date: string;
  balance: number;
  income?: number;
  expenses?: number;
}

export interface PeriodStats {
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  averageDailySpending: number;
  transactionCount: number;
  startBalance: number;
  endBalance: number;
}

export interface ComparisonStats {
  // Previous period stats
  previousPeriod: PeriodStats;
  // Percentage changes vs previous period
  changes: {
    income: number; // % change in income
    expenses: number; // % change in expenses
    netChange: number; // % change in net change
    balance: number; // % change in end balance
    avgSpending: number; // % change in avg daily spending
    transactions: number; // % change in transaction count
  };
  // Period labels for display
  currentLabel: string;
  previousLabel: string;
}

export interface BalanceHistoryData {
  dailyBalances: DailyBalance[];
  monthlyBalances: Array<{
    month: string;
    balance: number;
    income: number;
    expenses: number;
  }>;
  projection: {
    endOfMonth: number;
    daysRemaining: number;
    dailySpendingRate: number;
    isPositive: boolean;
  };
  insights: BalanceInsight[];
  // Summary stats for the selected period
  periodStats: PeriodStats;
  // Comparison with previous period
  comparison: ComparisonStats | null;
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate percentage change between two values
 */
const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100; // If previous was 0, consider it 100% increase if current > 0
  }
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Format period label for display
 */
const formatPeriodLabel = (startDate: Date, endDate: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  };
  const yearOptions: Intl.DateTimeFormatOptions = {
    ...options,
    year: 'numeric'
  };

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear !== endYear) {
    return `${startDate.toLocaleDateString(
      'en-US',
      yearOptions
    )} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
  }

  return `${startDate.toLocaleDateString(
    'en-US',
    options
  )} - ${endDate.toLocaleDateString('en-US', options)}, ${endYear}`;
};

/**
 * useBalanceHistory - Hook for fetching balance history with filtering
 * @returns Balance data, stats, loading state, and load function
 */
export const useBalanceHistory = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Background refresh indicator
  const [balanceData, setBalanceData] = useState<BalanceHistoryData | null>(
    null
  );
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>(() => {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  });

  // Track if initial load is done
  const initialLoadDone = useRef(false);
  // Track current fetch to prevent race conditions
  const currentFetchKey = useRef<string | null>(null);

  /**
   * Calculate stats for a set of transactions
   */
  const calculatePeriodStats = (
    transactions: UnifiedTransaction[],
    startDate: Date,
    endDate: Date,
    startBalance: number,
    endBalance: number
  ): PeriodStats => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      if (txDate >= startDate && txDate <= endDate) {
        transactionCount++;
        if (t.type === 'income') {
          totalIncome += t.amount;
        } else {
          totalExpenses += t.amount;
        }
      }
    });

    const daysDiff = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    return {
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
      averageDailySpending: totalExpenses / daysDiff,
      transactionCount,
      startBalance,
      endBalance
    };
  };

  /**
   * Load balance history for a given date range
   * @param customRange - Optional custom date range (uses state if not provided)
   * @param forceRefresh - Force refresh even if cached data exists
   */
  const loadBalanceHistory = useCallback(
    async (customRange?: DateRangeFilter, forceRefresh: boolean = false) => {
      const range = customRange || dateRange;
      const cacheKey = getCacheKey(range.startDate, range.endDate);

      // Track this fetch
      currentFetchKey.current = cacheKey;

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedEntry = balanceHistoryCache.get(cacheKey);

        if (isCacheValid(cachedEntry)) {
          // Return cached data immediately without loading spinner
          setBalanceData(cachedEntry!.data);
          setStats(cachedEntry!.stats);
          setLoading(false);
          initialLoadDone.current = true;

          // Check if cache is getting stale (> 3 minutes) - refresh in background
          const cacheAge = Date.now() - cachedEntry!.timestamp;
          if (cacheAge > CACHE_TTL * 0.6) {
            // Stale-while-revalidate: show cached data, refresh in background
            setRefreshing(true);
            fetchFreshData(range, cacheKey).finally(() => {
              if (currentFetchKey.current === cacheKey) {
                setRefreshing(false);
              }
            });
          }
          return;
        }
      }

      // No valid cache - show loading only if we don't have data yet
      if (!balanceData || forceRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      await fetchFreshData(range, cacheKey);
    },
    [dateRange, balanceData]
  );

  /**
   * Fetch fresh data from API
   */
  const fetchFreshData = async (range: DateRangeFilter, cacheKey: string) => {
    try {
      // Calculate number of days in range
      const daysDiff = Math.ceil(
        (range.endDate.getTime() - range.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Calculate previous period dates (same duration, immediately before)
      const prevEndDate = new Date(range.startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);

      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
      prevStartDate.setHours(0, 0, 0, 0);

      // 1. Get Current Stats (Truth for current balance)
      const currentStats = await apiService.getMonthlyStats();
      setStats(currentStats);

      // 2. Prepare dates with extra buffer for calculation
      const fetchStartDate = new Date(prevStartDate);
      fetchStartDate.setDate(fetchStartDate.getDate() - 1);

      // 3. Fetch ALL transactions for both current and previous period
      const transactionsResponse = await apiService.getUnifiedTransactions({
        startDate: fetchStartDate.toISOString(),
        endDate: range.endDate.toISOString(),
        limit: 10000,
        type: 'all'
      });

      // Handle response type (array or paginated object)
      const allTransactions = Array.isArray(transactionsResponse)
        ? transactionsResponse
        : transactionsResponse.transactions;

      // Separate transactions for current and previous periods
      const currentPeriodTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= range.startDate && txDate <= range.endDate;
      });

      const prevPeriodTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= prevStartDate && txDate <= prevEndDate;
      });

      // Group transactions by date (YYYY-MM-DD)
      const transactionsByDate: Record<string, UnifiedTransaction[]> = {};
      allTransactions.forEach(t => {
        const dateKey = new Date(t.date).toISOString().split('T')[0];
        if (!transactionsByDate[dateKey]) {
          transactionsByDate[dateKey] = [];
        }
        transactionsByDate[dateKey].push(t);
      });

      // 4. Backward Calculation from current balance
      const dailyBalances: DailyBalance[] = [];
      let currentBalance = currentStats.balance;

      // First, calculate backwards from today to get balance at end date
      const today = new Date();
      const daysFromEndToToday = Math.ceil(
        (today.getTime() - range.endDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Walk back from today to end date
      for (let i = 0; i < daysFromEndToToday; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const daysTransactions = transactionsByDate[dateKey] || [];
        let daysIncome = 0;
        let daysExpense = 0;

        daysTransactions.forEach(t => {
          if (t.type === 'income') {
            daysIncome += t.amount;
          } else {
            daysExpense += t.amount;
          }
        });

        currentBalance = currentBalance - daysIncome + daysExpense;
      }

      // 4.5. Trim leading empty days (where income and expenses are 0)
      let firstActiveIndex = dailyBalances.findIndex(d => (d.income || 0) > 0 || (d.expenses || 0) > 0);
      
      // If we found activity, trim but keep one day buffer if possible
      if (firstActiveIndex > 0) {
        // Keep one day of "pre-activity" balance for a better chart start
        const trimIndex = Math.max(0, firstActiveIndex - 1);
        dailyBalances.splice(0, trimIndex);
      }

      // Store the end balance for current period
      const currentEndBalance = currentBalance;

      // Now walk back through the current period range to build daily balances
      for (let i = 0; i <= daysDiff; i++) {
        const d = new Date(range.endDate);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const daysTransactions = transactionsByDate[dateKey] || [];
        let daysIncome = 0;
        let daysExpense = 0;

        daysTransactions.forEach(t => {
          if (t.type === 'income') {
            daysIncome += t.amount;
          } else {
            daysExpense += t.amount;
          }
        });

        dailyBalances.unshift({
          date: dateKey,
          balance: currentBalance,
          income: daysIncome,
          expenses: daysExpense
        });

        currentBalance = currentBalance - daysIncome + daysExpense;
      }

      // Current start balance is now in currentBalance
      const currentStartBalance = currentBalance;

      // 5. Continue walking back to get previous period balances
      const prevEndBalance = currentBalance; // End of prev period = start of current period
      let prevBalance = prevEndBalance;

      for (let i = 0; i <= daysDiff; i++) {
        const d = new Date(prevEndDate);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const daysTransactions = transactionsByDate[dateKey] || [];
        let daysIncome = 0;
        let daysExpense = 0;

        daysTransactions.forEach(t => {
          if (t.type === 'income') {
            daysIncome += t.amount;
          } else {
            daysExpense += t.amount;
          }
        });

        prevBalance = prevBalance - daysIncome + daysExpense;
      }

      const prevStartBalance = prevBalance;

      // 6. Calculate period stats for current and previous periods
      const periodStats = calculatePeriodStats(
        currentPeriodTransactions,
        range.startDate,
        range.endDate,
        currentStartBalance,
        currentEndBalance
      );

      const previousPeriodStats = calculatePeriodStats(
        prevPeriodTransactions,
        prevStartDate,
        prevEndDate,
        prevStartBalance,
        prevEndBalance
      );

      // 7. Calculate comparison stats
      const comparison: ComparisonStats = {
        previousPeriod: previousPeriodStats,
        changes: {
          income: calculatePercentChange(
            periodStats.totalIncome,
            previousPeriodStats.totalIncome
          ),
          expenses: calculatePercentChange(
            periodStats.totalExpenses,
            previousPeriodStats.totalExpenses
          ),
          netChange: calculatePercentChange(
            periodStats.netChange,
            previousPeriodStats.netChange
          ),
          balance: calculatePercentChange(currentEndBalance, prevEndBalance),
          avgSpending: calculatePercentChange(
            periodStats.averageDailySpending,
            previousPeriodStats.averageDailySpending
          ),
          transactions: calculatePercentChange(
            periodStats.transactionCount,
            previousPeriodStats.transactionCount
          )
        },
        currentLabel: formatPeriodLabel(range.startDate, range.endDate),
        previousLabel: formatPeriodLabel(prevStartDate, prevEndDate)
      };

      // 8. Calculate projection (only if end date is today)
      const isEndDateToday =
        range.endDate.toDateString() === today.toDateString();

      let projectionData: BalanceHistoryData['projection'];

      if (isEndDateToday) {
        const now = new Date();
        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        const todayDay = now.getDate();
        const daysRemaining = daysInMonth - todayDay;

        // Calculate spending rate from recent days
        const recentBalances = dailyBalances.slice(-7);
        let totalSpending = 0;
        let daysWithSpending = 0;

        for (let i = 1; i < recentBalances.length; i++) {
          const spending = recentBalances[i].expenses || 0;
          if (spending > 0) {
            totalSpending += spending;
            daysWithSpending++;
          }
        }

        const dailySpendingRate =
          daysWithSpending > 0 ? totalSpending / daysWithSpending : 0;
        const projectedEndOfMonth =
          currentStats.balance - dailySpendingRate * daysRemaining;

        projectionData = {
          endOfMonth: projectedEndOfMonth,
          daysRemaining,
          dailySpendingRate,
          isPositive: projectedEndOfMonth >= 0
        };
      } else {
        // For historical periods, show period-end projection
        projectionData = {
          endOfMonth:
            dailyBalances.length > 0
              ? dailyBalances[dailyBalances.length - 1].balance
              : 0,
          daysRemaining: 0,
          dailySpendingRate: periodStats.totalExpenses / (daysDiff || 1),
          isPositive:
            (dailyBalances.length > 0
              ? dailyBalances[dailyBalances.length - 1].balance
              : 0) >= 0
        };
      }

      // 9. Fetch insights from backend (handles AI + smart fallback)
      let insights: BalanceHistoryData['insights'] = [];
      try {
        const backendInsights = await apiService.getBalanceInsights({
          dailyBalances,
          monthlyBalances: [],
          projection: projectionData
        });
        insights = backendInsights || [];
      } catch (e) {
        console.warn('[useBalanceHistory] Failed to fetch insights:', e);
      }

      const newData: BalanceHistoryData = {
        dailyBalances,
        monthlyBalances: [],
        projection: projectionData,
        insights,
        periodStats,
        comparison
      };

      // Only update state if this is still the current fetch
      if (currentFetchKey.current === cacheKey) {
        setBalanceData(newData);

        // Cache the result
        balanceHistoryCache.set(cacheKey, {
          data: newData,
          stats: currentStats,
          timestamp: Date.now()
        });

        initialLoadDone.current = true;
      }
    } catch (error) {
      console.error('[useBalanceHistory] Error:', error);
    } finally {
      if (currentFetchKey.current === cacheKey) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  /**
   * Update date range and reload data
   */
  const updateDateRange = useCallback(
    (newRange: DateRangeFilter) => {
      setDateRange(newRange);
      loadBalanceHistory(newRange);
    },
    [loadBalanceHistory]
  );

  /**
   * Force refresh data (bypass cache)
   */
  const forceRefresh = useCallback(async () => {
    await loadBalanceHistory(dateRange, true);
  }, [loadBalanceHistory, dateRange]);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    balanceHistoryCache.clear();
  }, []);

  return {
    balanceData,
    stats,
    loading,
    refreshing,
    dateRange,
    loadBalanceHistory,
    updateDateRange,
    forceRefresh,
    clearCache
  };
};
