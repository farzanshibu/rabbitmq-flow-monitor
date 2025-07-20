import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Trash2, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle,
  Clock,
  MessageSquare,
  Users,
  BarChart3
} from 'lucide-react';

interface VirtualConsumer {
  id: string;
  name: string;
  queueName: string;
  prefetchCount: number;
  ackMode: 'auto' | 'manual';
  processingDelay: number; // ms
  errorRate: number; // 0-100%
  status: 'stopped' | 'running' | 'paused';
  messagesProcessed: number;
  messagesPerSecond: number;
  lastActivity: number;
  createdAt: number;
}

interface VirtualConsumerManagerProps {
  onRefresh?: () => void;
}

export const VirtualConsumerManager: React.FC<VirtualConsumerManagerProps> = ({ onRefresh }) => {
  const [consumers, setConsumers] = useState<VirtualConsumer[]>([]);
  const [queues, setQueues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('consumers');

  // Form state for creating new consumer
  const [newConsumer, setNewConsumer] = useState({
    name: '',
    queueName: '',
    prefetchCount: 1,
    ackMode: 'auto' as 'auto' | 'manual',
    processingDelay: 1000,
    errorRate: 0
  });

  // Load available queues
  useEffect(() => {
    const loadQueues = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/queues');
        if (response.ok) {
          const data = await response.json();
          setQueues(data.map((q: { name: string }) => q.name));
        }
      } catch (error) {
        console.error('Failed to load queues:', error);
      }
    };

    loadQueues();
  }, []);

  // Load existing consumers
  useEffect(() => {
    const loadConsumers = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/virtual-consumers');
        if (response.ok) {
          const data = await response.json();
          setConsumers(data);
        }
      } catch (error) {
        console.error('Failed to load virtual consumers:', error);
      }
    };

    loadConsumers();
    const interval = setInterval(loadConsumers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const createConsumer = async () => {
    if (!newConsumer.name || !newConsumer.queueName) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/virtual-consumers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newConsumer,
          id: `consumer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      });

      if (response.ok) {
        const consumer = await response.json();
        setConsumers(prev => [...prev, consumer]);
        setNewConsumer({
          name: '',
          queueName: '',
          prefetchCount: 1,
          ackMode: 'auto',
          processingDelay: 1000,
          errorRate: 0
        });
      }
    } catch (error) {
      console.error('Failed to create consumer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const controlConsumer = async (consumerId: string, action: 'start' | 'pause' | 'stop') => {
    try {
      const response = await fetch(`http://localhost:8081/api/virtual-consumers/${consumerId}/${action}`, {
        method: 'POST'
      });

      if (response.ok) {
        setConsumers(prev => 
          prev.map(c => 
            c.id === consumerId 
              ? { ...c, status: action === 'start' ? 'running' : action === 'pause' ? 'paused' : 'stopped' }
              : c
          )
        );
      }
    } catch (error) {
      console.error(`Failed to ${action} consumer:`, error);
    }
  };

  const deleteConsumer = async (consumerId: string) => {
    try {
      const response = await fetch(`http://localhost:8081/api/virtual-consumers/${consumerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConsumers(prev => prev.filter(c => c.id !== consumerId));
      }
    } catch (error) {
      console.error('Failed to delete consumer:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'stopped': return <Square className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
        status === 'running' ? 'border-green-200 bg-green-100 text-green-800' :
        status === 'paused' ? 'border-yellow-200 bg-yellow-100 text-yellow-800' :
        'border-gray-200 bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    );
  };

  const formatRate = (rate: number) => {
    if (rate === 0) return '0';
    if (rate < 1) return rate.toFixed(2);
    return rate.toFixed(1);
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consumers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Consumers ({consumers.length})
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Consumer
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumers" className="space-y-4">
          {consumers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Virtual Consumers</h3>
                    <p className="text-sm text-muted-foreground">
                      Create virtual consumers to simulate message processing
                    </p>
                  </div>
                  <Button onClick={() => setActiveTab('create')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Consumer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {consumers.map((consumer) => (
                <Card key={consumer.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(consumer.status)}
                        <div>
                          <CardTitle className="text-lg">{consumer.name}</CardTitle>
                          <CardDescription>Queue: {consumer.queueName}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(consumer.status)}
                        <div className="flex items-center gap-1">
                          {consumer.status === 'stopped' ? (
                            <button
                              onClick={() => controlConsumer(consumer.id, 'start')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <Play className="w-3 h-3" />
                              Start
                            </button>
                          ) : consumer.status === 'running' ? (
                            <button
                              onClick={() => controlConsumer(consumer.id, 'pause')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                            >
                              <Pause className="w-3 h-3" />
                              Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => controlConsumer(consumer.id, 'start')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <Play className="w-3 h-3" />
                              Resume
                            </button>
                          )}
                          <button
                            onClick={() => controlConsumer(consumer.id, 'stop')}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50"
                          >
                            <Square className="w-3 h-3" />
                            Stop
                          </button>
                          <button
                            onClick={() => deleteConsumer(consumer.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete Consumer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Messages Processed</Label>
                        <div className="font-mono text-lg">{consumer.messagesProcessed}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Rate (msg/s)</Label>
                        <div className="font-mono text-lg">{formatRate(consumer.messagesPerSecond)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Processing Delay</Label>
                        <div className="font-mono">{consumer.processingDelay}ms</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Activity</Label>
                        <div className="font-mono">{formatTimestamp(consumer.lastActivity)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Prefetch Count</Label>
                        <div className="font-mono">{consumer.prefetchCount}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">ACK Mode</Label>
                        <div className="font-mono capitalize">{consumer.ackMode}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Error Rate</Label>
                        <div className="font-mono">{consumer.errorRate}%</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Created</Label>
                        <div className="font-mono">{formatTimestamp(consumer.createdAt)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Virtual Consumer
              </CardTitle>
              <CardDescription>
                Set up a simulated consumer to process messages from a queue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consumer-name">Consumer Name</Label>
                  <Input
                    id="consumer-name"
                    placeholder="e.g. Order Processor"
                    value={newConsumer.name}
                    onChange={(e) => setNewConsumer(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="queue-name">Target Queue</Label>
                  <Select 
                    value={newConsumer.queueName} 
                    onValueChange={(value) => setNewConsumer(prev => ({ ...prev, queueName: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a queue" />
                    </SelectTrigger>
                    <SelectContent>
                      {queues.map((queue) => (
                        <SelectItem key={queue} value={queue}>
                          {queue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prefetch-count">Prefetch Count</Label>
                  <Input
                    id="prefetch-count"
                    type="number"
                    min="1"
                    max="1000"
                    value={newConsumer.prefetchCount}
                    onChange={(e) => setNewConsumer(prev => ({ ...prev, prefetchCount: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ack-mode">Acknowledgment Mode</Label>
                  <Select 
                    value={newConsumer.ackMode} 
                    onValueChange={(value: 'auto' | 'manual') => setNewConsumer(prev => ({ ...prev, ackMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Acknowledgment</SelectItem>
                      <SelectItem value="manual">Manual Acknowledgment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processing-delay">Processing Delay (ms)</Label>
                  <Input
                    id="processing-delay"
                    type="number"
                    min="0"
                    max="10000"
                    value={newConsumer.processingDelay}
                    onChange={(e) => setNewConsumer(prev => ({ ...prev, processingDelay: parseInt(e.target.value) || 1000 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="error-rate">Error Rate (%)</Label>
                  <Input
                    id="error-rate"
                    type="number"
                    min="0"
                    max="100"
                    value={newConsumer.errorRate}
                    onChange={(e) => setNewConsumer(prev => ({ ...prev, errorRate: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Virtual consumers simulate real message processing behavior including acknowledgments, 
                  processing delays, and error handling. They help test your topology under various load conditions.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={createConsumer} 
                  disabled={isLoading || !newConsumer.name || !newConsumer.queueName}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Consumer
                </Button>
                <button 
                  onClick={() => setNewConsumer({
                    name: '',
                    queueName: '',
                    prefetchCount: 1,
                    ackMode: 'auto',
                    processingDelay: 1000,
                    errorRate: 0
                  })}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Clear Form
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Consumer Metrics
              </CardTitle>
              <CardDescription>
                Real-time performance metrics for all virtual consumers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {consumers.filter(c => c.status === 'running').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Running</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {consumers.reduce((sum, c) => sum + c.messagesProcessed, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatRate(consumers.reduce((sum, c) => sum + c.messagesPerSecond, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Combined Rate (msg/s)</div>
                </div>
              </div>

              {consumers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No consumers to display metrics for
                </div>
              ) : (
                <div className="space-y-2">
                  {consumers.map((consumer) => (
                    <div key={consumer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(consumer.status)}
                        <span className="font-medium">{consumer.name}</span>
                        <span className="text-sm text-muted-foreground">→ {consumer.queueName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-mono">{consumer.messagesProcessed}</div>
                          <div className="text-xs text-muted-foreground">processed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono">{formatRate(consumer.messagesPerSecond)}</div>
                          <div className="text-xs text-muted-foreground">msg/s</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono">{consumer.processingDelay}ms</div>
                          <div className="text-xs text-muted-foreground">delay</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VirtualConsumerManager;
