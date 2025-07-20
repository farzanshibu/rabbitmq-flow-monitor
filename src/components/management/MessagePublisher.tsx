import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Save,
  FileText,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Exchange {
  name: string;
  type: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  exchange: string;
  routingKey: string;
  payload: string;
  properties: Record<string, unknown>;
}

interface MessagePublisherProps {
  onRefresh?: () => void;
}

export const MessagePublisher: React.FC<MessagePublisherProps> = ({ onRefresh }) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('publish');
  const { toast } = useToast();

  // Form state for publishing messages
  const [formData, setFormData] = useState({
    exchange: '',
    routingKey: '',
    payload: '',
    properties: '{}',
    templateName: ''
  });

  // Load exchanges for dropdown
  const loadExchanges = async () => {
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
  };

  // Publish message
  const publishMessage = async () => {
    try {
      let parsedProperties = {};
      if (formData.properties.trim()) {
        try {
          parsedProperties = JSON.parse(formData.properties);
        } catch {
          throw new Error('Invalid JSON in properties field');
        }
      }

      setPublishing(true);
      const response = await fetch('http://localhost:8081/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: formData.exchange,
          routingKey: formData.routingKey,
          payload: formData.payload,
          properties: parsedProperties
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Message published",
          description: `Message sent successfully to exchange "${formData.exchange}"`,
        });
        if (onRefresh) onRefresh();
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
    } finally {
      setPublishing(false);
    }
  };

  // Save message template
  const saveTemplate = () => {
    if (!formData.templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for the template",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: MessageTemplate = {
      id: Date.now().toString(),
      name: formData.templateName,
      exchange: formData.exchange,
      routingKey: formData.routingKey,
      payload: formData.payload,
      properties: JSON.parse(formData.properties || '{}')
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('messageTemplates', JSON.stringify(updatedTemplates));
    
    toast({
      title: "Template saved",
      description: `Template "${formData.templateName}" saved successfully`,
    });
    
    setFormData({ ...formData, templateName: '' });
  };

  // Load template
  const loadTemplate = (template: MessageTemplate) => {
    setFormData({
      exchange: template.exchange,
      routingKey: template.routingKey,
      payload: template.payload,
      properties: JSON.stringify(template.properties, null, 2),
      templateName: ''
    });
    setActiveTab('publish');
    toast({
      title: "Template loaded",
      description: `Template "${template.name}" loaded successfully`,
    });
  };

  // Delete template
  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('messageTemplates', JSON.stringify(updatedTemplates));
    toast({
      title: "Template deleted",
      description: "Template deleted successfully",
    });
  };

  const resetForm = () => {
    setFormData({
      exchange: '',
      routingKey: '',
      payload: '',
      properties: '{}',
      templateName: ''
    });
  };

  useEffect(() => {
    loadExchanges();
    // Load templates from localStorage
    const savedTemplates = localStorage.getItem('messageTemplates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Failed to parse saved templates:', error);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Publish Message
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Publish Test Message
              </CardTitle>
              <CardDescription>
                Send test messages to exchanges for debugging and testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Select 
                    value={formData.exchange} 
                    onValueChange={(value) => setFormData({ ...formData, exchange: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an exchange" />
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
                  <Label htmlFor="routingKey">Routing Key</Label>
                  <Input
                    id="routingKey"
                    value={formData.routingKey}
                    onChange={(e) => setFormData({ ...formData, routingKey: e.target.value })}
                    placeholder="e.g., user.created"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payload">Message Payload</Label>
                <Textarea
                  id="payload"
                  value={formData.payload}
                  onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                  placeholder="Enter your message content here..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="properties">Message Properties (JSON)</Label>
                <Textarea
                  id="properties"
                  value={formData.properties}
                  onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
                  placeholder='{"priority": 1, "timestamp": "2024-01-01"}'
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={publishMessage}
                  disabled={!formData.exchange || publishing}
                  className="gap-2"
                >
                  {publishing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {publishing ? 'Publishing...' : 'Publish Message'}
                </Button>

                <Button onClick={resetForm} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reset Form
                </Button>
              </div>

              {/* Save Template Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="templateName">Save as Template</Label>
                    <Input
                      id="templateName"
                      value={formData.templateName}
                      onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                      placeholder="Enter template name..."
                    />
                  </div>
                  <Button
                    onClick={saveTemplate}
                    disabled={!formData.templateName.trim()}
                    className="gap-2 mt-6"
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Message Templates ({templates.length})
              </CardTitle>
              <CardDescription>
                Saved message templates for quick reuse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates saved</h3>
                  <p className="text-muted-foreground mb-4">
                    Create and save message templates for quick reuse
                  </p>
                  <Button onClick={() => setActiveTab('publish')} className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Create Message
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold">{template.name}</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div><strong>Exchange:</strong> {template.exchange || '(default)'}</div>
                              <div><strong>Routing Key:</strong> {template.routingKey || '(none)'}</div>
                              <div><strong>Payload:</strong> {template.payload.substring(0, 100)}{template.payload.length > 100 ? '...' : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              onClick={() => loadTemplate(template)}
                              className="gap-2"
                            >
                              <History className="w-4 h-4" />
                              Load
                            </Button>
                            <Button
                              onClick={() => deleteTemplate(template.id)}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

export default MessagePublisher;
