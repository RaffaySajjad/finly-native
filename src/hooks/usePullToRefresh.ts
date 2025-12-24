/**
 * usePullToRefresh hook
 * Purpose: Reusable hook for managing pull-to-refresh state and logic
 * Provides a clean API for screens to implement pull-to-refresh functionality
 */

import { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface UsePullToRefreshOptions {
  /**
   * Function to call when refresh is triggered
   * Should return a Promise that resolves when refresh is complete
   */
  onRefresh: () => Promise<void> | void;
  
  /**
   * Optional: Custom tint color for refresh indicator
   * Defaults to theme primary color
   */
  tintColor?: string;
  
  /**
   * Optional: Enable/disable refresh functionality
   * Defaults to true
   */
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  /**
   * Whether refresh is currently in progress
   */
  refreshing: boolean;
  
  /**
   * Function to trigger refresh programmatically
   */
  refresh: () => Promise<void>;
  
  /**
   * Props to spread on RefreshControl component
   */
  refreshControlProps: {
    refreshing: boolean;
    onRefresh: () => void;
    tintColor?: string;
    enabled?: boolean;
  };
}

/**
 * Custom hook for pull-to-refresh functionality
 * 
 * @param options - Configuration options for pull-to-refresh
 * @returns Object containing refresh state and props for RefreshControl
 * 
 * @example
 * ```tsx
 * const { refreshing, refreshControlProps } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await loadData();
 *   }
 * });
 * 
 * <ScrollView refreshControl={<RefreshControl {...refreshControlProps} />}>
 *   {children}
 * </ScrollView>
 * ```
 */
export const usePullToRefresh = (
  options: UsePullToRefreshOptions
): UsePullToRefreshReturn => {
  const { theme } = useTheme();
  const { onRefresh, tintColor, enabled = true } = options;
  
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled || refreshing) {
      return;
    }

    try {
      setRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
      // Still stop refreshing even if there's an error
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, enabled, refreshing]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return {
    refreshing,
    refresh,
    refreshControlProps: {
      refreshing,
      onRefresh: handleRefresh,
      tintColor: tintColor || theme.primary,
      enabled,
    },
  };
};

