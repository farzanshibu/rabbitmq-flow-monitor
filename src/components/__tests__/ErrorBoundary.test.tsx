import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, useErrorHandler } from '@/components/ErrorBoundary';
import { useNotifications } from '@/hooks/useNotifications';
import { errorLogger } from '@/utils/errorLogger';
import React from 'react';

// Mock the hooks and utilities
vi.mock('@/hooks/useNotifications');
vi.mock('@/utils/errorLogger');

// Test component that throws an error
const ThrowErrorComponent: React.FC<{ shouldThrow: boolean; message?: string }> = ({ 
  shouldThrow, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Component rendered successfully</div>;
};

// Test component that uses error handler hook
const ErrorHandlerTestComponent: React.FC<{ shouldReportError: boolean }> = ({ shouldReportError }) => {
  const { reportError } = useErrorHandler();
  
  const handleClick = () => {
    if (shouldReportError) {
      reportError(new Error('Manual error report'), { context: 'test' });
    }
  };
  
  return (
    <div>
      <button onClick={handleClick}>Report Error</button>
    </div>
  );
};

describe('ErrorBoundary', () => {
  const mockShowError = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotifications as vi.Mock).mockReturnValue({
      showError: mockShowError
    });
    
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} message="Test component error" />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test component error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent shouldThrow={true} message="Callback test error" />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Callback test error' }),
      expect.any(Object)
    );
  });

  it('shows different UI for isolated errors', () => {
    render(
      <ErrorBoundary isolate={true}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('This component encountered an error. Other parts of the application should still work.')).toBeInTheDocument();
    expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
  });

  it('resets error state when retry is clicked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Try Again'));
    
    // After retry, the component should re-render
    rerender(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });
  });

  it('stores error report in localStorage', () => {
    const localStorageMock = {
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} message="LocalStorage test error" />
      </ErrorBoundary>
    );
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'errorReports',
      expect.stringContaining('LocalStorage test error')
    );
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('reports errors manually', () => {
    render(<ErrorHandlerTestComponent shouldReportError={true} />);
    
    fireEvent.click(screen.getByText('Report Error'));
    
    // Should call error logger
    expect(errorLogger.error).toHaveBeenCalled();
  });

  it('does not report when no error occurs', () => {
    render(<ErrorHandlerTestComponent shouldReportError={false} />);
    
    fireEvent.click(screen.getByText('Report Error'));
    
    // Should not call error logger
    expect(errorLogger.error).not.toHaveBeenCalled();
  });
});

describe('Error Boundary Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('works with nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <div>
          <ErrorBoundary isolate={true}>
            <ThrowErrorComponent shouldThrow={true} message="Nested error" />
          </ErrorBoundary>
          <div>This should still render</div>
        </div>
      </ErrorBoundary>
    );
    
    // Inner error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Nested error')).toBeInTheDocument();
    
    // Content outside the inner boundary should still render
    expect(screen.getByText('This should still render')).toBeInTheDocument();
  });

  it('generates unique error IDs', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} message="First error" />
      </ErrorBoundary>
    );
    
    // Get first error ID
    const firstErrorElement = screen.getByText(/Error ID:/);
    const firstErrorId = firstErrorElement.textContent;
    
    // Reset and cause another error
    fireEvent.click(screen.getByText('Try Again'));
    
    rerender(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} message="Second error" />
      </ErrorBoundary>
    );
    
    const secondErrorElement = screen.getByText(/Error ID:/);
    const secondErrorId = secondErrorElement.textContent;
    
    // Error IDs should be different
    expect(firstErrorId).not.toBe(secondErrorId);
  });

  it('handles errors in development vs production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test development mode
    process.env.NODE_ENV = 'development';
    
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Show Technical Details')).toBeInTheDocument();
    
    unmount();
    
    // Test production mode
    process.env.NODE_ENV = 'production';
    
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.queryByText('Show Technical Details')).not.toBeInTheDocument();
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
});
