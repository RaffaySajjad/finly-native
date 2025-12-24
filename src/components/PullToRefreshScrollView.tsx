/**
 * PullToRefreshScrollView component
 * Purpose: Wrapper around ScrollView with built-in pull-to-refresh functionality
 * Provides a clean, reusable solution for screens that need pull-to-refresh
 */

import React from 'react';
import { ScrollView, ScrollViewProps, RefreshControl } from 'react-native';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshScrollViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
  /**
   * Function to call when refresh is triggered
   * Should return a Promise that resolves when refresh is complete
   */
  onRefresh: () => Promise<void> | void;
  
  /**
   * Optional: Custom tint color for refresh indicator
   * Defaults to theme primary color
   */
  refreshTintColor?: string;
  
  /**
   * Optional: Enable/disable refresh functionality
   * Defaults to true
   */
  refreshEnabled?: boolean;
  
  /**
   * Optional: Whether refresh is currently in progress
   * If provided, overrides internal refresh state
   */
  refreshing?: boolean;
}

/**
 * PullToRefreshScrollView - ScrollView with pull-to-refresh
 * 
 * Automatically handles refresh state and provides native pull-to-refresh UI
 * 
 * @example
 * ```tsx
 * <PullToRefreshScrollView
 *   ref={scrollViewRef}
 *   onRefresh={async () => {
 *     await loadData();
 *   }}
 * >
 *   {children}
 * </PullToRefreshScrollView>
 * ```
 */
export const PullToRefreshScrollView = React.forwardRef<ScrollView, PullToRefreshScrollViewProps>(({
  onRefresh,
  refreshTintColor,
  refreshEnabled = true,
  refreshing: externalRefreshing,
  children,
  ...scrollViewProps
}, ref) => {
  const { refreshing: internalRefreshing, refreshControlProps } = usePullToRefresh({
    onRefresh,
    tintColor: refreshTintColor,
    enabled: refreshEnabled,
  });

  // Use external refreshing state if provided, otherwise use internal
  const refreshing = externalRefreshing !== undefined ? externalRefreshing : internalRefreshing;

  return (
    <ScrollView
      ref={ref}
      {...scrollViewProps}
      refreshControl={
        refreshEnabled ? (
          <RefreshControl
            {...refreshControlProps}
            refreshing={refreshing}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
});

PullToRefreshScrollView.displayName = 'PullToRefreshScrollView';

