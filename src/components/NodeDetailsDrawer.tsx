import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { 
  Send, 
  GitBranch, 
  Radio, 
  Hash, 
  Settings,
  Inbox, 
  Download,
  RefreshCw, 
  AlertCircle,
  BarChart3,
  Activity,
  Users,
  Network,
  MessageSquare,
  TrendingUp,
  Clock,
  Server,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Node } from '@xyflow/react';

// Node data interfaces
interface ProducerData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
}

interface ExchangeData {
  label: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
  durable: boolean;
}

interface QueueData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageCount: number;
  consumerCount: number;
  messageRate?: number;
  durable: boolean;
}

interface ConsumerData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
  prefetchCount: number;
  autoAck: boolean;
}

// Enhanced stats interfaces for detailed views
interface ProducerStats {
  name: string;
  status: string;
  messageRate: number;
  totalMessages: number;
  uptime: string;
  connection: {
    id: string;
    name: string;
    state: string;
    channels: number;
  };
  channels: Array<{
    id: string;
    name: string;
    state: string;
    messagesSent: number;
    publishRate: number;
  }>;
}

interface ExchangeStats {
  name: string;
  type: string;
  durable: boolean;
  autoDelete: boolean;
  messageRate: number;
  messageIn: number;
  messageOut: number;
  bindings: Array<{
    destination: string;
    destinationType: string;
    routingKey: string;
    arguments: Record<string, unknown>;
  }>;
  arguments: Record<string, unknown>;
}

interface ConsumerStats {
  name: string;
  queue: string;
  consumerTag: string;
  status: string;
  messageRate: number;
  ackRequired: boolean;
  prefetchCount: number;
  channel: {
    id: string;
    name: string;
    state: string;
    unackedMessages: number;
  };
  connection: {
    id: string;
    name: string;
    state: string;
  };
}

interface NodeDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  onOpenQueueDetails?: (queueName: string) => void;
}

const getNodeIcon = (nodeType: string, exchangeType?: string) => {
  switch (nodeType) {
    case 'producer':
      return <Send className="w-5 h-5" />;
    case 'exchange-direct':
    case 'direct':
      return <GitBranch className="w-5 h-5" />;
    case 'exchange-fanout':
    case 'fanout':
      return <Radio className="w-5 h-5" />;
    case 'exchange-topic':
    case 'topic':
      return <Hash className="w-5 h-5" />;
    case 'exchange-headers':
    case 'headers':
      return <Settings className="w-5 h-5" />;
    case 'queue':
      return <Inbox className="w-5 h-5" />;
    case 'consumer':
      return <Download className="w-5 h-5" />;
    default:
      if (nodeType?.includes('exchange')) {
        switch (exchangeType) {
          case 'direct': return <GitBranch className="w-5 h-5" />;
          case 'fanout': return <Radio className="w-5 h-5" />;
          case 'topic': return <Hash className="w-5 h-5" />;
          case 'headers': return <Settings className="w-5 h-5" />;
          default: return <GitBranch className="w-5 h-5" />;
        }
      }
      return <Server className="w-5 h-5" />;
  }
};

const getNodeTypeDisplay = (nodeType: string) => {
  if (nodeType === 'producer') return 'Producer';
  if (nodeType === 'consumer') return 'Consumer';
  if (nodeType === 'queue') return 'Queue';
  if (nodeType?.includes('exchange') || ['direct', 'fanout', 'topic', 'headers'].includes(nodeType)) {
    return 'Exchange';
  }
  return 'Node';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'running':
      return 'default';
    case 'idle':
    case 'warning':
      return 'secondary';
    case 'error':
    case 'down':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onOpenQueueDetails
}) => {
  const [nodeStats, setNodeStats] = useState<ProducerStats | ExchangeStats | ConsumerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Load detailed node stats
  const loadNodeDetails = useCallback(async () => {
    if (!selectedNode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const nodeType = getNodeTypeDisplay(selectedNode.type || '').toLowerCase();
      const response = await fetch(`http://localhost:8081/api/${nodeType}s/${encodeURIComponent(selectedNode.id)}/details`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${nodeType} details: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setNodeStats(result.data);
      } else {
        throw new Error(result.error || `Failed to load ${nodeType} details`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.warn(`Could not load detailed stats for ${selectedNode.id}:`, errorMessage);
      // Don't show error toast for missing API endpoints during development
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (isOpen && selectedNode) {
      loadNodeDetails();
      setActiveTab('overview');
    }
  }, [isOpen, selectedNode, loadNodeDetails]);

  if (!selectedNode) return null;

  const nodeData = selectedNode.data as Record<string, unknown>;
  const nodeType = selectedNode.type || '';
  const nodeTypeDisplay = getNodeTypeDisplay(nodeType);

  // Type-safe accessors
  const getDataValue = (key: string, defaultValue: unknown = undefined) => {
    return nodeData?.[key] ?? defaultValue;
  };

  const getStringValue = (key: string, defaultValue = '') => {
    const value = getDataValue(key, defaultValue);
    return typeof value === 'string' ? value : String(value || defaultValue);
  };

  const getNumberValue = (key: string, defaultValue = 0) => {
    const value = getDataValue(key, defaultValue);
    return typeof value === 'number' ? value : defaultValue;
  };

  const getBooleanValue = (key: string, defaultValue = false) => {
    const value = getDataValue(key, defaultValue);
    return typeof value === 'boolean' ? value : defaultValue;
  };

  const renderOverviewContent = () => {
    return (
      <div className="space-y-4">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getNodeIcon(nodeType, getStringValue('type'))}
              {nodeTypeDisplay} Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p className="font-mono text-sm">{getStringValue('label') || selectedNode.id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="mt-1">
                  <Badge variant={getStatusColor(getStringValue('status', 'unknown'))}>
                    {getStringValue('status', 'unknown')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Type-specific information */}
            {nodeType === 'producer' && (
              <div>
                <span className="text-sm text-muted-foreground">Message Rate:</span>
                <p className="text-lg font-semibold text-blue-600">
                  {getNumberValue('messageRate')} msg/s
                </p>
              </div>
            )}

            {(nodeType?.includes('exchange') || ['direct', 'fanout', 'topic', 'headers'].includes(nodeType)) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Exchange Type:</span>
                    <p className="capitalize font-mono text-sm">{getStringValue('type')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Durable:</span>
                    <Badge variant={getBooleanValue('durable') ? 'default' : 'outline'}>
                      {getBooleanValue('durable') ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Message Rate:</span>
                  <p className="text-lg font-semibold text-green-600">
                    {getNumberValue('messageRate')} msg/s
                  </p>
                </div>
              </>
            )}

            {nodeType === 'queue' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Messages:</span>
                    <p className="text-lg font-semibold text-blue-600">
                      {getNumberValue('messageCount')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Consumers:</span>
                    <p className="text-lg font-semibold text-green-600">
                      {getNumberValue('consumerCount')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Message Rate:</span>
                    <p className="text-sm">{getNumberValue('messageRate')} msg/s</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Durable:</span>
                    <Badge variant={getBooleanValue('durable') ? 'default' : 'outline'}>
                      {getBooleanValue('durable') ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                {onOpenQueueDetails && (
                  <div className="pt-2">
                    <Button 
                      onClick={() => onOpenQueueDetails(selectedNode.id)}
                      variant="outline" 
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Open Queue Management
                    </Button>
                  </div>
                )}
              </>
            )}

            {nodeType === 'consumer' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Message Rate:</span>
                    <p className="text-lg font-semibold text-purple-600">
                      {getNumberValue('messageRate')} msg/s
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Prefetch Count:</span>
                    <p className="text-sm">{getNumberValue('prefetchCount')}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Auto ACK:</span>
                  <Badge variant={getBooleanValue('autoAck') ? 'default' : 'outline'}>
                    {getBooleanValue('autoAck') ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Real-time Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode.data?.realTimeMetrics ? (
              <div className="space-y-2">
                <JsonViewer data={selectedNode.data.realTimeMetrics} defaultExpanded={false} />
              </div>
            ) : (
              <div className="text-center py-4">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No real-time metrics available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={loadNodeDetails} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    );
  };

  const renderConnectionsContent = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="w-4 h-4" />
              Connection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nodeStats ? (
              <div className="space-y-4">
                {'connection' in nodeStats && (
                  <div>
                    <h4 className="font-medium mb-2">Connection Information</h4>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Connection ID</TableCell>
                          <TableCell className="font-mono">{nodeStats.connection.id}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Name</TableCell>
                          <TableCell className="font-mono">{nodeStats.connection.name}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">State</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(nodeStats.connection.state)}>
                              {nodeStats.connection.state}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {'channels' in nodeStats.connection && (
                          <TableRow>
                            <TableCell className="font-medium">Channels</TableCell>
                            <TableCell>{nodeStats.connection.channels}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {'bindings' in nodeStats && nodeStats.bindings?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Bindings</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destination</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Routing Key</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nodeStats.bindings.map((binding, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{binding.destination}</TableCell>
                            <TableCell className="capitalize">{binding.destinationType}</TableCell>
                            <TableCell className="font-mono">{binding.routingKey || '(empty)'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connection details</h3>
                <p className="text-muted-foreground">Connection information not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderConfigurationContent = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              Node Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Properties</h4>
                <JsonViewer data={selectedNode.data} defaultExpanded={true} />
              </div>

              {nodeStats && 'arguments' in nodeStats && (
                <div>
                  <h4 className="font-medium mb-2">Advanced Arguments</h4>
                  <JsonViewer data={nodeStats.arguments} defaultExpanded={true} />
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Full Node Object</h4>
                <JsonViewer data={selectedNode} defaultExpanded={false} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getNodeIcon(nodeType, getStringValue('type'))}
            {nodeTypeDisplay}: {getStringValue('label') || selectedNode.id}
          </SheetTitle>
          <SheetDescription>
            View detailed information, connections, and configuration for this {nodeTypeDisplay.toLowerCase()}
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading {nodeTypeDisplay.toLowerCase()} details...</span>
              </div>
            ) : (
              renderOverviewContent()
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            {renderConnectionsContent()}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            {renderConfigurationContent()}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default NodeDetailsDrawer;
