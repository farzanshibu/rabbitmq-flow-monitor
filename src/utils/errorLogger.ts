export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReportConfig {
  maxLogs?: number;
  enableConsoleLog?: boolean;
  enableLocalStorage?: boolean;
  enableSessionStorage?: boolean;
  storageKey?: string;
  onError?: (errorLog: ErrorLog) => void;
}

class ErrorLogger {
  private config: Required<ErrorReportConfig>;
  private sessionId: string;

  constructor(config: ErrorReportConfig = {}) {
    this.config = {
      maxLogs: 100,
      enableConsoleLog: true,
      enableLocalStorage: true,
      enableSessionStorage: false,
      storageKey: 'rabbit_monitor_errors',
      onError: () => {},
      ...config
    };

    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createErrorLog(
    level: ErrorLog['level'],
    source: string,
    message: string,
    options: {
      error?: Error;
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): ErrorLog {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      stack: options.error?.stack,
      context: options.context,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      component: options.component,
      action: options.action,
      metadata: options.metadata
    };
  }

  private storeLog(errorLog: ErrorLog): void {
    try {
      if (this.config.enableLocalStorage) {
        this.storeInLocalStorage(errorLog);
      }

      if (this.config.enableSessionStorage) {
        this.storeInSessionStorage(errorLog);
      }
    } catch (storageError) {
      console.error('Failed to store error log:', storageError);
    }
  }

  private storeInLocalStorage(errorLog: ErrorLog): void {
    const existingLogs = this.getStoredLogs('localStorage');
    const updatedLogs = [errorLog, ...existingLogs].slice(0, this.config.maxLogs);
    localStorage.setItem(this.config.storageKey, JSON.stringify(updatedLogs));
  }

  private storeInSessionStorage(errorLog: ErrorLog): void {
    const existingLogs = this.getStoredLogs('sessionStorage');
    const updatedLogs = [errorLog, ...existingLogs].slice(0, this.config.maxLogs);
    sessionStorage.setItem(this.config.storageKey, JSON.stringify(updatedLogs));
  }

  private getStoredLogs(storageType: 'localStorage' | 'sessionStorage'): ErrorLog[] {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const stored = storage.getItem(this.config.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  error(
    source: string,
    message: string,
    options: {
      error?: Error;
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const errorLog = this.createErrorLog('error', source, message, options);
    
    if (this.config.enableConsoleLog) {
      console.error(`[${source}] ${message}`, {
        ...options,
        errorLog
      });
    }

    this.storeLog(errorLog);
    this.config.onError(errorLog);
  }

  warning(
    source: string,
    message: string,
    options: {
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const errorLog = this.createErrorLog('warning', source, message, options);
    
    if (this.config.enableConsoleLog) {
      console.warn(`[${source}] ${message}`, {
        ...options,
        errorLog
      });
    }

    this.storeLog(errorLog);
    this.config.onError(errorLog);
  }

  info(
    source: string,
    message: string,
    options: {
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const errorLog = this.createErrorLog('info', source, message, options);
    
    if (this.config.enableConsoleLog) {
      console.info(`[${source}] ${message}`, {
        ...options,
        errorLog
      });
    }

    this.storeLog(errorLog);
    this.config.onError(errorLog);
  }

  getLogs(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): ErrorLog[] {
    return this.getStoredLogs(storageType);
  }

  clearLogs(storageType?: 'localStorage' | 'sessionStorage'): void {
    try {
      if (!storageType || storageType === 'localStorage') {
        localStorage.removeItem(this.config.storageKey);
      }
      if (!storageType || storageType === 'sessionStorage') {
        sessionStorage.removeItem(this.config.storageKey);
      }
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  exportLogs(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): string {
    const logs = this.getStoredLogs(storageType);
    return JSON.stringify(logs, null, 2);
  }

  getLogsSummary(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): {
    total: number;
    byLevel: Record<ErrorLog['level'], number>;
    bySource: Record<string, number>;
    byComponent: Record<string, number>;
    recentErrors: ErrorLog[];
  } {
    const logs = this.getStoredLogs(storageType);
    
    const byLevel: Record<ErrorLog['level'], number> = {
      error: 0,
      warning: 0,
      info: 0
    };
    
    const bySource: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    
    logs.forEach(log => {
      byLevel[log.level]++;
      bySource[log.source] = (bySource[log.source] || 0) + 1;
      if (log.component) {
        byComponent[log.component] = (byComponent[log.component] || 0) + 1;
      }
    });

    const recentErrors = logs
      .filter(log => log.level === 'error')
      .slice(0, 5);

    return {
      total: logs.length,
      byLevel,
      bySource,
      byComponent,
      recentErrors
    };
  }

  // Method to help with debugging in development
  downloadLogs(filename?: string): void {
    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `rabbit-monitor-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Global error logger instance
const errorLogger = new ErrorLogger({
  maxLogs: 200,
  enableConsoleLog: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  onError: (errorLog) => {
    // In production, you could send this to an error reporting service
    if (process.env.NODE_ENV === 'production' && errorLog.level === 'error') {
      // Example: Send to error reporting service
      // sendToErrorService(errorLog);
    }
  }
});

// React hook for error logging
export const useErrorLogger = () => {
  const logError = (
    source: string,
    message: string,
    options?: {
      error?: Error;
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    errorLogger.error(source, message, options);
  };

  const logWarning = (
    source: string,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    errorLogger.warning(source, message, options);
  };

  const logInfo = (
    source: string,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      component?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    errorLogger.info(source, message, options);
  };

  return {
    logError,
    logWarning,
    logInfo,
    getLogs: () => errorLogger.getLogs(),
    clearLogs: () => errorLogger.clearLogs(),
    getLogsSummary: () => errorLogger.getLogsSummary(),
    downloadLogs: () => errorLogger.downloadLogs()
  };
};

// Higher-order function to wrap async operations with error logging
export const withErrorLogging = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  source: string,
  options: {
    component?: string;
    logSuccess?: boolean;
    successMessage?: string;
  } = {}
) => {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      
      if (options.logSuccess) {
        errorLogger.info(
          source,
          options.successMessage || 'Operation completed successfully',
          {
            component: options.component,
            action: fn.name,
            metadata: { arguments: args }
          }
        );
      }
      
      return result;
    } catch (error) {
      errorLogger.error(
        source,
        `Operation failed: ${fn.name}`,
        {
          error: error instanceof Error ? error : new Error(String(error)),
          component: options.component,
          action: fn.name,
          metadata: { arguments: args }
        }
      );
      
      throw error;
    }
  };
};

// Global error handler for unhandled promise rejections and errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.error(
      'GlobalErrorHandler',
      'Unhandled JavaScript error',
      {
        error: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message
        }
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.error(
      'GlobalErrorHandler',
      'Unhandled promise rejection',
      {
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: {
          type: 'unhandledrejection',
          reason: event.reason
        }
      }
    );
  });
}

export { errorLogger };
export default ErrorLogger;
