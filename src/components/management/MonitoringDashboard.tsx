import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Server,
  Users,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface MetricData {
  timestamp: number;
  value: number;
  label?: string;
}

interface AlertThreshold {
  id: string;
  metric: string;
  condition: 'above' | 'below';
  value: number;
  enabled: boolean;
}

interface MonitoringDashboardProps {
  onRefresh?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ onRefresh }) => {
  const [metrics, setMetrics] = useState<{
    messageRate: MetricData[];
    queueDepth: MetricData[];
    consumerCount: MetricData[];
    connectionCount: MetricData[];
  }>({
    messageRate: [],
    queueDepth: [],
    consumerCount: [],
    connectionCount: []
  });

  const [currentMetrics, setCurrentMetrics] = useState({
    totalMessages: 0,
    messagesPerSecond: 0,
    totalQueues: 0,
    totalExchanges: 0,
    totalConnections: 0,
    totalConsumers: 0,
    systemMemory: 0,
    diskSpace: 0
  });

  const [alerts, setAlerts] = useState<AlertThreshold[]>([
    { id: '1', metric: 'Queue Depth', condition: 'above', value: 1000, enabled: true },
    { id: '2', metric: 'Message Rate', condition: 'above', value: 100, enabled: true },
    { id: '3', metric: 'Consumer Count', condition: 'below', value: 1, enabled: true },
  ]);

  const [activeAlerts, setActiveAlerts] = useState<Array<{
    id: string;
    message: string;
    severity: 'warning' | 'error';
    timestamp: number;
  }>>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Fetch metrics from server
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/metrics');
        if (response.ok) {
          const data = await response.json();
          
          // Update current metrics
          setCurrentMetrics({
            totalMessages: data.totalMessages || 0,
            messagesPerSecond: data.messagesPerSecond || 0,
            totalQueues: data.totalQueues || 0,
            totalExchanges: data.totalExchanges || 0,
            totalConnections: data.totalConnections || 0,
            totalConsumers: data.totalConsumers || 0,
            systemMemory: data.systemMemory || 0,
            diskSpace: data.diskSpace || 0
          });

          // Update time series data
          const now = Date.now();
          setMetrics(prev => ({
            messageRate: [...prev.messageRate.slice(-19), { timestamp: now, value: data.messagesPerSecond || 0 }],
            queueDepth: [...prev.queueDepth.slice(-19), { timestamp: now, value: data.totalQueueDepth || 0 }],
            consumerCount: [...prev.consumerCount.slice(-19), { timestamp: now, value: data.totalConsumers || 0 }],
            connectionCount: [...prev.connectionCount.slice(-19), { timestamp: now, value: data.totalConnections || 0 }]
          }));

          setLastUpdate(now);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setIsConnected(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Check for alert conditions
  useEffect(() => {
    const checkAlerts = () => {
      const newAlerts: typeof activeAlerts = [];

      alerts.forEach(alert => {
        if (!alert.enabled) return;

        let currentValue = 0;
        switch (alert.metric) {
          case 'Queue Depth':
            currentValue = metrics.queueDepth[metrics.queueDepth.length - 1]?.value || 0;
            break;
          case 'Message Rate':
            currentValue = currentMetrics.messagesPerSecond;
            break;
          case 'Consumer Count':
            currentValue = currentMetrics.totalConsumers;
            break;
        }

        const isTriggered = alert.condition === 'above' 
          ? currentValue > alert.value 
          : currentValue < alert.value;

        if (isTriggered) {
          newAlerts.push({
            id: alert.id,
            message: `${alert.metric} is ${alert.condition} ${alert.value} (current: ${currentValue})`,
            severity: alert.condition === 'above' ? 'warning' : 'error',
            timestamp: Date.now()
          });
        }
      });

      setActiveAlerts(newAlerts);
    };

    checkAlerts();
  }, [metrics, currentMetrics, alerts]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getMetricTrend = (data: MetricData[]) => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-3);
    const trend = recent[recent.length - 1].value - recent[0].value;
    if (Math.abs(trend) < 1) return 'stable';
    return trend > 0 ? 'up' : 'down';
  };

  const renderMiniChart = (data: MetricData[], color: string) => {
    if (data.length < 2) return null;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((point.value - minValue) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Thresholds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Connection Status */}
          <Alert variant={isConnected ? 'default' : 'destructive'}>
            <Activity className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isConnected 
                  ? `Connected • Last update: ${new Date(lastUpdate).toLocaleTimeString()}` 
                  : 'Disconnected from monitoring service'
                }
              </span>
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </AlertDescription>
          </Alert>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">{activeAlerts.length} Active Alert(s)</div>
                  {activeAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="text-sm">
                      • {alert.message}
                    </div>
                  ))}
                  {activeAlerts.length > 3 && (
                    <div className="text-sm">+ {activeAlerts.length - 3} more alerts</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages/sec</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(currentMetrics.messagesPerSecond)}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getMetricTrend(metrics.messageRate) === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {getMetricTrend(metrics.messageRate) === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(currentMetrics.totalMessages)} total
                  </p>
                </div>
                {renderMiniChart(metrics.messageRate, '#3b82f6')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.queueDepth[metrics.queueDepth.length - 1]?.value || 0)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {getMetricTrend(metrics.queueDepth) === 'up' && <TrendingUp className="h-3 w-3 text-yellow-500" />}
                  {getMetricTrend(metrics.queueDepth) === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
                  <p className="text-xs text-muted-foreground">
                    across {currentMetrics.totalQueues} queues
                  </p>
                </div>
                {renderMiniChart(metrics.queueDepth, '#f59e0b')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consumers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.totalConsumers}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getMetricTrend(metrics.consumerCount) === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {getMetricTrend(metrics.consumerCount) === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  <p className="text-xs text-muted-foreground">
                    active consumers
                  </p>
                </div>
                {renderMiniChart(metrics.consumerCount, '#10b981')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connections</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentMetrics.totalConnections}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getMetricTrend(metrics.connectionCount) === 'up' && <TrendingUp className="h-3 w-3 text-blue-500" />}
                  {getMetricTrend(metrics.connectionCount) === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  <p className="text-xs text-muted-foreground">
                    open connections
                  </p>
                </div>
                {renderMiniChart(metrics.connectionCount, '#6366f1')}
              </CardContent>
            </Card>
          </div>

          {/* System Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Memory Usage</span>
                  <span className="font-mono">{formatBytes(currentMetrics.systemMemory)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Disk Space</span>
                  <span className="font-mono">{formatBytes(currentMetrics.diskSpace)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Exchanges</span>
                  <span className="font-mono">{currentMetrics.totalExchanges}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queues</span>
                  <span className="font-mono">{currentMetrics.totalQueues}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Health Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">RabbitMQ Server</span>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Healthy' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Message Processing</span>
                  <span className={`text-sm font-medium ${currentMetrics.messagesPerSecond > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {currentMetrics.messagesPerSecond > 0 ? 'Active' : 'Idle'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Consumer Health</span>
                  <span className={`text-sm font-medium ${currentMetrics.totalConsumers > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {currentMetrics.totalConsumers > 0 ? 'Good' : 'No Consumers'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Alerts</span>
                  <span className={`text-sm font-medium ${activeAlerts.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {activeAlerts.length === 0 ? 'None' : `${activeAlerts.length} Active`}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
              <CardDescription>
                Real-time performance metrics with historical trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Charts Coming Soon</h3>
                <p>This section will include detailed time-series charts and advanced metrics visualization.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
              <CardDescription>
                Set up thresholds and notifications for monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{alert.metric}</div>
                      <div className="text-sm text-muted-foreground">
                        Alert when {alert.condition} {alert.value}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-2 py-1 rounded ${alert.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;
