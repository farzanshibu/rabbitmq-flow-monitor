import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Skull, 
  RefreshCw, 
  AlertTriangle,
  Eye,
  Play,
  Trash2,
  Download,
  RotateCcw,
  MessageSquare,
  Settings,
  BarChart,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeadLetterMessage {
  id: string;
  payload: string;
  properties: {
    messageId?: string;
    timestamp?: string;
    expiration?: string;
    userId?: string;
    appId?: string;
    correlationId?: string;
    replyTo?: string;
    headers?: Record<string, unknown>;
  };
  routingKey: string;
  exchange: string;
  originalQueue: string;
  deadLetterReason: 'rejected' | 'expired' | 'maxlen' | 'delivery_limit';
  deadLetterTime: string;
  redeliveryCount: number;
  originalExchange?: string;
  originalRoutingKey?: string;
}

interface DeadLetterQueue {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  arguments: Record<string, unknown>;
  messageCount: number;
  consumerCount: number;
  messageRate: number;
  originalQueue?: string;
  deadLetterExchange?: string;
}

interface DeadLetterQueueManagerProps {
  onRefresh?: () => void;
}

export const DeadLetterQueueManager: React.FC<DeadLetterQueueManagerProps> = ({ onRefresh }) => {
  const [deadLetterQueues, setDeadLetterQueues] = useState<DeadLetterQueue[]>([]);
  const [deadLetterMessages, setDeadLetterMessages] = useState<DeadLetterMessage[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('queues');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showReplayDialog, setShowReplayDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DeadLetterMessage | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const { toast } = useToast();

  // Form state for DLQ configuration
  const [configForm, setConfigForm] = useState({
    queueName: '',
    deadLetterExchange: '',
    deadLetterRoutingKey: '',
    messageTtl: '',
    maxLength: '',
    maxLengthBytes: '',
    deadLetterStrategy: 'at-most-once' as 'at-most-once' | 'at-least-once'
  });

  // Replay configuration
  const [replayConfig, setReplayConfig] = useState({
    targetExchange: '',
    targetRoutingKey: '',
    modifyPayload: false,
    newPayload: '',
    addHeaders: false,
    additionalHeaders: '{}',
    delaySeconds: 0,
    batchSize: 10
  });

  // Load dead letter queues
  const loadDeadLetterQueues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8081/api/dead-letter-queues');
      if (!response.ok) {
        throw new Error(`Failed to load dead letter queues: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setDeadLetterQueues(result.data);
      } else {
        throw new Error(result.error || 'Failed to load dead letter queues');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading dead letter queues",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages from a dead letter queue
  const loadDeadLetterMessages = async (queueName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8081/api/dead-letter-queues/${encodeURIComponent(queueName)}/messages`);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setDeadLetterMessages(result.data);
        setSelectedQueue(queueName);
      } else {
        throw new Error(result.error || 'Failed to load messages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading dead letter messages",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Configure dead letter queue settings
  const configureDeadLetterQueue = async () => {
    try {
      let parsedHeaders = {};
      if (configForm.deadLetterRoutingKey.trim()) {
        try {
          parsedHeaders = { 'x-dead-letter-routing-key': configForm.deadLetterRoutingKey };
        } catch {
          throw new Error('Invalid routing key configuration');
        }
      }

      const queueArguments: Record<string, unknown> = {
        'x-dead-letter-exchange': configForm.deadLetterExchange,
        ...parsedHeaders
      };

      if (configForm.messageTtl) {
        queueArguments['x-message-ttl'] = parseInt(configForm.messageTtl);
      }
      if (configForm.maxLength) {
        queueArguments['x-max-length'] = parseInt(configForm.maxLength);
      }
      if (configForm.maxLengthBytes) {
        queueArguments['x-max-length-bytes'] = parseInt(configForm.maxLengthBytes);
      }

      const response = await fetch('http://localhost:8081/api/dead-letter-queues/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueName: configForm.queueName,
          arguments: queueArguments,
          strategy: configForm.deadLetterStrategy
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Dead letter queue configured",
          description: `Queue "${configForm.queueName}" configured for dead lettering`,
        });
        setShowConfigDialog(false);
        resetConfigForm();
        loadDeadLetterQueues();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || 'Failed to configure dead letter queue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error configuring dead letter queue",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Replay messages
  const replayMessages = async (messageIds?: string[]) => {
    try {
      const idsToReplay = messageIds || Array.from(selectedMessages);
      
      if (idsToReplay.length === 0) {
        throw new Error('No messages selected for replay');
      }

      let additionalHeaders = {};
      if (replayConfig.addHeaders && replayConfig.additionalHeaders) {
        try {
          additionalHeaders = JSON.parse(replayConfig.additionalHeaders);
        } catch {
          throw new Error('Invalid JSON in additional headers');
        }
      }

      const response = await fetch('http://localhost:8081/api/dead-letter-queues/replay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueName: selectedQueue,
          messageIds: idsToReplay,
          targetExchange: replayConfig.targetExchange,
          targetRoutingKey: replayConfig.targetRoutingKey,
          modifyPayload: replayConfig.modifyPayload,
          newPayload: replayConfig.newPayload,
          additionalHeaders,
          delaySeconds: replayConfig.delaySeconds,
          batchSize: replayConfig.batchSize
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Messages replayed",
          description: `${idsToReplay.length} message(s) replayed successfully`,
        });
        setShowReplayDialog(false);
        setSelectedMessages(new Set());
        resetReplayConfig();
        if (selectedQueue) {
          loadDeadLetterMessages(selectedQueue);
        }
      } else {
        throw new Error(result.error || 'Failed to replay messages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error replaying messages",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Delete messages
  const deleteMessages = async (messageIds?: string[]) => {
    try {
      const idsToDelete = messageIds || Array.from(selectedMessages);
      
      if (idsToDelete.length === 0) {
        throw new Error('No messages selected for deletion');
      }

      const response = await fetch('http://localhost:8081/api/dead-letter-queues/messages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueName: selectedQueue,
          messageIds: idsToDelete
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Messages deleted",
          description: `${idsToDelete.length} message(s) deleted successfully`,
        });
        setSelectedMessages(new Set());
        if (selectedQueue) {
          loadDeadLetterMessages(selectedQueue);
        }
      } else {
        throw new Error(result.error || 'Failed to delete messages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error deleting messages",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Export messages
  const exportMessages = async (messageIds?: string[]) => {
    try {
      const idsToExport = messageIds || Array.from(selectedMessages);
      
      if (idsToExport.length === 0) {
        throw new Error('No messages selected for export');
      }

      const response = await fetch('http://localhost:8081/api/dead-letter-queues/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueName: selectedQueue,
          messageIds: idsToExport
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export messages');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dlq-messages-${selectedQueue}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Messages exported",
        description: `${idsToExport.length} message(s) exported successfully`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error exporting messages",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetConfigForm = () => {
    setConfigForm({
      queueName: '',
      deadLetterExchange: '',
      deadLetterRoutingKey: '',
      messageTtl: '',
      maxLength: '',
      maxLengthBytes: '',
      deadLetterStrategy: 'at-most-once'
    });
  };

  const resetReplayConfig = () => {
    setReplayConfig({
      targetExchange: '',
      targetRoutingKey: '',
      modifyPayload: false,
      newPayload: '',
      addHeaders: false,
      additionalHeaders: '{}',
      delaySeconds: 0,
      batchSize: 10
    });
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
  };

  const toggleAllMessages = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredMessages.map(msg => msg.id)));
    }
  };

  // Filter messages based on search and reason
  const filteredMessages = deadLetterMessages.filter(message => {
    const matchesSearch = !searchFilter || 
      message.payload.toLowerCase().includes(searchFilter.toLowerCase()) ||
      message.routingKey.toLowerCase().includes(searchFilter.toLowerCase()) ||
      message.originalQueue.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesReason = reasonFilter === 'all' || message.deadLetterReason === reasonFilter;
    
    return matchesSearch && matchesReason;
  });

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'maxlen': return 'bg-blue-100 text-blue-800';
      case 'delivery_limit': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    loadDeadLetterQueues();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queues" className="flex items-center gap-2">
            <Skull className="w-4 h-4" />
            DLQ Management
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Message Inspection
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queues" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Dead Letter Queues</h3>
              <p className="text-sm text-muted-foreground">
                Manage dead letter queue configuration and monitor failed messages
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={loadDeadLetterQueues}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configure DLQ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configure Dead Letter Queue</DialogTitle>
                    <DialogDescription>
                      Set up dead letter queue routing for a queue
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="queueName">Queue Name</Label>
                        <Input
                          id="queueName"
                          value={configForm.queueName}
                          onChange={(e) => setConfigForm({ ...configForm, queueName: e.target.value })}
                          placeholder="e.g., orders.processing"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="deadLetterExchange">Dead Letter Exchange</Label>
                        <Input
                          id="deadLetterExchange"
                          value={configForm.deadLetterExchange}
                          onChange={(e) => setConfigForm({ ...configForm, deadLetterExchange: e.target.value })}
                          placeholder="e.g., dlx"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deadLetterRoutingKey">Dead Letter Routing Key</Label>
                        <Input
                          id="deadLetterRoutingKey"
                          value={configForm.deadLetterRoutingKey}
                          onChange={(e) => setConfigForm({ ...configForm, deadLetterRoutingKey: e.target.value })}
                          placeholder="e.g., failed.orders"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="deadLetterStrategy">Strategy</Label>
                        <Select
                          value={configForm.deadLetterStrategy}
                          onValueChange={(value: 'at-most-once' | 'at-least-once') => 
                            setConfigForm({ ...configForm, deadLetterStrategy: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="at-most-once">At Most Once</SelectItem>
                            <SelectItem value="at-least-once">At Least Once</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="messageTtl">Message TTL (ms)</Label>
                        <Input
                          id="messageTtl"
                          type="number"
                          value={configForm.messageTtl}
                          onChange={(e) => setConfigForm({ ...configForm, messageTtl: e.target.value })}
                          placeholder="30000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxLength">Max Length</Label>
                        <Input
                          id="maxLength"
                          type="number"
                          value={configForm.maxLength}
                          onChange={(e) => setConfigForm({ ...configForm, maxLength: e.target.value })}
                          placeholder="1000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxLengthBytes">Max Length (Bytes)</Label>
                        <Input
                          id="maxLengthBytes"
                          type="number"
                          value={configForm.maxLengthBytes}
                          onChange={(e) => setConfigForm({ ...configForm, maxLengthBytes: e.target.value })}
                          placeholder="1048576"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={() => setShowConfigDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={configureDeadLetterQueue} disabled={!configForm.queueName || !configForm.deadLetterExchange}>
                      Configure
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Dead Letter Queues Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Skull className="w-4 h-4" />
                Dead Letter Queues ({deadLetterQueues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading dead letter queues...</span>
                </div>
              ) : deadLetterQueues.length === 0 ? (
                <div className="text-center py-8">
                  <Skull className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No dead letter queues found</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure dead letter queues to handle failed messages
                  </p>
                  <Button onClick={() => setShowConfigDialog(true)} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configure DLQ
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Queue Name</TableHead>
                      <TableHead>Original Queue</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Message Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadLetterQueues.map((queue) => (
                      <TableRow key={queue.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Skull className="w-4 h-4 text-red-600" />
                            {queue.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {queue.originalQueue || 'Multiple'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-red-600">{queue.messageCount} failed</div>
                            <div className="text-xs text-muted-foreground">
                              {queue.consumerCount} consumers
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {queue.messageRate.toFixed(2)}/s
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                loadDeadLetterMessages(queue.name);
                                setActiveTab('messages');
                              }}
                              className="gap-1 h-8 px-3 text-xs"
                            >
                              <Eye className="w-3 h-3" />
                              Inspect
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
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {/* Message controls */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Dead Letter Messages</h3>
              {selectedQueue && (
                <p className="text-sm text-muted-foreground">
                  Inspecting messages in queue: {selectedQueue}
                </p>
              )}
            </div>
            
            {selectedQueue && (
              <div className="flex items-center gap-2">
                {selectedMessages.size > 0 && (
                  <>
                    <Dialog open={showReplayDialog} onOpenChange={setShowReplayDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Replay ({selectedMessages.size})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Replay Dead Letter Messages</DialogTitle>
                          <DialogDescription>
                            Configure how to replay {selectedMessages.size} selected message(s)
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="targetExchange">Target Exchange</Label>
                              <Input
                                id="targetExchange"
                                value={replayConfig.targetExchange}
                                onChange={(e) => setReplayConfig({ ...replayConfig, targetExchange: e.target.value })}
                                placeholder="e.g., orders.exchange"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="targetRoutingKey">Target Routing Key</Label>
                              <Input
                                id="targetRoutingKey"
                                value={replayConfig.targetRoutingKey}
                                onChange={(e) => setReplayConfig({ ...replayConfig, targetRoutingKey: e.target.value })}
                                placeholder="e.g., order.retry"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="modifyPayload"
                                checked={replayConfig.modifyPayload}
                                onCheckedChange={(checked) => 
                                  setReplayConfig({ ...replayConfig, modifyPayload: !!checked })
                                }
                              />
                              <Label htmlFor="modifyPayload">Modify message payload</Label>
                            </div>
                            
                            {replayConfig.modifyPayload && (
                              <div className="space-y-2">
                                <Label htmlFor="newPayload">New Payload</Label>
                                <Textarea
                                  id="newPayload"
                                  value={replayConfig.newPayload}
                                  onChange={(e) => setReplayConfig({ ...replayConfig, newPayload: e.target.value })}
                                  placeholder="Enter new message payload"
                                  rows={4}
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="addHeaders"
                                checked={replayConfig.addHeaders}
                                onCheckedChange={(checked) => 
                                  setReplayConfig({ ...replayConfig, addHeaders: !!checked })
                                }
                              />
                              <Label htmlFor="addHeaders">Add additional headers</Label>
                            </div>
                            
                            {replayConfig.addHeaders && (
                              <div className="space-y-2">
                                <Label htmlFor="additionalHeaders">Additional Headers (JSON)</Label>
                                <Textarea
                                  id="additionalHeaders"
                                  value={replayConfig.additionalHeaders}
                                  onChange={(e) => setReplayConfig({ ...replayConfig, additionalHeaders: e.target.value })}
                                  placeholder='{"retry-attempt": 1, "replayed-at": "timestamp"}'
                                  rows={3}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="delaySeconds">Delay (seconds)</Label>
                              <Input
                                id="delaySeconds"
                                type="number"
                                value={replayConfig.delaySeconds}
                                onChange={(e) => setReplayConfig({ ...replayConfig, delaySeconds: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="batchSize">Batch Size</Label>
                              <Input
                                id="batchSize"
                                type="number"
                                value={replayConfig.batchSize}
                                onChange={(e) => setReplayConfig({ ...replayConfig, batchSize: parseInt(e.target.value) || 1 })}
                                placeholder="10"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button onClick={() => setShowReplayDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => replayMessages()} 
                            disabled={!replayConfig.targetExchange}
                          >
                            Replay Messages
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      onClick={() => exportMessages()}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export ({selectedMessages.size})
                    </Button>
                    
                    <Button
                      onClick={() => deleteMessages()}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedMessages.size})
                    </Button>
                  </>
                )}
                
                <Button
                  onClick={() => selectedQueue && loadDeadLetterMessages(selectedQueue)}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          {selectedQueue && deadLetterMessages.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <Input
                  placeholder="Search messages..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="maxlen">Max Length</SelectItem>
                  <SelectItem value="delivery_limit">Delivery Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Messages Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {selectedQueue ? `Messages in ${selectedQueue}` : 'Select a queue to inspect messages'}
                {selectedQueue && ` (${filteredMessages.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedQueue ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No queue selected</h3>
                  <p className="text-muted-foreground">
                    Select a dead letter queue from the previous tab to inspect its messages
                  </p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading messages...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                  <p className="text-muted-foreground">
                    {deadLetterMessages.length === 0 
                      ? 'This dead letter queue is empty'
                      : 'No messages match the current filters'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select all header */}
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Button
                      onClick={toggleAllMessages}
                      className="gap-2 h-8 px-3 text-xs"
                    >
                      {selectedMessages.size === filteredMessages.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {selectedMessages.size === filteredMessages.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedMessages.size} of {filteredMessages.length} selected
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="space-y-2">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`border rounded-lg p-4 ${
                          selectedMessages.has(message.id) 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={selectedMessages.has(message.id)}
                              onCheckedChange={() => toggleMessageSelection(message.id)}
                            />
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={getReasonBadgeColor(message.deadLetterReason)}>
                                    {message.deadLetterReason}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    From: {message.originalQueue}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    Routing: {message.routingKey || 'none'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => {
                                      setSelectedMessage(message);
                                      setShowMessageDialog(true);
                                    }}
                                    className="gap-1 h-8 px-3 text-xs"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                  
                                  <Button
                                    onClick={() => replayMessages([message.id])}
                                    className="gap-1 h-8 px-3 text-xs"
                                  >
                                    <Play className="w-3 h-3" />
                                    Replay
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="text-sm space-y-1">
                                <div>
                                  <span className="font-medium">Payload:</span> 
                                  <span className="ml-2 text-muted-foreground">
                                    {message.payload.length > 100 
                                      ? `${message.payload.substring(0, 100)}...`
                                      : message.payload
                                    }
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Failed:</span> {' '}
                                    {new Date(message.deadLetterTime).toLocaleString()}
                                  </div>
                                  <div>
                                    <span className="font-medium">Redeliveries:</span> {' '}
                                    {message.redeliveryCount}
                                  </div>
                                  <div>
                                    <span className="font-medium">Message ID:</span> {' '}
                                    {message.properties.messageId || 'None'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Dead Letter Analytics
              </CardTitle>
              <CardDescription>
                Overview of dead letter queue performance and failure patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total DLQs</p>
                  <p className="text-2xl font-bold text-red-600">{deadLetterQueues.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Failed Messages</p>
                  <p className="text-2xl font-bold text-red-600">
                    {deadLetterQueues.reduce((sum, q) => sum + q.messageCount, 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Failure Rate</p>
                  <p className="text-2xl font-bold text-red-600">
                    {deadLetterQueues.reduce((sum, q) => sum + q.messageRate, 0).toFixed(2)}/s
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active DLQ Consumers</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {deadLetterQueues.reduce((sum, q) => sum + q.consumerCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Full details of the dead letter message
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Message ID</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {selectedMessage.properties.messageId || 'None'}
                  </div>
                </div>
                <div>
                  <Label>Dead Letter Reason</Label>
                  <div className="mt-1">
                    <Badge className={getReasonBadgeColor(selectedMessage.deadLetterReason)}>
                      {selectedMessage.deadLetterReason}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Original Queue</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {selectedMessage.originalQueue}
                  </div>
                </div>
                <div>
                  <Label>Exchange</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {selectedMessage.exchange}
                  </div>
                </div>
                <div>
                  <Label>Routing Key</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {selectedMessage.routingKey || 'None'}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Message Payload</Label>
                <Textarea
                  value={selectedMessage.payload}
                  readOnly
                  rows={8}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              
              {selectedMessage.properties.headers && Object.keys(selectedMessage.properties.headers).length > 0 && (
                <div>
                  <Label>Headers</Label>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedMessage.properties.headers, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Failed At</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">
                    {new Date(selectedMessage.deadLetterTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>Redelivery Count</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedMessage.redeliveryCount}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowMessageDialog(false)}>
              Close
            </Button>
            {selectedMessage && (
              <Button 
                onClick={() => {
                  setShowMessageDialog(false);
                  replayMessages([selectedMessage.id]);
                }}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Replay Message
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeadLetterQueueManager;
