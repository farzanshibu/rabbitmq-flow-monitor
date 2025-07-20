import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  persist?: boolean; // Won't auto-dismiss
}

interface UseNotificationsReturn {
  showSuccess: (message: string, options?: NotificationOptions) => string;
  showError: (message: string, options?: NotificationOptions) => string;
  showWarning: (message: string, options?: NotificationOptions) => string;
  showInfo: (message: string, options?: NotificationOptions) => string;
  showLoading: (message: string, options?: NotificationOptions) => string;
  updateNotification: (id: string, type: NotificationType, message: string, options?: NotificationOptions) => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { toast, dismiss } = useToast();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  const getVariant = (type: NotificationType) => {
    return type === 'error' ? 'destructive' : 'default';
  };

  const createNotification = (
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const {
      title,
      description,
      duration = type === 'loading' || options.persist ? undefined : 5000,
      action,
      dismissible = true
    } = options;

    const icon = getIcon(type);
    const variant = getVariant(type);

    const toastResult = toast({
      title: (
        <div className="flex items-center gap-2">
          {icon}
          <span>{title || message}</span>
        </div>
      ),
      description: description || (title ? message : undefined),
      variant,
      duration,
      action: action ? (
        <button
          onClick={action.onClick}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {action.label}
        </button>
      ) : undefined,
    });

    return toastResult.id;
  };

  const showSuccess = (message: string, options?: NotificationOptions) => {
    return createNotification('success', message, options);
  };

  const showError = (message: string, options?: NotificationOptions) => {
    return createNotification('error', message, {
      duration: 8000, // Errors stay longer by default
      ...options
    });
  };

  const showWarning = (message: string, options?: NotificationOptions) => {
    return createNotification('warning', message, {
      duration: 6000,
      ...options
    });
  };

  const showInfo = (message: string, options?: NotificationOptions) => {
    return createNotification('info', message, options);
  };

  const showLoading = (message: string, options?: NotificationOptions) => {
    return createNotification('loading', message, {
      persist: true,
      dismissible: false,
      ...options
    });
  };

  const updateNotification = (
    id: string,
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    // Dismiss the old notification
    dismiss(id);
    
    // Create a new one with the same ID concept
    createNotification(type, message, options);
  };

  const dismissNotification = (id: string) => {
    dismiss(id);
  };

  const dismissAll = () => {
    dismiss();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateNotification,
    dismissNotification,
    dismissAll
  };
};

// React hook for consistent notification patterns with API operations
export const useApiNotifications = () => {
  const notifications = useNotifications();

  const notifyApiResult = (
    result: { success: boolean; data?: unknown; error?: string; message?: string },
    operation: string,
    entity?: string
  ) => {
    if (result.success) {
      const message = entity 
        ? `${operation} ${entity} successfully`
        : result.message || `${operation} completed successfully`;
      notifications.showSuccess(message);
    } else {
      const title = entity 
        ? `Failed to ${operation.toLowerCase()} ${entity}`
        : `${operation} failed`;
      notifications.showError(title, {
        description: result.error || 'An unexpected error occurred'
      });
    }
  };

  const notifyApiOperation = async (
    operation: () => Promise<{ success: boolean; data?: unknown; error?: string; message?: string }>,
    operationName: string,
    entity?: string
  ): Promise<unknown | null> => {
    const loadingMessage = entity 
      ? `${operationName} ${entity}...`
      : `${operationName}...`;
    
    const loadingId = notifications.showLoading(loadingMessage);
    
    try {
      const result = await operation();
      
      if (result.success) {
        const successMessage = entity 
          ? `${operationName} ${entity} successfully`
          : result.message || `${operationName} completed successfully`;
        notifications.updateNotification(loadingId, 'success', successMessage);
        return result.data || null;
      } else {
        const errorTitle = entity 
          ? `Failed to ${operationName.toLowerCase()} ${entity}`
          : `${operationName} failed`;
        notifications.updateNotification(loadingId, 'error', errorTitle, {
          description: result.error || 'An unexpected error occurred'
        });
        return null;
      }
    } catch (error) {
      const errorTitle = entity 
        ? `Failed to ${operationName.toLowerCase()} ${entity}`
        : `${operationName} failed`;
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      notifications.updateNotification(loadingId, 'error', errorTitle, {
        description: errorMessage
      });
      return null;
    }
  };

  return {
    ...notifications,
    notifyApiResult,
    notifyApiOperation
  };
};
