import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { 
  MessageSquare, 
  Users, 
  RefreshCw, 
  Send, 
  Download,
  Trash2,
  AlertCircle,
  BarChart3,
  Eye,
  Package,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueueMessage {
  id: string;
  payload: string;
  properties: {
    messageId?: string;
    timestamp?: string;
    contentType?: string;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    userId?: string;
    appId?: string;
    headers?: Record<string, unknown>;
  };
  routingKey: string;
  exchange: string;
  redeliveryCount?: number;
  size: number;
}

interface QueueStats {
  name: string;
  messages: number;
  consumers: number;
  messageRate: number;
  consumerRate: number;
  memory: number;
  state: string;
  durable: boolean;
  autoDelete: boolean;
  arguments: Record<string, unknown>;
  bindings: Array<{
    source: string;
    destination: string;
    routingKey: string;
  }>;
  connectedConsumers: Array<{
    id: string;
    consumerTag: string;
    channel: string;
    connection: string;
    ackRequired: boolean;
    activity: string;
  }>;
}

interface QueueDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queueName: string | null;
}

export const QueueDetailsDrawer: React.FC<QueueDetailsDrawerProps> = ({
  isOpen,
  onClose,
  queueName
}) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<QueueMessage | null>(null);
  const { toast } = useToast();

  // Message publishing state
  const [publishData, setPublishData] = useState({
    payload: '{"message": "Hello World"}',
    routingKey: '',
    properties: {
      contentType: 'application/json',
      deliveryMode: 2,
      priority: 0
    }
  });

  // Load queue details
  const loadQueueDetails = useCallback(async () => {
    if (!queueName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8081/api/queues/${encodeURIComponent(queueName)}/details`);
      if (!response.ok) {
        throw new Error(`Failed to load queue details: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setQueueStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to load queue details');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading queue details",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [queueName, toast]);

  // Load queue messages
  const loadQueueMessages = useCallback(async () => {
    if (!queueName) return;
    
    setMessagesLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8081/api/queues/${encodeURIComponent(queueName)}/messages?count=10&ackMode=ack_requeue_true`);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setMessages(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load messages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error loading messages",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [queueName, toast]);

  // Publish message to queue
  const publishMessage = async () => {
    if (!queueName) return;
    
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
          title: "Message published",
          description: "Message successfully published to queue",
        });
        loadQueueDetails(); // Refresh stats
      } else {
        throw new Error(result.error || 'Failed to publish message');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error publishing message",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Purge queue
  const purgeQueue = async () => {
    if (!queueName) return;
    
    try {
      const response = await fetch(`http://localhost:8081/api/queues/${encodeURIComponent(queueName)}/purge`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Queue purged",
          description: "All messages removed from queue",
        });
        loadQueueDetails();
        loadQueueMessages();
      } else {
        throw new Error(result.error || 'Failed to purge queue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error purging queue",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen && queueName) {
      loadQueueDetails();
      setActiveTab('overview');
    }
  }, [isOpen, queueName, loadQueueDetails]);

  useEffect(() => {
    if (activeTab === 'messages' && queueName) {
      loadQueueMessages();
    }
  }, [activeTab, queueName, loadQueueMessages]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Queue: {queueName}
          </SheetTitle>
          <SheetDescription>
            Manage and monitor queue details, messages, and consumers
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="consumers">Consumers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading queue details...</span>
              </div>
            ) : queueStats ? (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{queueStats.messages}</div>
                      <div className="text-xs text-muted-foreground">
                        {queueStats.messageRate.toFixed(2)}/s rate
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Consumers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{queueStats.consumers}</div>
                      <div className="text-xs text-muted-foreground">
                        {queueStats.consumerRate.toFixed(2)}/s rate
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Queue Properties */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">State:</span>
                      <Badge variant={queueStats.state === 'running' ? 'default' : 'secondary'}>
                        {queueStats.state}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Durable:</span>
                      <Badge variant={queueStats.durable ? 'default' : 'outline'}>
                        {queueStats.durable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Auto Delete:</span>
                      <Badge variant={queueStats.autoDelete ? 'destructive' : 'outline'}>
                        {queueStats.autoDelete ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Memory:</span>
                      <span className="text-sm">{(queueStats.memory / 1024).toFixed(2)} KB</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Bindings */}
                {queueStats.bindings && queueStats.bindings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Bindings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exchange</TableHead>
                            <TableHead>Routing Key</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queueStats.bindings.map((binding, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{binding.source}</TableCell>
                              <TableCell className="font-mono text-sm">{binding.routingKey || '(empty)'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={loadQueueDetails} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button onClick={purgeQueue} variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Purge Queue
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Queue Messages</h3>
              <div className="flex gap-2">
                <Button onClick={loadQueueMessages} disabled={messagesLoading} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={purgeQueue} variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Purge Queue
                </Button>
              </div>
            </div>

            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages</h3>
                <p className="text-muted-foreground">This queue is currently empty</p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Message ID</TableHead>
                        <TableHead className="w-80">Payload Preview</TableHead>
                        <TableHead className="w-48">Properties</TableHead>
                        <TableHead className="w-20">Size</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm max-w-32">
                            {message.properties.messageId || `msg-${index}`}
                          </TableCell>
                          <TableCell className="max-w-80">
                            <div className="text-sm font-mono bg-muted p-2 rounded max-h-20 overflow-y-auto">
                              <div className="whitespace-pre-wrap break-words">
                                {(() => {
                                  if (!message.payload) return 'No payload';
                                  
                                  try {
                                    // Try to format as JSON if it's valid JSON
                                    const parsed = JSON.parse(message.payload);
                                    const formatted = JSON.stringify(parsed, null, 2);
                                    return formatted.length > 150 
                                      ? `${formatted.substring(0, 150)}...` 
                                      : formatted;
                                  } catch {
                                    // If not JSON, display as plain text
                                    return message.payload.length > 150 
                                      ? `${message.payload.substring(0, 150)}...` 
                                      : message.payload;
                                  }
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-48">
                            <div className="space-y-1 text-xs">
                              {message.properties.contentType && (
                                <Badge variant="outline" className="text-xs">
                                  {message.properties.contentType}
                                </Badge>
                              )}
                              {message.properties.deliveryMode && (
                                <div className="text-muted-foreground">
                                  Mode: {message.properties.deliveryMode === 2 ? 'Persistent' : 'Transient'}
                                </div>
                              )}
                              {message.properties.priority !== undefined && (
                                <div className="text-muted-foreground">
                                  Priority: {message.properties.priority}
                                </div>
                              )}
                              {message.properties.timestamp && (
                                <div className="text-muted-foreground">
                                  {new Date(message.properties.timestamp).toLocaleString()}
                                </div>
                              )}
                              {message.redeliveryCount !== undefined && message.redeliveryCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  Redelivered: {message.redeliveryCount}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {message.size} bytes
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setShowMessageDialog(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(message.payload);
                                  toast({
                                    title: "Copied",
                                    description: "Message payload copied to clipboard",
                                  });
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    rows={6}
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

                <Button onClick={publishMessage} className="w-full gap-2">
                  <Send className="w-4 h-4" />
                  Publish Message
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consumers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Connected Consumers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueStats?.connectedConsumers && queueStats.connectedConsumers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Consumer Tag</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Connection</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>ACK Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueStats.connectedConsumers.map((consumer) => (
                        <TableRow key={consumer.id}>
                          <TableCell className="font-mono text-sm">{consumer.consumerTag}</TableCell>
                          <TableCell className="font-mono text-sm">{consumer.channel}</TableCell>
                          <TableCell className="font-mono text-sm">{consumer.connection}</TableCell>
                          <TableCell>
                            <Badge variant={consumer.activity === 'up' ? 'default' : 'secondary'}>
                              {consumer.activity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={consumer.ackRequired ? 'default' : 'outline'}>
                              {consumer.ackRequired ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No consumers</h3>
                    <p className="text-muted-foreground">No consumers are currently connected to this queue</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Message Details Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Complete message information and payload
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              {/* Message Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Message ID</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                    {selectedMessage.properties.messageId || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Exchange</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                    {selectedMessage.exchange || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Routing Key</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                    {selectedMessage.routingKey || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Size</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                    {selectedMessage.size} bytes
                  </p>
                </div>
              </div>

              {/* Message Properties */}
              <div>
                <Label className="text-sm font-medium">Properties</Label>
                
                {/* Key Properties in readable format */}
                <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
                  {selectedMessage.properties.contentType && (
                    <div>
                      <span className="text-xs text-muted-foreground">Content Type:</span>
                      <p className="text-sm font-mono">{selectedMessage.properties.contentType}</p>
                    </div>
                  )}
                  {selectedMessage.properties.deliveryMode && (
                    <div>
                      <span className="text-xs text-muted-foreground">Delivery Mode:</span>
                      <p className="text-sm">
                        {selectedMessage.properties.deliveryMode === 2 ? 'Persistent' : 'Transient'} ({selectedMessage.properties.deliveryMode})
                      </p>
                    </div>
                  )}
                  {selectedMessage.properties.priority !== undefined && (
                    <div>
                      <span className="text-xs text-muted-foreground">Priority:</span>
                      <p className="text-sm">{selectedMessage.properties.priority}</p>
                    </div>
                  )}
                  {selectedMessage.properties.correlationId && (
                    <div>
                      <span className="text-xs text-muted-foreground">Correlation ID:</span>
                      <p className="text-sm font-mono truncate">{selectedMessage.properties.correlationId}</p>
                    </div>
                  )}
                  {selectedMessage.properties.replyTo && (
                    <div>
                      <span className="text-xs text-muted-foreground">Reply To:</span>
                      <p className="text-sm font-mono truncate">{selectedMessage.properties.replyTo}</p>
                    </div>
                  )}
                  {selectedMessage.properties.expiration && (
                    <div>
                      <span className="text-xs text-muted-foreground">Expiration:</span>
                      <p className="text-sm">{selectedMessage.properties.expiration}ms</p>
                    </div>
                  )}
                </div>

                {/* Full properties JSON with JsonViewer */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">All Properties (JSON):</Label>
                  <JsonViewer data={selectedMessage.properties} />
                </div>
              </div>

              {/* Message Payload */}
              <div>
                <Label className="text-sm font-medium">Payload</Label>
                <div className="mt-2">
                  <JsonViewer data={selectedMessage.payload} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedMessage) {
                    navigator.clipboard.writeText(JSON.stringify(selectedMessage, null, 2));
                    toast({
                      title: "Copied",
                      description: "Full message data copied to clipboard",
                    });
                  }
                }}
              >
                Copy All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedMessage) {
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
                  }
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
    </Sheet>
  );
};

export default QueueDetailsDrawer;
