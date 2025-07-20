import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Settings, 
  MessageSquare, 
  GitBranch, 
  Users, 
  Download, 
  Upload,
  Shield,
  Trash2,
  Edit,
  Play,
  RefreshCw,
  BarChart3
} from 'lucide-react';

// Import management components
import { ExchangeManager } from './management/ExchangeManager';
import { QueueManager } from './management/QueueManager';
import { MessagePublisher } from './management/MessagePublisher';
import { ConsumerProducerManager } from './management/ConsumerProducerManager';
import { BindingManager } from './management/BindingManager';
import { VirtualConsumerManager } from './management/VirtualConsumerManager';
import { MonitoringDashboard } from './management/MonitoringDashboard';
import { DeadLetterQueueManager } from './management/DeadLetterQueueManager';
// Placeholder imports for components to be created
// import { ImportExportManager } from './management/ImportExportManager';

// Temporary placeholder components for unimplemented features
const PlaceholderComponent = ({ title, onRefresh }: { title: string; onRefresh?: () => void }) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="flex items-center justify-center py-16">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
          <Settings className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Feature implementation in progress...
          </p>
        </div>
        {onRefresh && (
          <button 
            onClick={onRefresh} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        )}
      </div>
    </CardContent>
  </Card>
);

const VirtualConsumerManagerComponent = VirtualConsumerManager;
const ImportExportManager = ({ onRefresh }: { onRefresh?: () => void }) => <PlaceholderComponent title="Import/Export Manager" onRefresh={onRefresh} />;

interface ManagementInterfaceProps {
  isConnected: boolean;
  onRefresh?: () => void;
}

export const ManagementInterface: React.FC<ManagementInterfaceProps> = ({ 
  isConnected, 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState('exchanges');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const managementTabs = [
    {
      id: 'exchanges',
      label: 'Exchanges',
      icon: GitBranch,
      description: 'Manage message exchanges',
      component: ExchangeManager
    },
    {
      id: 'queues',
      label: 'Queues',
      icon: Settings,
      description: 'Configure message queues',
      component: QueueManager
    },
    {
      id: 'bindings',
      label: 'Bindings',
      icon: GitBranch,
      description: 'Define routing rules',
      component: BindingManager
    },
    {
      id: 'publisher',
      label: 'Publisher',
      icon: MessageSquare,
      description: 'Send test messages',
      component: MessagePublisher
    },
    {
      id: 'consumers-producers',
      label: 'Consumers & Producers',
      icon: Users,
      description: 'Monitor active consumers and producers',
      component: ConsumerProducerManager
    },
    {
      id: 'virtual-consumers',
      label: 'Virtual Consumers',
      icon: Users,
      description: 'Simulate message consumers',
      component: VirtualConsumerManagerComponent
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: BarChart3,
      description: 'Real-time metrics and alerts',
      component: MonitoringDashboard
    },
    {
      id: 'dlq',
      label: 'Dead Letter Queues',
      icon: Trash2,
      description: 'Manage failed messages',
      component: DeadLetterQueueManager
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      icon: Download,
      description: 'Backup and restore configurations',
      component: ImportExportManager
    }
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Management Interface</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Configure and manage RabbitMQ resources
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Connection Status */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 border border-border/40">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'
                }`} />
                <span className="text-sm font-medium text-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Refresh Button */}
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-background text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab Navigation */}
            <div className="flex-shrink-0 px-6 py-6">
              <TabsList className="grid w-full grid-cols-9 bg-muted/50 p-1 rounded-xl shadow-sm h-full">
                {managementTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200 hover:bg-background/50"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight text-center">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              {managementTabs.map((tab) => {
                const Component = tab.component;
                return (
                  <TabsContent 
                    key={tab.id} 
                    value={tab.id} 
                    className="h-full m-0 space-y-6 data-[state=active]:animate-in data-[state=active]:fade-in-50"
                  >
                    {/* Tab Description */}
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <tab.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-semibold">{tab.label}</CardTitle>
                            <CardDescription className="text-base mt-1">{tab.description}</CardDescription>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                            isConnected 
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}>
                            {isConnected ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Component Content */}
                    <div className="space-y-6">
                      {isConnected ? (
                        <Component onRefresh={onRefresh} />
                      ) : (
                        <Card className="border-border/60 shadow-sm">
                          <CardContent className="flex items-center justify-center py-16">
                            <div className="text-center space-y-6 max-w-md">
                              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                                <Shield className="w-10 h-10 text-muted-foreground" />
                              </div>
                              <div className="space-y-3">
                                <h3 className="text-xl font-semibold text-foreground">
                                  Connection Required
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  This management feature requires an active connection to RabbitMQ. 
                                  Please check your connection and try again.
                                </p>
                              </div>
                              <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                              >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Retry Connection
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ManagementInterface;
