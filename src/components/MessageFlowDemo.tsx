import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { MessageFlow } from '@/services/rabbitmqWebSocket';
import { MessageFlowGenerator, testFlows } from '@/utils/messageFlowGenerator';

interface MessageFlowDemoProps {
  onNewFlow: (flow: MessageFlow) => void;
  activeFlowsCount: number;
}

export const MessageFlowDemo: React.FC<MessageFlowDemoProps> = ({ 
  onNewFlow, 
  activeFlowsCount 
}) => {
  const [generator] = useState(() => new MessageFlowGenerator(2000)); // 2 second interval
  const [isRunning, setIsRunning] = useState(false);
  const [flowCount, setFlowCount] = useState(0);

  useEffect(() => {
    return () => {
      generator.stop();
    };
  }, [generator]);

  const startDemo = () => {
    generator.start((flow) => {
      onNewFlow(flow);
      setFlowCount(prev => prev + 1);
    });
    setIsRunning(true);
  };

  const stopDemo = () => {
    generator.stop();
    setIsRunning(false);
  };

  const resetDemo = () => {
    generator.stop();
    setIsRunning(false);
    setFlowCount(0);
  };

  const sendSingleFlow = (type: 'direct' | 'fanout' | 'topic') => {
    let flow: MessageFlow;
    switch (type) {
      case 'direct':
        flow = testFlows.direct();
        break;
      case 'fanout':
        flow = testFlows.fanout();
        break;
      case 'topic':
        flow = testFlows.topic();
        break;
    }
    onNewFlow(flow);
    setFlowCount(prev => prev + 1);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          Message Flow Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={startDemo} size="sm" className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Auto Demo
            </Button>
          ) : (
            <Button onClick={stopDemo} size="sm" variant="outline" className="flex-1">
              <Pause className="w-4 h-4 mr-2" />
              Stop Demo
            </Button>
          )}
          <Button onClick={resetDemo} size="sm" variant="outline">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Manual Flow Triggers */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Send Single Message:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => sendSingleFlow('direct')} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Direct
            </Button>
            <Button 
              onClick={() => sendSingleFlow('fanout')} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Fanout
            </Button>
            <Button 
              onClick={() => sendSingleFlow('topic')} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Topic
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{flowCount}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeFlowsCount}</p>
            <p className="text-xs text-muted-foreground">Active Flows</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {isRunning && (
            <p className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Sending messages every 2 seconds...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageFlowDemo;
