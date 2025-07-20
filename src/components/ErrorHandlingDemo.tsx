import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  Info,
  CheckCircle,
  Bug,
  Network,
  Zap
} from 'lucide-react';

import { useNotifications, useApiNotifications } from '@/hooks/useNotifications';
import { useErrorLogger } from '@/utils/errorLogger';
import { useRetry, retryPresets } from '@/hooks/useRetry';
import { ErrorBoundary, useErrorHandler } from '@/components/ErrorBoundary';

const ErrorHandlingDemo: React.FC = () => {
  const notifications = useNotifications();
  const apiNotifications = useApiNotifications();
  const { logError, logWarning, logInfo, getLogs, clearLogs, getLogsSummary, downloadLogs } = useErrorLogger();
  const { reportError } = useErrorHandler();
  
  const [simulatedError, setSimulatedError] = useState('');
  const [asyncError, setAsyncError] = useState('');
  
  // Retry demo
  const retryDemo = useRetry(
    async () => {
      if (Math.random() < 0.7) {
        throw new Error('Random failure for demo');
      }
      return 'Success!';
    },
    {
      ...retryPresets.api,
      onRetry: (attempt, error) => {
        notifications.showWarning(`Retry attempt ${attempt}`, {
          description: error.message
        });
      }
    }
  );

  const handleComponentError = () => {
    throw new Error(simulatedError || 'Simulated component error');
  };

  const handleAsyncError = async () => {
    try {
      throw new Error(asyncError || 'Simulated async error');
    } catch (error) {
      reportError(error as Error, { context: 'async operation demo' });
      notifications.showError('Async operation failed', {
        description: (error as Error).message
      });
    }
  };

  const handleApiError = async () => {
    const result = await apiNotifications.notifyApiOperation(
      async () => {
        if (Math.random() < 0.8) {
          return { success: false, error: 'Simulated API failure' };
        }
        return { success: true, data: { message: 'API success' } };
      },
      'Test API operation',
      'demo endpoint'
    );
    
    if (result) {
      console.log('API operation succeeded:', result);
    }
  };

  const handleRetryDemo = async () => {
    try {
      const result = await retryDemo.execute();
      notifications.showSuccess('Retry demo succeeded!', {
        description: `Result: ${result}`
      });
    } catch (error) {
      notifications.showError('Retry demo failed', {
        description: `Failed after ${retryDemo.state.attemptCount} attempts`
      });
    }
  };

  const testNotifications = () => {
    notifications.showSuccess('Success notification', {
      description: 'This is a success message'
    });
    
    setTimeout(() => {
      notifications.showWarning('Warning notification', {
        description: 'This is a warning message'
      });
    }, 1000);
    
    setTimeout(() => {
      notifications.showError('Error notification', {
        description: 'This is an error message'
      });
    }, 2000);
    
    setTimeout(() => {
      notifications.showInfo('Info notification', {
        description: 'This is an info message'
      });
    }, 3000);
  };

  const testLogging = () => {
    logInfo('ErrorHandlingDemo', 'Testing info log', {
      component: 'ErrorHandlingDemo',
      action: 'testLogging'
    });
    
    logWarning('ErrorHandlingDemo', 'Testing warning log', {
      component: 'ErrorHandlingDemo',
      action: 'testLogging',
      context: { warningType: 'demo' }
    });
    
    logError('ErrorHandlingDemo', 'Testing error log', {
      component: 'ErrorHandlingDemo',
      action: 'testLogging',
      error: new Error('Demo error'),
      context: { errorType: 'demo' }
    });
  };

  const logs = getLogs();
  const logsSummary = getLogsSummary();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Handling & User Feedback Demo
          </CardTitle>
          <CardDescription>
            Comprehensive error handling, notifications, logging, and retry mechanisms
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="errors">Error Boundaries</TabsTrigger>
          <TabsTrigger value="retry">Retry Mechanisms</TabsTrigger>
          <TabsTrigger value="logging">Error Logging</TabsTrigger>
          <TabsTrigger value="api">API Error Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification System</CardTitle>
              <CardDescription>
                Test different types of notifications with icons and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testNotifications}>
                Show All Notification Types
              </Button>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  onClick={() => notifications.showSuccess('Success!')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Success
                </Button>
                
                <Button 
                  onClick={() => notifications.showError('Error!')}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  Error
                </Button>
                
                <Button 
                  onClick={() => notifications.showWarning('Warning!')}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Warning
                </Button>
                
                <Button 
                  onClick={() => notifications.showInfo('Info!')}
                  className="flex items-center gap-2"
                >
                  <Info className="h-4 w-4" />
                  Info
                </Button>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    const id = notifications.showLoading('Processing...');
                    setTimeout(() => {
                      notifications.updateNotification(id, 'success', 'Processing complete!');
                    }, 3000);
                  }}
                  className="w-full"
                >
                  Test Loading → Success Flow
                </Button>
                
                <Button 
                  onClick={() => notifications.dismissAll()}
                  className="w-full"
                >
                  Dismiss All Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Boundary Testing</CardTitle>
              <CardDescription>
                Test error boundaries and component error handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="error-message">Error Message</Label>
                <Input
                  id="error-message"
                  value={simulatedError}
                  onChange={(e) => setSimulatedError(e.target.value)}
                  placeholder="Enter error message to simulate"
                />
              </div>
              
              <ErrorBoundary isolate={true}>
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-4">This component is wrapped in an error boundary.</p>
                    <Button onClick={handleComponentError}>
                      Trigger Component Error
                    </Button>
                  </CardContent>
                </Card>
              </ErrorBoundary>
              
              <div className="space-y-2">
                <Label htmlFor="async-error">Async Error Message</Label>
                <Input
                  id="async-error"
                  value={asyncError}
                  onChange={(e) => setAsyncError(e.target.value)}
                  placeholder="Enter async error message"
                />
              </div>
              
              <Button onClick={handleAsyncError} className="w-full">
                Trigger Async Error (Manual Reporting)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retry Mechanisms</CardTitle>
              <CardDescription>
                Test automatic retry with exponential backoff
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Network className="h-4 w-4" />
                <AlertTitle>Retry Demo</AlertTitle>
                <AlertDescription>
                  This operation has a 70% failure rate. The retry mechanism will attempt up to 3 times with exponential backoff.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleRetryDemo} 
                  disabled={retryDemo.state.isRetrying}
                  className="flex items-center gap-2"
                >
                  {retryDemo.state.isRetrying ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {retryDemo.state.isRetrying ? 'Retrying...' : 'Test Retry Logic'}
                </Button>
                
                <Button onClick={retryDemo.reset} disabled={retryDemo.state.isRetrying}>
                  Reset
                </Button>
              </div>
              
              {retryDemo.state.attemptCount > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Attempt Count:</span>
                        <Badge>{retryDemo.state.attemptCount}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Is Retrying:</span>
                        <Badge>
                          {retryDemo.state.isRetrying ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      
                      {retryDemo.state.lastError && (
                        <div className="space-y-1">
                          <span className="font-medium">Last Error:</span>
                          <p className="text-sm text-muted-foreground font-mono">
                            {retryDemo.state.lastError.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logging System</CardTitle>
              <CardDescription>
                Comprehensive error logging with local storage and export capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={testLogging}>
                  Generate Test Logs
                </Button>
                
                <Button onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Logs
                </Button>
                
                <Button onClick={downloadLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{logsSummary.total}</div>
                    <div className="text-sm text-muted-foreground">Total Logs</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{logsSummary.byLevel.error}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{logsSummary.byLevel.warning}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{logsSummary.byLevel.info}</div>
                    <div className="text-sm text-muted-foreground">Info</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {logs.slice(0, 10).map((log) => (
                        <Card key={log.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge>
                                    {log.level}
                                  </Badge>
                                  <span className="text-sm font-medium">{log.source}</span>
                                </div>
                                <p className="text-sm">{log.message}</p>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {logs.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No logs available. Generate some test logs to see them here.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Error Handling</CardTitle>
              <CardDescription>
                Test API operations with automatic retry and user feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>API Demo</AlertTitle>
                <AlertDescription>
                  This simulates API calls with an 80% failure rate to demonstrate retry mechanisms and user feedback.
                </AlertDescription>
              </Alert>
              
              <Button onClick={handleApiError} className="w-full">
                Test API Operation with Auto-Retry
              </Button>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    apiNotifications.notifyApiResult(
                      { success: true, message: 'Operation completed successfully' },
                      'Create',
                      'test resource'
                    );
                  }}
                  className="w-full"
                >
                  Simulate Successful API Response
                </Button>
                
                <Button 
                  onClick={() => {
                    apiNotifications.notifyApiResult(
                      { success: false, error: 'Validation failed: Invalid input data' },
                      'Update',
                      'test resource'
                    );
                  }}
                  className="w-full"
                >
                  Simulate Failed API Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ErrorHandlingDemo;
