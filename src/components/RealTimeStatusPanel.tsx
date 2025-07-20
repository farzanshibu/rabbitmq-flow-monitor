import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useRealTimeTopology } from '@/hooks/useRealTimeTopology';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Radio, 
  Zap, 
  Clock,
  Server,
  GitBranch,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export const RealTimeStatusPanel: React.FC = () => {
  const {
    metrics,
    messageFlows,
    isConnected,
    connectionStatus,
    lastTopologyUpdate,
    setTransportPreference
  } = useRealTimeData();

  const {
    nodes,
    edges,
    isLoading,
    connectionStatus: topologyConnectionStatus,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    refreshTopology
  } = useRealTimeTopology();

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Update last update time when metrics change
  useEffect(() => {
    if (metrics.size > 0) {
      setLastUpdate(Date.now());
    }
  }, [metrics]);

  const totalMessageRate = Array.from(metrics.values()).reduce((sum, metric) => sum + metric.messageRate, 0);
  const activeNodes = Array.from(metrics.values()).filter(m => m.status === 'active').length;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            Real-Time Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {connectionStatus}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Transport:</span>
            <Badge variant="outline">
              {connectionStatus.includes('ws') ? 'WebSocket' : 
               connectionStatus.includes('sse') ? 'SSE' : 'HTTP'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Topology:</span>
            <Badge variant={topologyConnectionStatus === 'connected' ? 'default' : 'secondary'}>
              {topologyConnectionStatus}
            </Badge>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransportPreference('websocket')}
              className="text-xs"
            >
              Use WebSocket
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransportPreference('sse')}
              className="text-xs"
            >
              Use SSE
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            Live Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Active Nodes:</span>
              <div className="font-medium">{activeNodes}</div>
            </div>
            <div>
              <span className="text-gray-600">Message Rate:</span>
              <div className="font-medium">{totalMessageRate.toFixed(1)}/s</div>
            </div>
            <div>
              <span className="text-gray-600">Live Flows:</span>
              <div className="font-medium">{messageFlows.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Topology Nodes:</span>
              <div className="font-medium">{nodes.length}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Last Update:</span>
            <span className="font-mono">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          </div>

          {lastTopologyUpdate && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Topology Update:</span>
              <span className="font-mono">
                {new Date(lastTopologyUpdate).toLocaleTimeString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4" />
            Real-Time Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Real-Time Mode:</span>
            <Badge variant={isRealTimeEnabled ? 'default' : 'secondary'}>
              {isRealTimeEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isRealTimeEnabled ? 'default' : 'outline'}
              onClick={enableRealTime}
              className="flex-1 text-xs"
            >
              <Radio className="w-3 h-3 mr-1" />
              Enable
            </Button>
            <Button
              size="sm"
              variant={!isRealTimeEnabled ? 'default' : 'outline'}
              onClick={disableRealTime}
              className="flex-1 text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              Polling
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={refreshTopology}
            disabled={isLoading}
            className="w-full text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Topology
          </Button>
        </CardContent>
      </Card>

      {/* Current Flow Activity */}
      {messageFlows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              Active Message Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {messageFlows.slice(-5).map((flow) => (
                <div key={flow.id} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-green-600">
                      {flow.fromNodeId} → {flow.toNodeId}
                    </span>
                    <span className="text-gray-500">
                      {new Date(flow.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {flow.routingKey && (
                    <div className="text-gray-600 mt-1">
                      Key: {flow.routingKey}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Real-time connection is not active. Message flows and live metrics may not be available.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RealTimeStatusPanel;
