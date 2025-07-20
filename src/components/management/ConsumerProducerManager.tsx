import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  RefreshCw, 
  AlertCircle,
  Activity,
  BarChart,
  Wifi,
  WifiOff,
  Clock,
  Database,
  Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Consumer {
  id: string;
  consumerTag: string;
  queue: string;
  channel: string;
  connection: string;
  ackRequired: boolean;
  prefetchCount: number;
  arguments: Record<string, unknown>;
  exclusivity: boolean;
  activity: string;
  user: string;
}

interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  peerHost: string;
  peerPort: number;
  state: string;
  channels: number;
  user: string;
  vhost: string;
  protocol: string;
  connectedAt: string;
  clientProperties: Record<string, unknown>;
  type: string;
  recvCnt: number;
  sendCnt: number;
  recvOct: number;
  sendOct: number;
}

interface ConsumerProducerManagerProps {
  onRefresh?: () => void;
}

export const ConsumerProducerManager: React.FC<ConsumerProducerManagerProps> = ({ onRefresh }) => {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('consumers');
  const { toast } = useToast();

  // Load consumers from backend
  const loadConsumers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8081/api/consumers');
      if (!response.ok) {
        throw new Error(`Failed to load consumers: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setConsumers(result.data);
      } else {
        throw new Error(result.error || 'Failed to load consumers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading consumers",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load connections (producers) from backend
  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8081/api/connections');
      if (!response.ok) {
        throw new Error(`Failed to load connections: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setConnections(result.data);
      } else {
        throw new Error(result.error || 'Failed to load connections');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading connections",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    await Promise.all([loadConsumers(), loadConnections()]);
    if (onRefresh) onRefresh();
  };

  const getActivityColor = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'idle': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'producer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'consumer': return 'bg-green-100 text-green-800 border-green-200';
      case 'management': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running': 
      case 'open':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'closed':
      case 'closing':
        return <WifiOff className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Filter connections by type
  const producers = connections.filter(conn => conn.type === 'producer' || (conn.type === 'unknown' && conn.sendCnt > conn.recvCnt));
  const allConnections = connections;

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consumers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Consumers ({consumers.length})
          </TabsTrigger>
          <TabsTrigger value="producers" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Producers ({producers.length})
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            All Connections ({allConnections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumers" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Consumers</h3>
              <p className="text-sm text-muted-foreground">
                Monitor active message consumers and their configurations
              </p>
            </div>
            <Button
              onClick={loadConsumers}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Consumers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Consumers ({consumers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading consumers...</span>
                </div>
              ) : consumers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active consumers</h3>
                  <p className="text-muted-foreground">
                    No consumers are currently connected to RabbitMQ
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consumer Tag</TableHead>
                      <TableHead>Queue</TableHead>
                      <TableHead>Connection</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumers.map((consumer) => (
                      <TableRow key={consumer.id}>
                        <TableCell className="font-mono text-sm">
                          {consumer.consumerTag}
                        </TableCell>
                        <TableCell className="font-medium">
                          {consumer.queue}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <div>{consumer.connection}</div>
                            <div className="text-xs text-muted-foreground">
                              Channel: {consumer.channel}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {consumer.ackRequired && (
                              <Badge className="text-xs">
                                ACK Required
                              </Badge>
                            )}
                            {consumer.exclusivity && (
                              <Badge className="text-xs">
                                Exclusive
                              </Badge>
                            )}
                            {consumer.prefetchCount > 0 && (
                              <Badge className="text-xs">
                                Prefetch: {consumer.prefetchCount}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActivityColor(consumer.activity)}>
                            {consumer.activity}
                          </Badge>
                        </TableCell>
                        <TableCell>{consumer.user}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producers" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Producers</h3>
              <p className="text-sm text-muted-foreground">
                Monitor connections that are likely message producers
              </p>
            </div>
            <Button
              onClick={loadConnections}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Producers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4" />
                Producer Connections ({producers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading producers...</span>
                </div>
              ) : producers.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active producers</h3>
                  <p className="text-muted-foreground">
                    No producer connections are currently active
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connection</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Traffic</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Connected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producers.map((producer) => (
                      <TableRow key={producer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{producer.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {producer.peerHost}:{producer.peerPort}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{producer.user}</div>
                            <div className="text-xs text-muted-foreground">
                              {producer.protocol}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs">
                            {producer.channels} channels
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Sent: {formatBytes(producer.sendOct)}</div>
                            <div className="text-xs text-muted-foreground">
                              Recv: {formatBytes(producer.recvOct)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStateIcon(producer.state)}
                            <Badge className={getConnectionTypeColor(producer.type)}>
                              {producer.state}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(producer.connectedAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">All Connections</h3>
              <p className="text-sm text-muted-foreground">
                Monitor all active connections to RabbitMQ
              </p>
            </div>
            <Button
              onClick={loadConnections}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Connections</p>
                  <p className="text-2xl font-bold">{allConnections.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Producers</p>
                  <p className="text-2xl font-bold text-blue-600">{producers.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Consumers</p>
                  <p className="text-2xl font-bold text-green-600">{consumers.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Channels</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {allConnections.reduce((sum, conn) => sum + conn.channels, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Connections Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                All Connections ({allConnections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading connections...</span>
                </div>
              ) : allConnections.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active connections</h3>
                  <p className="text-muted-foreground">
                    No connections are currently active
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connection</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Connected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allConnections.map((connection) => (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{connection.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {connection.peerHost}:{connection.peerPort}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConnectionTypeColor(connection.type)}>
                            {connection.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{connection.user}</div>
                            <div className="text-xs text-muted-foreground">
                              {connection.protocol} | {connection.vhost}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs">
                            {connection.channels}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStateIcon(connection.state)}
                            <span className="text-sm">{connection.state}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(connection.connectedAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsumerProducerManager;
