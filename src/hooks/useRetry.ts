import { useCallback, useState } from 'react';

interface RetryConfig {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  lastError: Error | null;
}

interface UseRetryReturn<T> {
  execute: () => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  state: RetryState;
}

export const useRetry = <T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): UseRetryReturn<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    onRetry,
    shouldRetry = () => true
  } = config;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = useCallback((attempt: number) => {
    const calculatedDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(calculatedDelay, maxDelay);
  }, [delay, backoffMultiplier, maxDelay]);

  const executeWithRetry = useCallback(async (isRetryCall = false): Promise<T | null> => {
    if (!isRetryCall) {
      setState(prev => ({ ...prev, attemptCount: 0, lastError: null }));
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setState(prev => ({ 
          ...prev, 
          isRetrying: attempt > 1,
          attemptCount: attempt 
        }));

        const result = await operation();
        
        setState(prev => ({ 
          ...prev, 
          isRetrying: false,
          lastError: null 
        }));
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState(prev => ({ 
          ...prev, 
          lastError: errorObj,
          attemptCount: attempt 
        }));

        if (attempt === maxAttempts || !shouldRetry(errorObj)) {
          setState(prev => ({ 
            ...prev, 
            isRetrying: false 
          }));
          
          throw errorObj;
        }

        onRetry?.(attempt, errorObj);
        
        if (attempt < maxAttempts) {
          const waitTime = calculateDelay(attempt);
          await sleep(waitTime);
        }
      }
    }

    setState(prev => ({ ...prev, isRetrying: false }));
    return null;
  }, [operation, maxAttempts, onRetry, shouldRetry, calculateDelay]);

  const retry = useCallback(async (): Promise<T | null> => {
    return executeWithRetry(true);
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null
    });
  }, []);

  return {
    execute: executeWithRetry,
    retry,
    reset,
    state
  };
};

// Higher-order function for automatic retry on API calls
export const withRetry = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  config: RetryConfig = {}
) => {
  return async (...args: T): Promise<R> => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      maxDelay = 10000,
      onRetry,
      shouldRetry = () => true
    } = config;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts || !shouldRetry(errorObj)) {
          throw errorObj;
        }

        onRetry?.(attempt, errorObj);
        
        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
          const clampedWaitTime = Math.min(waitTime, maxDelay);
          await sleep(clampedWaitTime);
        }
      }
    }

    throw new Error('Retry function completed without returning a value');
  };
};

// Retry configuration presets
export const retryPresets = {
  // Quick operations (API calls)
  api: {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 5000,
    shouldRetry: (error: Error) => {
      // Retry on network errors, 5xx errors, timeouts
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') ||
             message.includes('fetch') ||
             message.includes('500') ||
             message.includes('502') ||
             message.includes('503') ||
             message.includes('504');
    }
  },

  // Connection attempts (WebSocket, SSE)
  connection: {
    maxAttempts: 5,
    delay: 2000,
    backoffMultiplier: 1.5,
    maxDelay: 30000,
    shouldRetry: () => true
  },

  // File operations
  file: {
    maxAttempts: 2,
    delay: 500,
    backoffMultiplier: 2,
    maxDelay: 2000,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return !message.includes('permission') && !message.includes('not found');
    }
  },

  // Critical operations (don't retry on validation errors)
  critical: {
    maxAttempts: 2,
    delay: 1000,
    backoffMultiplier: 1,
    maxDelay: 1000,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return !message.includes('validation') && 
             !message.includes('invalid') &&
             !message.includes('forbidden') &&
             !message.includes('unauthorized');
    }
  }
};

// Hook for managing retry state across multiple operations
export const useRetryManager = () => {
  const [operations, setOperations] = useState<Map<string, RetryState>>(new Map());

  const getOperationState = (operationId: string): RetryState => {
    return operations.get(operationId) || {
      isRetrying: false,
      attemptCount: 0,
      lastError: null
    };
  };

  const updateOperationState = (operationId: string, state: Partial<RetryState>) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(operationId) || {
        isRetrying: false,
        attemptCount: 0,
        lastError: null
      };
      newMap.set(operationId, { ...currentState, ...state });
      return newMap;
    });
  };

  const executeWithRetry = async <T>(
    operationId: string,
    operation: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T | null> => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      maxDelay = 10000,
      onRetry,
      shouldRetry = () => true
    } = config;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    updateOperationState(operationId, { attemptCount: 0, lastError: null });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        updateOperationState(operationId, {
          isRetrying: attempt > 1,
          attemptCount: attempt
        });

        const result = await operation();
        
        updateOperationState(operationId, {
          isRetrying: false,
          lastError: null
        });
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        updateOperationState(operationId, {
          lastError: errorObj,
          attemptCount: attempt
        });

        if (attempt === maxAttempts || !shouldRetry(errorObj)) {
          updateOperationState(operationId, { isRetrying: false });
          throw errorObj;
        }

        onRetry?.(attempt, errorObj);
        
        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
          const clampedWaitTime = Math.min(waitTime, maxDelay);
          await sleep(clampedWaitTime);
        }
      }
    }

    updateOperationState(operationId, { isRetrying: false });
    return null;
  };

  const clearOperation = (operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  };

  const clearAllOperations = () => {
    setOperations(new Map());
  };

  return {
    getOperationState,
    executeWithRetry,
    clearOperation,
    clearAllOperations,
    hasActiveRetries: Array.from(operations.values()).some(state => state.isRetrying)
  };
};
