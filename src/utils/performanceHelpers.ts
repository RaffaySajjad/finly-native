/**
 * Performance Helper Utilities
 * Purpose: Performance optimization utilities for React Native
 * Follows: Performance best practices, memoization patterns
 */

import { useRef, useEffect } from 'react';

/**
 * Debounce function for expensive operations
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * usePrevious hook to track previous value
 * Useful for optimization checks
 * @param value - Value to track
 * @returns Previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * useWhyDidYouUpdate hook for debugging re-renders
 * Only use in development for debugging
 * @param name - Component name
 * @param props - Props object
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

/**
 * Shallow comparison for objects
 * Useful for React.memo and shouldComponentUpdate
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns True if objects are shallow equal
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }
  
  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a memoized getter function
 * Caches results based on input
 * @param fn - Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * FlatList optimization configuration
 * Provides optimal settings for FlatList performance
 */
export const FLATLIST_OPTIMIZATION_CONFIG = {
  // Remove clipped subviews for better memory management
  removeClippedSubviews: true,
  
  // Render items in batches
  maxToRenderPerBatch: 10,
  
  // Update cells in batches
  updateCellsBatchingPeriod: 50,
  
  // Number of items to render outside visible area
  windowSize: 10,
  
  // Initial number of items to render
  initialNumToRender: 10,
  
  // Use getItemLayout for better scroll performance (when item heights are fixed)
  // getItemLayout: (data, index) => ({
  //   length: ITEM_HEIGHT,
  //   offset: ITEM_HEIGHT * index,
  //   index,
  // }),
};

/**
 * Image caching configuration for React Native
 */
export const IMAGE_CACHE_CONFIG = {
  // Cache images in memory
  cache: 'force-cache' as RequestCache,
  
  // Maximum cache size
  maxCacheSize: 100,
  
  // Cache duration in seconds
  cacheDuration: 3600 * 24 * 7, // 7 days
};

