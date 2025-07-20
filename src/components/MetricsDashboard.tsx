import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Clock, Users, Inbox, Database, Wifi } from 'lucide-react';
import { RabbitMQMetrics } from '@/services/rabbitmqWebSocket';

interface MetricsDashboardProps {
  metrics: Map<string, RabbitMQMetrics>;
  isConnected: boolean;
  useMockData?: boolean;
  toggleMockData?: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ 
  metrics, 
  isConnected, 
  useMockData = false, 
  toggleMockData 
}) => {
  // Calculate aggregate metrics
  const totalMessageRate = Array.from(metrics.values()).reduce((sum, metric) => sum + metric.messageRate, 0);
  const totalQueues = Array.from(metrics.keys()).filter(id => id.startsWith('queue')).length;
  const totalProducers = Array.from(metrics.keys()).filter(id => id.startsWith('producer')).length;
  const totalConsumers = Array.from(metrics.keys()).filter(id => id.startsWith('consumer')).length;
  const totalExchanges = Array.from(metrics.keys()).filter(id => id.startsWith('exchange')).length;

  // Get queue metrics for detailed view
  const queueMetrics = Array.from(metrics.entries())
    .filter(([id]) => id.startsWith('queue'))
    .map(([id, metric]) => ({ id, ...metric }));

  // Get producer metrics
  const producerMetrics = Array.from(metrics.entries())
    .filter(([id]) => id.startsWith('producer'))
    .map(([id, metric]) => ({ id, ...metric }));

  // Get consumer metrics
  const consumerMetrics = Array.from(metrics.entries())
    .filter(([id]) => id.startsWith('consumer'))
    .map(([id, metric]) => ({ id, ...metric }));

  const getStatusBadge = (status: string) => {
    return <Badge>{status}</Badge>;
  };

  const getStatusCounts = () => {
    const counts = { active: 0, warning: 0, error: 0, idle: 0 };
    Array.from(metrics.values()).forEach(metric => {
      counts[metric.status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Metrics Dashboard</h2>
        <div className="flex items-center gap-4">
          {/* Data Source Toggle */}
          {toggleMockData && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMockData}
                className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${
                  useMockData 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 border'
                }`}
              >
                <Database className="w-3 h-3" />
                {useMockData ? 'Demo Data' : 'Live Data'}
              </button>
              <span className="text-xs text-muted-foreground">
                {useMockData ? 'Showing demo data' : 'Attempting live connection'}
              </span>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              useMockData ? 'bg-blue-500' : 
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {useMockData ? 'Demo Mode' : 
               isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessageRate.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">messages/second</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Components</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.active}</div>
            <p className="text-xs text-muted-foreground">
              {statusCounts.warning} warnings, {statusCounts.error} errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueMetrics.reduce((sum, q) => sum + (q.messageCount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">total messages queued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topology</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div>{totalProducers} Producers</div>
              <div>{totalExchanges} Exchanges</div>
              <div>{totalQueues} Queues</div>
              <div>{totalConsumers} Consumers</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Queue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {queueMetrics.slice(0, 5).map((queue) => (
              <div key={queue.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{queue.id.replace('queue-', 'Queue ')}</span>
                  {getStatusBadge(queue.status)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Messages:</span>
                    <div className="font-mono">{(queue.messageCount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rate:</span>
                    <div className="font-mono">{queue.messageRate.toFixed(1)}/s</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumers:</span>
                    <div className="font-mono">{queue.consumerCount || 0}</div>
                  </div>
                </div>
                <Progress 
                  value={Math.min((queue.messageCount || 0) / 10, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Producer & Consumer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Producer & Consumer Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Producers</h4>
              {producerMetrics.slice(0, 3).map((producer) => (
                <div key={producer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{producer.id.replace('producer-', 'Producer ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{producer.messageRate.toFixed(1)}/s</span>
                    {getStatusBadge(producer.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Consumers</h4>
              {consumerMetrics.slice(0, 3).map((consumer) => (
                <div key={consumer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{consumer.id.replace('consumer-', 'Consumer ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{consumer.messageRate.toFixed(1)}/s</span>
                    {getStatusBadge(consumer.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        <Clock className="h-3 w-3 inline mr-1" />
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};
