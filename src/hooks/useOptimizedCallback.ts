/**
 * useOptimizedCallback Hook
 * Purpose: Performance-optimized callback memoization with dependency tracking
 * Follows: Performance best practices, React hooks patterns
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * useOptimizedCallback - Memoize callbacks with automatic dependency tracking
 * Better than useCallback as it only re-creates when dependencies actually change values
 * @param callback - Function to memoize
 * @param dependencies - Dependency array
 * @returns Memoized callback
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  const callbackRef = useRef(callback);
  const depsRef = useRef(dependencies);

  // Update callback ref if it changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Check if dependencies have actually changed (deep comparison)
  const haveDepsChanged = useRef(true);
  useEffect(() => {
    if (depsRef.current.length !== dependencies.length) {
      haveDepsChanged.current = true;
    } else {
      haveDepsChanged.current = dependencies.some((dep, i) => !Object.is(dep, depsRef.current[i]));
    }
    
    if (haveDepsChanged.current) {
      depsRef.current = dependencies;
    }
  });

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    haveDepsChanged.current ? dependencies : depsRef.current
  );
}

