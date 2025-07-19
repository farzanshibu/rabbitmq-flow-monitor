import TopologyVisualization from '@/components/TopologyVisualization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Activity, MessageSquare, Users } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">RabbitMQ Manager</h1>
                <p className="text-sm text-muted-foreground">Service Management & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-status-active"></div>
                <span>Connected</span>
              </div>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Topology Visualization */}
      <div className="relative h-[calc(100vh-80px)]">
        <TopologyVisualization />
        
        {/* Quick Stats Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="bg-card/95 backdrop-blur-sm border-border/60 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                System Overview
              </CardTitle>
              <CardDescription className="text-xs">Real-time metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Messages/sec</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-status-active">142.3</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Active Consumers</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-primary">9</div>
                </div>
              </div>
              <div className="pt-2 border-t border-border/60">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Queue Depth</span>
                    <span className="font-medium">525 msgs</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-status-warning h-1.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
