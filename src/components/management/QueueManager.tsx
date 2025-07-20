import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Eye,
  Clock,
  BarChart,
  Users,
  MessageSquare,
  Package,
  Eraser,
  Send,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Queue, Message, rabbitmqAPI } from '@/services/rabbitmqAPI';

interface QueueManagerProps {
  onRefresh?: () => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({ onRefresh }) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [publishData, setPublishData] = useState({
    payload: '{"message": "Hello World"}',
    routingKey: '',
    properties: {
      contentType: 'application/json',
      deliveryMode: 2,
      priority: 0
    }
  });
  const { toast } = useToast();

  // Create queue form state
  const [newQueue, setNewQueue] = useState<Partial<Queue>>({
    name: '',
    durable: true,
    autoDelete: false,
    arguments: {}
  });

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rabbitmqAPI.getQueues();
      if (response.success && response.data) {
        setQueues(response.data);
      } else {
        setError(response.error || 'Failed to fetch queues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueueMessages = useCallback(async (queueName: string) => {
    setMessagesLoading(true);
    try {
      const response = await rabbitmqAPI.getQueueMessages(queueName, 20);
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        toast({
          title: "Error",
          description: response.error || 'Failed to fetch messages',
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const handleCreateQueue = async () => {
    if (!newQueue.name) {
      toast({
        title: "Error",
        description: "Queue name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await rabbitmqAPI.createQueue(newQueue as Queue);
      if (response.success) {
        toast({
          title: "Success",
          description: `Queue "${newQueue.name}" created successfully`,
        });
        setShowCreateDialog(false);
        setNewQueue({
          name: '',
          durable: true,
          autoDelete: false,
          arguments: {}
        });
        fetchQueues();
        onRefresh?.();
      } else {
        toast({
          title: "Error",
          description: response.error || 'Failed to create queue',
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handleDeleteQueue = async (queueName: string) => {
    if (!confirm(`Are you sure you want to delete queue "${queueName}"?`)) {
      return;
    }

    try {
      const response = await rabbitmqAPI.deleteQueue(queueName);
      if (response.success) {
        toast({
          title: "Success",
          description: `Queue "${queueName}" deleted successfully`,
        });
        fetchQueues();
        onRefresh?.();
      } else {
        toast({
          title: "Error",
          description: response.error || 'Failed to delete queue',
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handlePurgeQueue = async (queueName: string) => {
    if (!confirm(`Are you sure you want to purge all messages from queue "${queueName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await rabbitmqAPI.purgeQueue(queueName);
      if (response.success) {
        toast({
          title: "Success",
          description: `Queue "${queueName}" purged successfully`,
        });
        // Refresh the messages list and queue stats
        if (selectedQueue?.name === queueName) {
          fetchQueueMessages(queueName);
        }
        fetchQueues();
        onRefresh?.();
      } else {
        toast({
          title: "Error",
          description: response.error || 'Failed to purge queue',
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handlePublishMessage = async (queueName: string) => {
    try {
      const response = await fetch(`http://localhost:8081/api/queues/${encodeURIComponent(queueName)}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Message published successfully",
        });
        // Refresh the messages and queue stats
        fetchQueueMessages(queueName);
        fetchQueues();
        onRefresh?.();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to publish message',
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    fetchQueues();
    onRefresh?.();
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return '0';
    return num.toLocaleString();
  };

  const formatPayload = (payload: string, limit: number = 100): string => {
    if (!payload) return '';
    try {
      // Try to parse as JSON for pretty formatting
      const parsed = JSON.parse(payload);
      const formatted = JSON.stringify(parsed, null, 2);
      return formatted.length > limit ? formatted.substring(0, limit) + '...' : formatted;
    } catch {
      // If not JSON, just return as string with truncation
      return payload.length > limit ? payload.substring(0, limit) + '...' : payload;
    }
  };

  const isJsonPayload = (payload: string): boolean => {
    try {
      JSON.parse(payload);
      return true;
    } catch {
      return false;
    }
  };

  const getStatusColor = (queue: Queue) => {
    const messageCount = queue.messageStats?.messages || 0;
    const consumerCount = queue.messageStats?.consumers || 0;
    
    if (messageCount > 1000) return 'destructive';
    if (messageCount > 100) return 'secondary';
    if (consumerCount === 0 && messageCount > 0) return 'outline';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Queue Management</h2>
          <p className="text-muted-foreground">Configure and monitor message queues</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Queue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Queue</DialogTitle>
                <DialogDescription>
                  Configure a new message queue with the specified properties.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="queue-name">Queue Name</Label>
                  <Input
                    id="queue-name"
                    value={newQueue.name || ''}
                    onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                    placeholder="Enter queue name"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="durable"
                    checked={newQueue.durable || false}
                    onCheckedChange={(checked) => setNewQueue({ ...newQueue, durable: checked })}
                  />
                  <Label htmlFor="durable">Durable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-delete"
                    checked={newQueue.autoDelete || false}
                    onCheckedChange={(checked) => setNewQueue({ ...newQueue, autoDelete: checked })}
                  />
                  <Label htmlFor="auto-delete">Auto Delete</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateQueue}>
                  Create Queue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Queues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Queues ({queues.length})
          </CardTitle>
          <CardDescription>
            Monitor and manage message queues in your RabbitMQ instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading queues...</span>
            </div>
          ) : queues.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Queues Found</h3>
              <p className="text-muted-foreground">Create your first queue to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Consumers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className="font-medium">{queue.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {queue.durable && <Badge variant="secondary" className="text-xs">Durable</Badge>}
                        {queue.autoDelete && <Badge variant="outline" className="text-xs">Auto-Delete</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        {formatNumber(queue.messageStats?.messages)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BarChart className="w-4 h-4 text-muted-foreground" />
                        {formatNumber(queue.messageStats?.messageRate)}/s
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {formatNumber(queue.messageStats?.consumers)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(queue)}>
                        {queue.messageStats?.consumers === 0 && (queue.messageStats?.messages || 0) > 0
                          ? 'No Consumers'
                          : (queue.messageStats?.messages || 0) > 1000
                          ? 'High Load'
                          : (queue.messageStats?.messages || 0) > 100
                          ? 'Medium Load'
                          : 'Normal'
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedQueue(queue);
                            setShowQueueDrawer(true);
                            // Clear previous messages
                            setMessages([]);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePurgeQueue(queue.name)}
                          title="Purge all messages"
                          disabled={(queue.messageStats?.messages || 0) === 0}
                          className="hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Eraser className="w-4 h-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQueue(queue.name)}
                          title="Delete queue"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Queue Details Drawer */}
      <Sheet open={showQueueDrawer} onOpenChange={setShowQueueDrawer}>
        <SheetContent className="w-[900px] sm:max-w-[900px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Queue: {selectedQueue?.name}
            </SheetTitle>
            <SheetDescription>
              Manage and monitor queue details, messages, and consumers
            </SheetDescription>
          </SheetHeader>
          {selectedQueue && (
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="publish">Publish</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(selectedQueue.messageStats?.messages)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Consumers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(selectedQueue.messageStats?.consumers)}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="stats" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Message Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Message Rate:</span>
                        <span>{formatNumber(selectedQueue.messageStats?.messageRate)}/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Messages:</span>
                        <span>{formatNumber(selectedQueue.messageStats?.messages)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Consumers:</span>
                        <span>{formatNumber(selectedQueue.messageStats?.consumers)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="messages" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Queue Messages</h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => fetchQueueMessages(selectedQueue.name)} 
                      disabled={messagesLoading}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${messagesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      onClick={() => handlePurgeQueue(selectedQueue.name)} 
                      disabled={messagesLoading || messages.length === 0}
                      size="sm"
                      variant="destructive"
                    >
                      <Eraser className="w-4 h-4 mr-2" />
                      Purge All ({messages.length})
                    </Button>
                  </div>
                </div>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">No Messages</h3>
                        <p className="text-muted-foreground">This queue is empty or messages were already consumed</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead className="w-[200px]">Message ID</TableHead>
                              <TableHead className="min-w-[400px]">Payload</TableHead>
                              <TableHead className="w-[150px]">Exchange</TableHead>
                              <TableHead className="w-[150px]">Routing Key</TableHead>
                              <TableHead className="w-[100px]">Size</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {messages.map((message, index) => (
                              <TableRow key={message.id || index} className="group">
                                <TableCell className="font-mono text-sm p-4">
                                  <div className="truncate max-w-[180px]" title={message.properties.messageId || message.id}>
                                    {message.properties.messageId || message.id}
                                  </div>
                                </TableCell>
                                <TableCell className="p-4">
                                  <div className="max-w-[380px]">
                                    <div className="text-sm font-mono bg-muted/50 p-3 rounded border">
                                      <div className="max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                                          {isJsonPayload(message.payload) 
                                            ? JSON.stringify(JSON.parse(message.payload), null, 2)
                                            : message.payload
                                          }
                                        </pre>
                                      </div>
                                      {message.payload.length > 200 && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                          Click the eye icon to view full content →
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                      <Badge variant={isJsonPayload(message.payload) ? "default" : "secondary"} className="text-xs">
                                        {isJsonPayload(message.payload) ? "JSON" : "Text"}
                                      </Badge>
                                      {message.properties.contentType && (
                                        <Badge variant="outline" className="text-xs">
                                          {message.properties.contentType}
                                        </Badge>
                                      )}
                                      {message.properties.timestamp && (
                                        <Badge variant="outline" className="text-xs">
                                          {new Date(message.properties.timestamp).toLocaleString()}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="p-4">
                                  <Badge variant="outline" className="text-xs">
                                    {message.exchange || 'default'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm p-4">
                                  <div className="truncate max-w-[130px]" title={message.routingKey}>
                                    {message.routingKey || '(none)'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm p-4">
                                  {formatNumber(message.size)} bytes
                                </TableCell>
                                <TableCell className="p-4">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMessage(message);
                                        setShowMessageDialog(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="View full message details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="p-4 border-t bg-muted/20 text-sm text-muted-foreground">
                        Showing {messages.length} message{messages.length !== 1 ? 's' : ''} • 
                        Click on a row or use the eye icon to view full message details
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="publish" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Publish Message</CardTitle>
                    <CardDescription>Send a message to this queue</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="routing-key">Routing Key</Label>
                      <Input
                        id="routing-key"
                        value={publishData.routingKey}
                        onChange={(e) => setPublishData({ ...publishData, routingKey: e.target.value })}
                        placeholder="Optional routing key"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payload">Message Payload</Label>
                      <Textarea
                        id="payload"
                        value={publishData.payload}
                        onChange={(e) => setPublishData({ ...publishData, payload: e.target.value })}
                        placeholder='{"message": "Hello World"}'
                        rows={8}
                        className="font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="content-type">Content Type</Label>
                        <Input
                          id="content-type"
                          value={publishData.properties.contentType}
                          onChange={(e) => setPublishData({
                            ...publishData,
                            properties: { ...publishData.properties, contentType: e.target.value }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Input
                          id="priority"
                          type="number"
                          min="0"
                          max="255"
                          value={publishData.properties.priority}
                          onChange={(e) => setPublishData({
                            ...publishData,
                            properties: { ...publishData.properties, priority: parseInt(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => handlePublishMessage(selectedQueue.name)} 
                      className="w-full gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Publish Message
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="config" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Durable:</span>
                        <Badge variant={selectedQueue.durable ? "default" : "secondary"}>
                          {selectedQueue.durable ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto Delete:</span>
                        <Badge variant={selectedQueue.autoDelete ? "default" : "secondary"}>
                          {selectedQueue.autoDelete ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>VHost:</span>
                        <span>{selectedQueue.vhost || '/'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Message Details Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Complete message information and payload content
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="payload" className="h-full flex flex-col">
                <TabsList>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="routing">Routing</TabsTrigger>
                </TabsList>
                <TabsContent value="payload" className="flex-1 overflow-hidden">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Message Payload</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={isJsonPayload(selectedMessage.payload) ? "default" : "secondary"}>
                            {isJsonPayload(selectedMessage.payload) ? "JSON" : "Text"}
                          </Badge>
                          <Badge variant="outline">
                            {formatNumber(selectedMessage.size)} bytes
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="h-full overflow-auto">
                      <div className="bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                          <span className="text-sm font-medium">Message Payload</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {selectedMessage.payload.length.toLocaleString()} characters
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedMessage.payload);
                                toast({
                                  title: "Copied",
                                  description: "Payload copied to clipboard",
                                });
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <pre className="text-sm p-4 overflow-auto whitespace-pre-wrap break-all max-h-[400px] min-h-[200px]">
                          {isJsonPayload(selectedMessage.payload) 
                            ? JSON.stringify(JSON.parse(selectedMessage.payload), null, 2)
                            : selectedMessage.payload
                          }
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="properties" className="flex-1 overflow-hidden">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Message Properties</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-auto">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Message ID</Label>
                            <div className="text-sm text-muted-foreground font-mono">
                              {selectedMessage.properties.messageId || selectedMessage.id}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Content Type</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.contentType || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Delivery Mode</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.deliveryMode === 2 ? 'Persistent' : 'Transient'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Priority</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.priority || 0}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Timestamp</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.timestamp 
                                ? new Date(selectedMessage.properties.timestamp).toLocaleString()
                                : 'Not specified'
                              }
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Expiration</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.expiration || 'Never'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">User ID</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.userId || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">App ID</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.appId || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Correlation ID</Label>
                            <div className="text-sm text-muted-foreground font-mono">
                              {selectedMessage.properties.correlationId || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Reply To</Label>
                            <div className="text-sm text-muted-foreground">
                              {selectedMessage.properties.replyTo || 'Not specified'}
                            </div>
                          </div>
                        </div>
                        {selectedMessage.properties.headers && Object.keys(selectedMessage.properties.headers).length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Headers</Label>
                            <Card className="mt-2">
                              <CardContent className="p-3">
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(selectedMessage.properties.headers, null, 2)}
                                </pre>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="routing" className="flex-1 overflow-hidden">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Routing Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Exchange</Label>
                          <div className="text-sm text-muted-foreground">
                            {selectedMessage.exchange || '(default)'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Routing Key</Label>
                          <div className="text-sm text-muted-foreground font-mono">
                            {selectedMessage.routingKey || '(none)'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Redelivery Count</Label>
                          <div className="text-sm text-muted-foreground">
                            {selectedMessage.redeliveryCount}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Message Size</Label>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(selectedMessage.size)} bytes
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedMessage, null, 2));
                  toast({
                    title: "Copied",
                    description: "Full message data copied to clipboard",
                  });
                }}
              >
                Copy All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const blob = new Blob([JSON.stringify(selectedMessage, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                                      a.download = `message-${selectedMessage.properties.messageId || selectedMessage.id || 'unknown'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({
                    title: "Exported",
                    description: "Message data exported as JSON file",
                  });
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QueueManager;
