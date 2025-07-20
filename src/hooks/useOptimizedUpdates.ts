import { useCallback, useRef, useMemo } from 'react';

interface DebounceOptions {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
}

// Generic debounce hook
export const useDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  options: DebounceOptions
): T => {
  const { delay, immediate = false, maxWait } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTime = useRef<number>(0);
  const lastExecTime = useRef<number>(0);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastCallTime.current = now;

      const execute = () => {
        lastExecTime.current = Date.now();
        callback(...args);
      };

      const clear = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
          maxTimeoutRef.current = null;
        }
      };

      // Execute immediately if configured and it's the first call
      if (immediate && !timeoutRef.current) {
        execute();
        return;
      }

      // Clear existing timeouts
      clear();

      // Set up debounce timeout
      timeoutRef.current = setTimeout(() => {
        execute();
        clear();
      }, delay);

      // Set up max wait timeout if specified
      if (maxWait && now - lastExecTime.current >= maxWait) {
        maxTimeoutRef.current = setTimeout(() => {
          execute();
          clear();
        }, maxWait - (now - lastExecTime.current));
      }
    },
    [callback, delay, immediate, maxWait]
  ) as T;

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }
  }, []);

  // Cancel pending executions
  const cancel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Flush pending execution immediately
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      const now = Date.now();
      if (now - lastCallTime.current <= delay) {
        callback();
      }
    }
    cleanup();
  }, [callback, delay, cleanup]);

  // Add cleanup and utility methods to the debounced function
  Object.assign(debouncedCallback, {
    cancel,
    flush,
    cleanup
  });

  return debouncedCallback;
};

// Specialized debounce hooks for common use cases

// For search input
export const useSearchDebounce = <T extends string | undefined>(
  callback: (value: T) => void,
  delay: number = 300
) => {
  return useDebounce(callback, { delay });
};

// For drag operations
export const useDragDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 16 // ~60fps
) => {
  return useDebounce(callback, { 
    delay, 
    maxWait: 100 // Ensure execution at least every 100ms
  });
};

// For resize operations
export const useResizeDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 250
) => {
  return useDebounce(callback, { 
    delay,
    maxWait: 500 // Ensure execution at least every 500ms
  });
};

// For API calls
export const useApiDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500
) => {
  return useDebounce(callback, { delay });
};

// Throttle hook (ensures function is called at most once per interval)
export const useThrottle = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T => {
  const lastExecTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastExecTime.current >= delay) {
        // Execute immediately if enough time has passed
        lastExecTime.current = now;
        callback(...args);
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        const remainingTime = delay - (now - lastExecTime.current);
        timeoutRef.current = setTimeout(() => {
          lastExecTime.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  Object.assign(throttledCallback, { cleanup });

  return throttledCallback;
};

// Animation frame throttle for smooth animations
export const useAnimationThrottle = <T extends (...args: unknown[]) => unknown>(
  callback: T
): T => {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (requestRef.current) {
        return; // Already scheduled
      }

      requestRef.current = requestAnimationFrame((time) => {
        if (previousTimeRef.current === null || time - previousTimeRef.current >= 16) {
          // Execute if 16ms (~60fps) has passed
          previousTimeRef.current = time;
          callback(...args);
        }
        requestRef.current = null;
      });
    },
    [callback]
  ) as T;

  const cleanup = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  }, []);

  Object.assign(throttledCallback, { cleanup });

  return throttledCallback;
};

// Batch updates hook
export const useBatchUpdates = <T>(
  updateCallback: (batch: T[]) => void,
  options: {
    batchSize?: number;
    delay?: number;
    maxWait?: number;
  } = {}
) => {
  const { batchSize = 10, delay = 100, maxWait = 1000 } = options;
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstItemTime = useRef<number | null>(null);

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      const batch = [...batchRef.current];
      batchRef.current = [];
      firstItemTime.current = null;
      updateCallback(batch);
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [updateCallback]);

  const addToBatch = useCallback((item: T) => {
    const now = Date.now();
    
    if (firstItemTime.current === null) {
      firstItemTime.current = now;
    }

    batchRef.current.push(item);

    // Process immediately if batch is full
    if (batchRef.current.length >= batchSize) {
      processBatch();
      return;
    }

    // Process if max wait time exceeded
    if (now - firstItemTime.current! >= maxWait) {
      processBatch();
      return;
    }

    // Schedule delayed processing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(processBatch, delay);
  }, [batchSize, delay, maxWait, processBatch]);

  const flush = useCallback(() => {
    processBatch();
  }, [processBatch]);

  const clear = useCallback(() => {
    batchRef.current = [];
    firstItemTime.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    addToBatch,
    flush,
    clear,
    currentBatchSize: batchRef.current.length
  };
};

// Combined debounce and batch hook for high-frequency updates
export const useOptimizedUpdates = <T>(
  updateCallback: (items: T[]) => void,
  options: {
    debounceDelay?: number;
    batchSize?: number;
    maxWait?: number;
  } = {}
) => {
  const { debounceDelay = 100, batchSize = 20, maxWait = 2000 } = options;

  const batchUpdates = useBatchUpdates(updateCallback, {
    batchSize,
    delay: debounceDelay,
    maxWait
  });

  const debouncedAdd = useDebounce(
    batchUpdates.addToBatch,
    { delay: debounceDelay, maxWait }
  );

  return {
    addUpdate: debouncedAdd,
    flush: batchUpdates.flush,
    clear: batchUpdates.clear
  };
};
