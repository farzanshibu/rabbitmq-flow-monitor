import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  GitBranch, 
  Trash2, 
  Edit, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Settings,
  Eye,
  Clock,
  BarChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Exchange {
  name: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  durable: boolean;
  autoDelete: boolean;
  internal: boolean;
  arguments: Record<string, unknown>;
  messageStats: {
    publishIn: number;
    publishOut: number;
  };
  policy?: string;
}

interface ExchangeManagerProps {
  onRefresh?: () => void;
}

export const ExchangeManager: React.FC<ExchangeManagerProps> = ({ onRefresh }) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();

  // Form state for creating/editing exchanges
  const [formData, setFormData] = useState({
    name: '',
    type: 'direct' as Exchange['type'],
    durable: true,
    autoDelete: false,
    internal: false,
    arguments: '{}'
  });

  // Load exchanges from backend
  const loadExchanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8081/api/exchanges');
      if (!response.ok) {
        throw new Error(`Failed to load exchanges: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setExchanges(result.data);
      } else {
        throw new Error(result.error || 'Failed to load exchanges');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error loading exchanges",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create new exchange
  const createExchange = async () => {
    try {
      let parsedArguments = {};
      if (formData.arguments.trim()) {
        try {
          parsedArguments = JSON.parse(formData.arguments);
        } catch {
          throw new Error('Invalid JSON in arguments field');
        }
      }

      const response = await fetch('http://localhost:8081/api/exchanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          arguments: parsedArguments
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Exchange created",
          description: `Exchange "${formData.name}" created successfully`,
        });
        setShowCreateDialog(false);
        resetForm();
        loadExchanges();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || 'Failed to create exchange');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error creating exchange",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Delete exchange
  const deleteExchange = async () => {
    if (!selectedExchange) return;

    try {
      const response = await fetch(`http://localhost:8081/api/exchanges/${encodeURIComponent(selectedExchange.name)}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Exchange deleted",
          description: `Exchange "${selectedExchange.name}" deleted successfully`,
        });
        setShowDeleteDialog(false);
        setSelectedExchange(null);
        loadExchanges();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error || 'Failed to delete exchange');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error deleting exchange",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'direct',
      durable: true,
      autoDelete: false,
      internal: false,
      arguments: '{}'
    });
  };

  const getExchangeTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fanout': return 'bg-green-100 text-green-800 border-green-200';
      case 'topic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'headers': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    loadExchanges();
  }, [loadExchanges]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Exchange List
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Exchanges</h3>
              <p className="text-sm text-muted-foreground">
                Manage message exchanges and routing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadExchanges}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Exchange
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Exchange</DialogTitle>
                    <DialogDescription>
                      Configure a new message exchange for routing
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Exchange Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., user.events"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">Exchange Type</Label>
                      <Select value={formData.type} onValueChange={(value: Exchange['type']) => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="fanout">Fanout</SelectItem>
                          <SelectItem value="topic">Topic</SelectItem>
                          <SelectItem value="headers">Headers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="durable">Durable</Label>
                        <Switch
                          id="durable"
                          checked={formData.durable}
                          onCheckedChange={(checked) => setFormData({ ...formData, durable: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoDelete">Auto Delete</Label>
                        <Switch
                          id="autoDelete"
                          checked={formData.autoDelete}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoDelete: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="internal">Internal</Label>
                        <Switch
                          id="internal"
                          checked={formData.internal}
                          onCheckedChange={(checked) => setFormData({ ...formData, internal: checked })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="arguments">Arguments (JSON)</Label>
                      <Input
                        id="arguments"
                        value={formData.arguments}
                        onChange={(e) => setFormData({ ...formData, arguments: e.target.value })}
                        placeholder="{}"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createExchange} disabled={!formData.name}>
                      Create Exchange
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Exchanges Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Exchanges ({exchanges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading exchanges...</span>
                </div>
              ) : exchanges.length === 0 ? (
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exchanges found</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first exchange
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Exchange
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Message Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchanges.map((exchange) => (
                      <TableRow key={exchange.name}>
                        <TableCell className="font-medium">
                          {exchange.name}
                          {exchange.name === '' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getExchangeTypeColor(exchange.type)}>
                            {exchange.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {exchange.durable && (
                              <Badge variant="outline" className="text-xs">
                                Durable
                              </Badge>
                            )}
                            {exchange.autoDelete && (
                              <Badge variant="outline" className="text-xs">
                                Auto-Delete
                              </Badge>
                            )}
                            {exchange.internal && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>In: {exchange.messageStats?.publishIn || 0}/s</div>
                            <div>Out: {exchange.messageStats?.publishOut || 0}/s</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedExchange(exchange)}
                              className="gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                            {exchange.name !== '' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedExchange(exchange);
                                  setShowDeleteDialog(true);
                                }}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            )}
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

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Exchange Statistics
              </CardTitle>
              <CardDescription>
                Overview of exchange performance and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Exchanges</p>
                  <p className="text-2xl font-bold">{exchanges.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Direct</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {exchanges.filter(e => e.type === 'direct').length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Topic</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {exchanges.filter(e => e.type === 'topic').length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fanout</p>
                  <p className="text-2xl font-bold text-green-600">
                    {exchanges.filter(e => e.type === 'fanout').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exchange</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the exchange "{selectedExchange?.name}"? 
              This action cannot be undone and may affect message routing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteExchange}>
              Delete Exchange
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeManager;
