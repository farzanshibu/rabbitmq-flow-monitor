import { useMemo, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expires = now + (ttl || this.defaultTTL);
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }
    
    // Add new entry
    this.cache.set(key, {
      data: value,
      timestamp: now,
      expiresAt: expires
    });
    
    this.accessOrder.push(key);
    
    // Cleanup if needed
    this.cleanup();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update access order (move to end)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
      usage: this.cache.size / this.maxSize
    };
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
    
    // Remove oldest entries if over max size
    while (this.cache.size > this.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.delete(oldestKey);
    }
  }
}

// Global cache instances
const topologyCache = new PerformanceCache<unknown>({
  ttl: 30 * 1000, // 30 seconds for topology data
  maxSize: 100
});

const metricsCache = new PerformanceCache<unknown>({
  ttl: 5 * 1000, // 5 seconds for metrics
  maxSize: 500
});

const configCache = new PerformanceCache<unknown>({
  ttl: 5 * 60 * 1000, // 5 minutes for configuration data
  maxSize: 200
});

// React hook for using the cache
export const useCache = <T>(
  cacheType: 'topology' | 'metrics' | 'config' = 'topology'
) => {
  const getCacheInstance = useCallback(() => {
    switch (cacheType) {
      case 'topology':
        return topologyCache as PerformanceCache<T>;
      case 'metrics':
        return metricsCache as PerformanceCache<T>;
      case 'config':
        return configCache as PerformanceCache<T>;
      default:
        return topologyCache as PerformanceCache<T>;
    }
  }, [cacheType]);

  const cache = useMemo(() => getCacheInstance(), [getCacheInstance]);

  const set = useCallback((key: string, value: T, ttl?: number) => {
    cache.set(key, value, ttl);
  }, [cache]);

  const get = useCallback((key: string): T | null => {
    return cache.get(key);
  }, [cache]);

  const has = useCallback((key: string): boolean => {
    return cache.has(key);
  }, [cache]);

  const del = useCallback((key: string): boolean => {
    return cache.delete(key);
  }, [cache]);

  const clear = useCallback(() => {
    cache.clear();
  }, [cache]);

  const stats = useCallback(() => {
    return cache.getStats();
  }, [cache]);

  return {
    set,
    get,
    has,
    delete: del,
    clear,
    stats
  };
};

// Hook for caching API responses with automatic key generation
export const useCachedApiCall = <T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = [],
  options: {
    cacheType?: 'topology' | 'metrics' | 'config';
    ttl?: number;
    enabled?: boolean;
  } = {}
) => {
  const { cacheType = 'topology', ttl, enabled = true } = options;
  const cache = useCache<T>(cacheType);
  const lastCallRef = useRef<string>('');

  // Generate cache key from dependencies
  const cacheKey = useMemo(() => {
    return JSON.stringify(dependencies);
  }, [dependencies]);

  const cachedCall = useCallback(async (): Promise<T> => {
    if (!enabled) {
      return apiCall();
    }

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Make API call and cache result
    const result = await apiCall();
    cache.set(cacheKey, result, ttl);
    lastCallRef.current = cacheKey;
    
    return result;
  }, [apiCall, cacheKey, cache, enabled, ttl]);

  const invalidate = useCallback(() => {
    if (lastCallRef.current) {
      cache.delete(lastCallRef.current);
    }
  }, [cache]);

  const invalidateAll = useCallback(() => {
    cache.clear();
  }, [cache]);

  return {
    call: cachedCall,
    invalidate,
    invalidateAll,
    cacheKey,
    stats: cache.stats
  };
};

// Hook for batch operations with caching
export const useBatchCache = <T>(
  batchSize: number = 10,
  cacheType: 'topology' | 'metrics' | 'config' = 'topology'
) => {
  const cache = useCache<T[]>(cacheType);
  const batchQueue = useRef<{ key: string; resolver: (value: T[]) => void }[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(async (
    keys: string[],
    fetcher: (keys: string[]) => Promise<T[]>
  ) => {
    const batchKey = keys.sort().join('|');
    
    // Check if we have cached results
    const cached = cache.get(batchKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache results
    const results = await fetcher(keys);
    cache.set(batchKey, results);
    
    return results;
  }, [cache]);

  const batchGet = useCallback((
    key: string,
    fetcher: (keys: string[]) => Promise<T[]>
  ): Promise<T[]> => {
    return new Promise((resolve) => {
      batchQueue.current.push({ key, resolver: resolve });

      // Clear existing timeout
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      // Set new timeout for batch processing
      batchTimeout.current = setTimeout(async () => {
        const currentBatch = [...batchQueue.current];
        batchQueue.current = [];

        // Group by batches
        const batches: string[][] = [];
        for (let i = 0; i < currentBatch.length; i += batchSize) {
          batches.push(currentBatch.slice(i, i + batchSize).map(item => item.key));
        }

        // Process each batch
        for (const batch of batches) {
          try {
            const results = await processBatch(batch, fetcher);
            
            // Resolve promises for this batch
            const batchItems = currentBatch.filter(item => batch.includes(item.key));
            batchItems.forEach(item => item.resolver(results));
          } catch (error) {
            // Reject promises for this batch
            const batchItems = currentBatch.filter(item => batch.includes(item.key));
            batchItems.forEach(item => item.resolver([]));
          }
        }
      }, 50); // 50ms batch delay
    });
  }, [batchSize, processBatch]);

  return {
    batchGet,
    cache,
    stats: cache.stats
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef<number>(0);

  const startRender = useCallback(() => {
    lastRenderTime.current = performance.now();
  }, []);

  const endRender = useCallback((componentName?: string) => {
    const renderTime = performance.now() - lastRenderTime.current;
    renderTimes.current.push(renderTime);
    
    // Keep only last 100 measurements
    if (renderTimes.current.length > 100) {
      renderTimes.current = renderTimes.current.slice(-100);
    }

    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render${componentName ? ` in ${componentName}` : ''}: ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }, []);

  const getStats = useCallback(() => {
    if (renderTimes.current.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const times = renderTimes.current;
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      avg: Number(avg.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      count: times.length
    };
  }, []);

  const reset = useCallback(() => {
    renderTimes.current = [];
  }, []);

  return {
    startRender,
    endRender,
    getStats,
    reset
  };
};
