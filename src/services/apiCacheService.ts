/**
 * API Cache Service
 * Purpose: Provides intelligent caching for API responses to reduce rate limiting and improve UX
 * Features: TTL-based caching, stale-while-revalidate, automatic cache invalidation, rate limit handling
 * 
 * Strategy:
 * - Cache GET requests with configurable TTL
 * - Return stale data immediately while refreshing in background
 * - Handle 429 errors by returning cached data
 * - Invalidate cache on mutations (POST/PUT/DELETE)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache entry structure
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  url: string;
  params?: string;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /**
   * Default TTL in milliseconds
   * Default: 5 minutes (300000ms)
   */
  defaultTTL?: number;
  
  /**
   * Stale threshold in milliseconds
   * Data older than this is considered stale but still usable
   * Default: 10 minutes (600000ms)
   */
  staleThreshold?: number;
  
  /**
   * Maximum cache size (number of entries)
   * Default: 100
   */
  maxSize?: number;
  
  /**
   * Whether to enable stale-while-revalidate
   * Default: true
   */
  staleWhileRevalidate?: boolean;
}

/**
 * Cache key generator
 */
const generateCacheKey = (url: string, params?: Record<string, any>): string => {
  const paramsString = params ? JSON.stringify(params) : '';
  return `@api_cache_${url}_${paramsString}`;
};

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  staleThreshold: 10 * 60 * 1000, // 10 minutes
  maxSize: 100,
  staleWhileRevalidate: true,
};

/**
 * Endpoint-specific cache configurations
 * Some endpoints may need different TTLs
 */
const ENDPOINT_CONFIGS: Record<string, Partial<CacheConfig>> = {
  '/categories': {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    staleThreshold: 15 * 60 * 1000, // 15 minutes
  },
  '/categories/setup-status': {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    staleThreshold: 5 * 60 * 1000, // 5 minutes
  },
  '/expenses': {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    staleThreshold: 5 * 60 * 1000, // 5 minutes
  },
  '/analytics/stats': {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    staleThreshold: 5 * 60 * 1000, // 5 minutes
  },
  '/analytics/insights': {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    staleThreshold: 10 * 60 * 1000, // 10 minutes
  },
  '/analytics/daily-spending': {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    staleThreshold: 5 * 60 * 1000, // 5 minutes
  },
  '/analytics/trend': {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    staleThreshold: 5 * 60 * 1000, // 5 minutes
  },
  '/analytics/transactions': {
    defaultTTL: 1 * 60 * 1000, // 1 minute
    staleThreshold: 3 * 60 * 1000, // 3 minutes
  },
};

/**
 * API Cache Service
 */
class ApiCacheService {
  private config: Required<CacheConfig>;
  private cacheKeys: Set<string> = new Set();

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadCacheKeys();
  }

  /**
   * Load cache keys from AsyncStorage
   */
  private async loadCacheKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@api_cache_'));
      this.cacheKeys = new Set(cacheKeys);
    } catch (error) {
      console.error('[ApiCacheService] Error loading cache keys:', error);
    }
  }

  /**
   * Get cache configuration for a specific endpoint
   */
  private getEndpointConfig(url: string): Partial<CacheConfig> {
    // Find matching endpoint config (supports partial matches)
    for (const [endpoint, config] of Object.entries(ENDPOINT_CONFIGS)) {
      if (url.includes(endpoint)) {
        return config;
      }
    }
    return {};
  }

  /**
   * Get cached data
   * @returns { data: T | null, isStale: boolean, age: number }
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>
  ): Promise<{ data: T | null; isStale: boolean; age: number }> {
    try {
      const key = generateCacheKey(url, params);
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return { data: null, isStale: false, age: 0 };
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Get endpoint-specific config
      const endpointConfig = this.getEndpointConfig(url);
      const ttl = endpointConfig.defaultTTL ?? this.config.defaultTTL;
      const staleThreshold = endpointConfig.staleThreshold ?? this.config.staleThreshold;

      // Check if cache is expired
      if (age > staleThreshold) {
        // Cache is too old, remove it
        await this.remove(url, params);
        return { data: null, isStale: false, age: 0 };
      }

      // Check if cache is stale (but still usable)
      const isStale = age > ttl;

      return {
        data: entry.data,
        isStale,
        age,
      };
    } catch (error) {
      console.error('[ApiCacheService] Error getting cache:', error);
      return { data: null, isStale: false, age: 0 };
    }
  }

  /**
   * Set cached data
   */
  async set<T = any>(
    url: string,
    data: T,
    params?: Record<string, any>,
    customTTL?: number
  ): Promise<void> {
    try {
      const key = generateCacheKey(url, params);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        url,
        params: params ? JSON.stringify(params) : undefined,
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      this.cacheKeys.add(key);

      // Enforce max cache size
      await this.enforceMaxSize();
    } catch (error) {
      console.error('[ApiCacheService] Error setting cache:', error);
    }
  }

  /**
   * Remove cached data
   */
  async remove(url: string, params?: Record<string, any>): Promise<void> {
    try {
      const key = generateCacheKey(url, params);
      await AsyncStorage.removeItem(key);
      this.cacheKeys.delete(key);
    } catch (error) {
      console.error('[ApiCacheService] Error removing cache:', error);
    }
  }

  /**
   * Invalidate cache for a specific endpoint pattern
   * Useful for invalidating related caches after mutations
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      
      for (const key of this.cacheKeys) {
        if (key.includes(pattern)) {
          keysToRemove.push(key);
        }
      }

      await AsyncStorage.multiRemove(keysToRemove);
      keysToRemove.forEach(key => this.cacheKeys.delete(key));
    } catch (error) {
      console.error('[ApiCacheService] Error invalidating cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const keysToRemove = Array.from(this.cacheKeys);
      await AsyncStorage.multiRemove(keysToRemove);
      this.cacheKeys.clear();
    } catch (error) {
      console.error('[ApiCacheService] Error clearing cache:', error);
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries
   */
  private async enforceMaxSize(): Promise<void> {
    if (this.cacheKeys.size <= this.config.maxSize) {
      return;
    }

    try {
      // Get all cache entries with timestamps
      const entries: Array<{ key: string; timestamp: number }> = [];
      
      for (const key of this.cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          try {
            const entry: CacheEntry = JSON.parse(cached);
            entries.push({ key, timestamp: entry.timestamp });
          } catch {
            // Invalid entry, remove it
            await AsyncStorage.removeItem(key);
            this.cacheKeys.delete(key);
          }
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - this.config.maxSize);
      const keysToRemove = toRemove.map(e => e.key);
      
      await AsyncStorage.multiRemove(keysToRemove);
      keysToRemove.forEach(key => this.cacheKeys.delete(key));
    } catch (error) {
      console.error('[ApiCacheService] Error enforcing max size:', error);
    }
  }

  /**
   * Check if we should use stale data while revalidating
   */
  shouldUseStaleWhileRevalidate(url: string): boolean {
    if (!this.config.staleWhileRevalidate) {
      return false;
    }
    
    const endpointConfig = this.getEndpointConfig(url);
    return endpointConfig.staleWhileRevalidate !== false;
  }
}

/**
 * Singleton instance
 */
export const apiCacheService = new ApiCacheService();

/**
 * Export types
 */
export type { CacheConfig, CacheEntry };

