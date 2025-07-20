import TopologyVisualization from '@/components/TopologyVisualization';
import { VirtualizedTopology } from '@/components/VirtualizedTopology';
import { SimplePerformanceTest } from '@/components/SimplePerformanceTest';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { ManagementInterface } from '@/components/ManagementInterface';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingWrapper, TopologySkeleton, DashboardSkeleton, ManagementSkeleton } from '@/components/LoadingStates';
import { RealTimeStatusPanel } from '@/components/RealTimeStatusPanel';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useRealTimeTopology } from '@/hooks/useRealTimeTopology';
import { useNotifications } from '@/hooks/useNotifications';
import { useErrorLogger } from '@/utils/errorLogger';
import { TopologyData } from '@/services/rabbitmqAPI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, MessageSquare, Users, BarChart3, GitBranch, Settings, AlertTriangle, Bug, Zap, Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import ErrorHandlingDemo from '@/components/ErrorHandlingDemo';

const Index = () => {
  const { 
    metrics, 
    messageFlows, 
    isConnected, 
    connectionAttempts, 
    connectionStatus,
    lastTopologyUpdate,
    clearMessageFlow,
    refreshTopology: refreshRealTimeTopology,
    setTransportPreference
  } = useRealTimeData();
  
  const realTimeTopology = useRealTimeTopology();
  const notifications = useNotifications();
  const { logInfo, logWarning } = useErrorLogger();
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Monitor connection status and provide user feedback
  useEffect(() => {
    if (!isConnected && connectionAttempts > 0) {
      setConnectionError('Failed to connect to RabbitMQ monitoring service');
      
      if (connectionAttempts === 1) {
        notifications.showWarning('Connection Issues', {
          description: 'Attempting to connect to RabbitMQ monitoring service...',
          persist: true
        });
        
        logWarning('ConnectionMonitor', 'Initial connection attempt failed', {
          component: 'Index',
          context: { connectionAttempts }
        });
      } else if (connectionAttempts >= 3) {
        notifications.showError('Connection Failed', {
          description: 'Unable to establish connection to monitoring service. Please check if the server is running.',
          action: {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        });
        
        logWarning('ConnectionMonitor', 'Multiple connection attempts failed', {
          component: 'Index',
          context: { connectionAttempts }
        });
      }
    } else if (isConnected && connectionError) {
      setConnectionError(null);
      notifications.showSuccess('Connected', {
        description: 'Successfully connected to RabbitMQ monitoring service'
      });
      
      logInfo('ConnectionMonitor', 'Connection established successfully', {
        component: 'Index',
        context: { connectionAttempts }
      });
    }
  }, [isConnected, connectionAttempts, connectionError, notifications, logWarning, logInfo]);

  // Calculate real-time stats
  const totalMessageRate = Array.from(metrics.values()).reduce((sum, metric) => sum + metric.messageRate, 0);
  const activeConsumers = Array.from(metrics.values()).filter(m => m.nodeId.startsWith('consumer') && m.status === 'active').length;
  const totalQueueDepth = Array.from(metrics.values())
    .filter(m => m.nodeId.startsWith('queue'))
    .reduce((sum, metric) => sum + (metric.messageCount || 0), 0);

  const handleRefresh = () => {
    logInfo('Index', 'Manual refresh triggered', {
      component: 'Index',
      action: 'refresh'
    });
    
    notifications.showInfo('Refreshing', {
      description: 'Updating topology and metrics...'
    });
    
    // Refresh both real-time data and topology
    Promise.all([
      refreshRealTimeTopology(),
      realTimeTopology.refreshTopology()
    ]).then(() => {
      notifications.showSuccess('Refreshed', {
        description: 'Data updated successfully'
      });
    }).catch(error => {
      notifications.showError('Refresh Failed', {
        description: error.message || 'Failed to refresh data'
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Connection Error Alert */}
      {connectionError && (
        <div className="absolute top-4 right-4 z-30 max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {connectionError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="relative">
        <Tabs defaultValue="topology" className="h-full">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <TabsList className="bg-card/95 backdrop-blur-sm border border-border/60">
              <TabsTrigger value="topology" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Topology
              </TabsTrigger>
              <TabsTrigger value="realtime" className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Real-Time
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Management
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="error-demo" className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Error Demo
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="topology" className="h-full m-0">
            <ErrorBoundary isolate={true}>
              <LoadingWrapper
                isLoading={isLoading}
                skeleton={<TopologySkeleton />}
                error={connectionError}
                retry={() => window.location.reload()}
              >
                <TopologyVisualization 
                  metrics={metrics}
                  messageFlows={messageFlows}
                  isConnected={isConnected}
                  connectionAttempts={connectionAttempts}
                  clearMessageFlow={clearMessageFlow}
                />
              </LoadingWrapper>
            </ErrorBoundary>
            
            {/* Compact Quick Stats Overlay for Topology View */}
            <div className="absolute top-2 left-12 z-10">
              <ErrorBoundary isolate={true}>
                <Card className="bg-card/95 backdrop-blur-sm border-border/60 shadow-lg w-36">
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Activity className="w-3 h-3 text-primary" />
                      Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pb-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Msg/s</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-green-600">
                          {totalMessageRate.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Cons</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-primary">{activeConsumers}</div>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-border/60">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Depth</span>
                          <span className="font-medium text-xs">{totalQueueDepth > 999 ? `${(totalQueueDepth / 1000).toFixed(1)}k` : totalQueueDepth}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full progress-bar ${
                              totalQueueDepth > 1000 ? 'bg-red-500' :
                              totalQueueDepth > 500 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {isConnected && (
                      <div className="pt-1 border-t border-border/60 text-center">
                        <div className="text-xs text-green-600 flex items-center justify-center gap-1">
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                          Live
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="realtime" className="h-full m-0 pt-16 overflow-auto">
            <ErrorBoundary isolate={true}>
              <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Real-Time Status Panel */}
                  <div className="lg:col-span-1">
                    <RealTimeStatusPanel />
                  </div>
                  
                  {/* Main Topology View */}
                  <div className="lg:col-span-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Radio className="w-5 h-5" />
                          Live RabbitMQ Topology
                          {isConnected && (
                            <Badge className="ml-auto bg-green-100 text-green-700">
                              Live
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Real-time visualization of RabbitMQ topology with live message flows
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[600px] border rounded-lg">
                          {realTimeTopology.nodes.length > 0 ? (
                            <TopologyVisualization
                              metrics={metrics}
                              messageFlows={messageFlows}
                              isConnected={isConnected}
                              connectionAttempts={0}
                              clearMessageFlow={clearMessageFlow}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No topology data available</p>
                                <p className="text-sm">Check RabbitMQ connection</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="metrics" className="h-full m-0 pt-10">
            <ErrorBoundary isolate={true}>
              <LoadingWrapper
                isLoading={isLoading}
                skeleton={<DashboardSkeleton />}
                error={connectionError}
                retry={() => window.location.reload()}
              >
                <MetricsDashboard 
                  metrics={metrics} 
                  isConnected={isConnected} 
                />
              </LoadingWrapper>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="management" className="h-full m-0 pt-16">
            <ErrorBoundary isolate={true}>
              <LoadingWrapper
                isLoading={isLoading}
                skeleton={<ManagementSkeleton type="queue" />}
                error={connectionError}
                retry={() => window.location.reload()}
              >
                <ManagementInterface 
                  isConnected={isConnected} 
                  onRefresh={handleRefresh}
                />
              </LoadingWrapper>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="performance" className="h-full m-0 pt-10 overflow-auto">
            <ErrorBoundary isolate={true}>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Optimized Topology View */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="w-5 h-5" />
                        Real-Time Topology
                      </CardTitle>
                      <CardDescription>
                        Live topology visualization with real-time updates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {realTimeTopology.nodes.length > 0 && (
                        <TopologyVisualization
                          metrics={metrics}
                          messageFlows={messageFlows}
                          isConnected={isConnected}
                          connectionAttempts={0}
                          clearMessageFlow={clearMessageFlow}
                        />
                      )}
                      
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Real-Time Status:</span>
                          <div className="font-medium flex items-center gap-1">
                            {isConnected ? (
                              <>
                                <Wifi className="w-3 h-3 text-green-600" />
                                Connected
                              </>
                            ) : (
                              <>
                                <WifiOff className="w-3 h-3 text-red-600" />
                                Disconnected
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Connection:</span>
                          <div className="font-medium">
                            {connectionStatus}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Updated:</span>
                          <div className="font-medium">
                            {realTimeTopology.lastUpdated ? new Date(realTimeTopology.lastUpdated).toLocaleTimeString() : 'Never'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Loading:</span>
                          <div className="font-medium">
                            {realTimeTopology.isLoading ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={realTimeTopology.refreshTopology}
                          disabled={realTimeTopology.isLoading}
                          className="h-9 px-3 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${realTimeTopology.isLoading ? 'animate-spin' : ''}`} />
                          Refresh Data
                        </button>
                        <button
                          onClick={() => {
                            if (realTimeTopology.isRealTimeEnabled) {
                              realTimeTopology.disableRealTime();
                              notifications.showInfo('Real-Time Disabled', {
                                description: 'Switched to periodic refresh mode'
                              });
                            } else {
                              realTimeTopology.enableRealTime();
                              notifications.showSuccess('Real-Time Enabled', {
                                description: 'Live updates are now active'
                              });
                            }
                          }}
                          className={`h-9 px-3 text-sm border rounded flex items-center gap-1 ${
                            realTimeTopology.isRealTimeEnabled 
                              ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' 
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {realTimeTopology.isRealTimeEnabled ? (
                            <>
                              <Radio className="w-3 h-3" />
                              Real-Time On
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Periodic Mode
                            </>
                          )}
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Real-Time Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Real-Time Statistics</CardTitle>
                      <CardDescription>
                        Current topology metrics and real-time status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Queue Count:</span>
                            <div className="font-medium">{realTimeTopology.nodes.filter(n => n.type === 'queue').length}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Exchange Count:</span>
                            <div className="font-medium">{realTimeTopology.nodes.filter(n => n.type?.includes('exchange')).length}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Active Flows:</span>
                            <div className="font-medium">{messageFlows.length}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Data Source:</span>
                            <div className="font-medium">
                              {realTimeTopology.dataSource === 'rabbitmq' ? 'Live RabbitMQ' : 'No Data'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Transport:</span>
                            <div className="font-medium">
                              {connectionStatus.includes('ws') ? 'WebSocket' : 
                               connectionStatus.includes('sse') ? 'SSE' : 'HTTP'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Last Topology Update:</span>
                            <div className="font-medium">
                              {lastTopologyUpdate ? new Date(lastTopologyUpdate).toLocaleTimeString() : 'Never'}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Transport Options</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setTransportPreference('websocket')}
                              className={`px-2 py-1 text-xs rounded ${
                                connectionStatus.includes('ws') 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              WebSocket
                            </button>
                            <button
                              onClick={() => setTransportPreference('sse')}
                              className={`px-2 py-1 text-xs rounded ${
                                connectionStatus.includes('sse') 
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              SSE
                            </button>
                            <button
                              onClick={() => setTransportPreference('auto')}
                              className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 border border-purple-300"
                            >
                              Auto
                            </button>
                          </div>
                        </div>

                        {realTimeTopology.error && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {realTimeTopology.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Test Suite */}
                <SimplePerformanceTest />
              </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="error-demo" className="h-full m-0 pt-10 overflow-auto">
            <ErrorBoundary isolate={true}>
              <ErrorHandlingDemo />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
