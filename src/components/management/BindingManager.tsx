import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, GitBranch, RefreshCw, AlertTriangle, CheckCircle, Link, Unlink, Route, Key } from 'lucide-react';
import { rabbitmqAPI } from '@/services/rabbitmqAPI';

interface Exchange {
  name: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  durable: boolean;
  autoDelete: boolean;
  internal: boolean;
  vhost?: string;
}

interface Queue {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  vhost?: string;
}

interface Binding {
  source: string; // exchange name
  destination: string; // queue or exchange name
  destinationType: 'queue' | 'exchange';
  routingKey: string;
  arguments: Record<string, unknown>;
  vhost?: string;
}

interface BindingFormData {
  source: string;
  destination: string;
  destinationType: 'queue' | 'exchange';
  routingKey: string;
  arguments: string; // JSON string
  vhost: string;
}

interface BindingManagerProps {
  isConnected: boolean;
  onRefresh: () => void;
}

export const BindingManager: React.FC<BindingManagerProps> = ({ isConnected, onRefresh }) => {
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BindingFormData>({
    source: '',
    destination: '',
    destinationType: 'queue',
    routingKey: '',
    arguments: '{}',
    vhost: '/'
  });
  const [deleteBinding, setDeleteBinding] = useState<Binding | null>(null);
  const [selectedBindings, setSelectedBindings] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('list');

  // Fetch all data on component mount and when connection status changes
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchBindings(),
          fetchExchanges(),
          fetchQueues()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      fetchAllData();
    }
  }, [isConnected]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBindings(),
        fetchExchanges(),
        fetchQueues()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBindings = async () => {
    try {
      const result = await rabbitmqAPI.getBindings();
      if (result.success && result.data) {
        setBindings(result.data);
      } else {
        toast({
          title: "Error fetching bindings",
          description: result.error || "Failed to fetch bindings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching bindings:', error);
    }
  };

  const fetchExchanges = async () => {
    try {
      const result = await rabbitmqAPI.getExchanges();
      if (result.success && result.data) {
        setExchanges(result.data);
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error);
    }
  };

  const fetchQueues = async () => {
    try {
      const result = await rabbitmqAPI.getQueues();
      if (result.success && result.data) {
        setQueues(result.data);
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.source.trim()) {
      toast({
        title: "Validation Error",
        description: "Source exchange is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.destination.trim()) {
      toast({
        title: "Validation Error",
        description: "Destination is required",
        variant: "destructive",
      });
      return false;
    }

    // Validate routing key for different exchange types
    const sourceExchange = exchanges.find(e => e.name === formData.source);
    if (sourceExchange) {
      if (sourceExchange.type === 'fanout' && formData.routingKey) {
        toast({
          title: "Validation Warning",
          description: "Fanout exchanges ignore routing keys",
          variant: "default",
        });
      }
      
      if (sourceExchange.type === 'direct' && !formData.routingKey.trim()) {
        toast({
          title: "Validation Error",
          description: "Direct exchanges require a routing key",
          variant: "destructive",
        });
        return false;
      }
    }

    try {
      JSON.parse(formData.arguments);
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Arguments must be valid JSON",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const bindingData: Binding = {
        source: formData.source,
        destination: formData.destination,
        destinationType: formData.destinationType,
        routingKey: formData.routingKey,
        arguments: JSON.parse(formData.arguments),
        vhost: formData.vhost
      };

      const result = await rabbitmqAPI.createBinding(bindingData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Binding created successfully",
        });
        
        // Reset form
        setFormData({
          source: '',
          destination: '',
          destinationType: 'queue',
          routingKey: '',
          arguments: '{}',
          vhost: '/'
        });
        
        // Refresh bindings list
        await fetchBindings();
        onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create binding",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating binding:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (binding: Binding) => {
    setLoading(true);
    try {
      const result = await rabbitmqAPI.deleteBinding(binding);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Binding deleted successfully",
        });
        
        // Refresh bindings list
        await fetchBindings();
        onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete binding",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting binding:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteBinding(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBindings.size === 0) return;

    setLoading(true);
    try {
      const bindingsToDelete = bindings.filter(b => 
        selectedBindings.has(`${b.source}-${b.destination}-${b.routingKey}`)
      );

      const results = await Promise.all(
        bindingsToDelete.map(binding => rabbitmqAPI.deleteBinding(binding))
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast({
          title: "Bulk Delete Complete",
          description: `Successfully deleted ${successful} bindings${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }

      if (failed > 0) {
        toast({
          title: "Some deletions failed",
          description: `${failed} bindings could not be deleted`,
          variant: "destructive",
        });
      }

      setSelectedBindings(new Set());
      await fetchBindings();
      onRefresh();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        title: "Error",
        description: "An error occurred during bulk delete",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      source: '',
      destination: '',
      destinationType: 'queue',
      routingKey: '',
      arguments: '{}',
      vhost: '/'
    });
  };

  const getDestinationTypeColor = (type: string) => {
    return type === 'queue' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  };

  const getBindingKey = (binding: Binding) => 
    `${binding.source}-${binding.destination}-${binding.routingKey}`;

  const generateRoutingKeyExamples = () => {
    const sourceExchange = exchanges.find(e => e.name === formData.source);
    if (!sourceExchange) return [];

    switch (sourceExchange.type) {
      case 'direct':
        return ['user.created', 'order.completed', 'payment.processed'];
      case 'topic':
        return ['user.*', 'order.#', 'logs.*.error', 'notifications.email.*'];
      case 'headers':
        return ['(use arguments for header matching)', 'x-match=all', 'x-match=any'];
      case 'fanout':
        return ['(routing key ignored for fanout)'];
      default:
        return [];
    }
  };

  const routingKeyExamples = generateRoutingKeyExamples();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Binding Management</h2>
          {!isConnected && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
        <Button 
          onClick={fetchAllData} 
          disabled={loading || !isConnected}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Binding List</TabsTrigger>
          <TabsTrigger value="create">Create Binding</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Existing Bindings
                {selectedBindings.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedBindings.size} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage routing bindings between exchanges and queues. Bindings determine how messages are routed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBindings.size > 0 && (
                <div className="flex gap-2 mb-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Selected ({selectedBindings.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Bindings</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedBindings.size} selected bindings? 
                          This action cannot be undone and may affect message routing.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete Bindings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedBindings(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2">Loading bindings...</span>
                </div>
              ) : bindings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No bindings found</p>
                  <p className="mb-4">Create bindings to route messages between exchanges and queues.</p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Binding
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedBindings.size === bindings.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBindings(new Set(bindings.map(getBindingKey)));
                            } else {
                              setSelectedBindings(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Source Exchange</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Routing Key</TableHead>
                      <TableHead>Arguments</TableHead>
                      <TableHead>VHost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bindings.map((binding) => {
                      const bindingKey = getBindingKey(binding);
                      return (
                        <TableRow key={bindingKey}>
                          <TableCell>
                            <Checkbox
                              checked={selectedBindings.has(bindingKey)}
                              onCheckedChange={(checked) => {
                                const newSelection = new Set(selectedBindings);
                                if (checked) {
                                  newSelection.add(bindingKey);
                                } else {
                                  newSelection.delete(bindingKey);
                                }
                                setSelectedBindings(newSelection);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{binding.source}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{binding.destination}</span>
                              <Badge className={getDestinationTypeColor(binding.destinationType)}>
                                {binding.destinationType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Key className="w-3 h-3 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {binding.routingKey || '(empty)'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {Object.keys(binding.arguments || {}).length > 0 ? (
                              <Badge variant="outline">
                                {Object.keys(binding.arguments).length} args
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>{binding.vhost || '/'}</TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={loading || !isConnected}
                                  onClick={() => setDeleteBinding(binding)}
                                >
                                  <Unlink className="w-4 h-4 mr-1" />
                                  Unbind
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Binding</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the binding from "{binding.source}" 
                                    to "{binding.destination}" with routing key "{binding.routingKey}"? 
                                    This action cannot be undone and may affect message routing.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(binding)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete Binding
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Binding
              </CardTitle>
              <CardDescription>
                Create a binding to route messages from an exchange to a queue or another exchange.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Source Exchange *</Label>
                    <Select 
                      value={formData.source} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                      disabled={loading || !isConnected}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map((exchange) => (
                          <SelectItem key={exchange.name} value={exchange.name}>
                            {exchange.name || '(default)'} ({exchange.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destinationType">Destination Type *</Label>
                    <Select 
                      value={formData.destinationType} 
                      onValueChange={(value: 'queue' | 'exchange') => 
                        setFormData(prev => ({ ...prev, destinationType: value, destination: '' }))
                      }
                      disabled={loading || !isConnected}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="queue">Queue</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">
                      Destination {formData.destinationType === 'queue' ? 'Queue' : 'Exchange'} *
                    </Label>
                    <Select 
                      value={formData.destination} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
                      disabled={loading || !isConnected}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select destination ${formData.destinationType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.destinationType === 'queue' 
                          ? queues.map((queue) => (
                              <SelectItem key={queue.name} value={queue.name}>
                                {queue.name}
                              </SelectItem>
                            ))
                          : exchanges.map((exchange) => (
                              <SelectItem key={exchange.name} value={exchange.name}>
                                {exchange.name || '(default)'} ({exchange.type})
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vhost">Virtual Host</Label>
                    <Input
                      id="vhost"
                      value={formData.vhost}
                      onChange={(e) => setFormData(prev => ({ ...prev, vhost: e.target.value }))}
                      placeholder="/"
                      disabled={loading || !isConnected}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingKey">Routing Key</Label>
                  <Input
                    id="routingKey"
                    value={formData.routingKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, routingKey: e.target.value }))}
                    placeholder="Enter routing key pattern"
                    disabled={loading || !isConnected}
                  />
                  {routingKeyExamples.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Examples for {exchanges.find(e => e.name === formData.source)?.type} exchange:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {routingKeyExamples.map((example, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="cursor-pointer text-xs"
                            onClick={() => setFormData(prev => ({ ...prev, routingKey: example }))}
                          >
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arguments">Arguments (JSON)</Label>
                  <Textarea
                    id="arguments"
                    value={formData.arguments}
                    onChange={(e) => setFormData(prev => ({ ...prev, arguments: e.target.value }))}
                    placeholder='{"x-match": "all", "format": "pdf"}'
                    rows={4}
                    disabled={loading || !isConnected}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional binding arguments in JSON format. Used for headers exchange matching.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading || !isConnected || !formData.source || !formData.destination}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Create Binding
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BindingManager;
