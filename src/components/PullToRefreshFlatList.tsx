/**
 * PullToRefreshFlatList component
 * Purpose: Wrapper around FlatList with built-in pull-to-refresh functionality
 * Provides a clean, reusable solution for lists that need pull-to-refresh
 */

import React from 'react';
import { FlatList, FlatListProps, RefreshControl } from 'react-native';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshFlatListProps<T> extends Omit<FlatListProps<T>, 'refreshControl'> {
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
 * PullToRefreshFlatList - FlatList with pull-to-refresh
 * 
 * Automatically handles refresh state and provides native pull-to-refresh UI
 * 
 * @example
 * ```tsx
 * <PullToRefreshFlatList
 *   data={items}
 *   renderItem={({ item }) => <ItemComponent item={item} />}
 *   onRefresh={async () => {
 *     await loadData();
 *   }}
 * />
 * ```
 */
export const PullToRefreshFlatList = <T,>({
  onRefresh,
  refreshTintColor,
  refreshEnabled = true,
  refreshing: externalRefreshing,
  ...flatListProps
}: PullToRefreshFlatListProps<T>): React.ReactElement => {
  const { refreshing: internalRefreshing, refreshControlProps } = usePullToRefresh({
    onRefresh,
    tintColor: refreshTintColor,
    enabled: refreshEnabled,
  });

  // Use external refreshing state if provided, otherwise use internal
  const refreshing = externalRefreshing !== undefined ? externalRefreshing : internalRefreshing;

  return (
    <FlatList
      {...flatListProps}
      refreshControl={
        refreshEnabled ? (
          <RefreshControl
            {...refreshControlProps}
            refreshing={refreshing}
          />
        ) : undefined
      }
    />
  );
};

