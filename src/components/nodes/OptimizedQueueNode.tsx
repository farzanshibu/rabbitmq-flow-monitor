import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface OptimizedQueueNodeData {
  name: string;
  vhost: string;
  messages: number;
  consumers: number;
  memory?: number;
  state: string;
  performanceMode?: boolean;
}

export const OptimizedQueueNode: React.FC<NodeProps> = memo(({ 
  data, 
  selected 
}) => {
  const nodeData = data as unknown as OptimizedQueueNodeData;
  const { name, messages, consumers, state, performanceMode } = nodeData;

  // Memoized badge color calculation
  const badgeVariant = useMemo(() => {
    if (performanceMode) return 'secondary' as const;
    
    if (messages > 1000) return 'destructive' as const;
    if (messages > 100) return 'default' as const;
    return 'secondary' as const;
  }, [messages, performanceMode]);

  // Simplified rendering in performance mode
  if (performanceMode) {
    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-2 min-w-[120px]">
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-blue-500"
        />
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-xs text-gray-500">{messages} msgs</div>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-blue-500"
        />
      </div>
    );
  }

  return (
    <Card className={`min-w-[200px] transition-all duration-200 ${
      selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-md hover:shadow-lg'
    }`}>
      <CardContent className="p-3">
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 !bg-blue-500 border-2 border-white"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate flex-1">{name}</h3>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              badgeVariant === 'destructive' ? 'bg-red-100 text-red-800' :
              badgeVariant === 'default' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              Queue
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="text-gray-600">Messages</div>
              <div className="font-medium">{messages.toLocaleString()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600">Consumers</div>
              <div className="font-medium">{consumers}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              state === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {state}
            </div>
          </div>
        </div>
        
        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-4 !bg-blue-500 border-2 border-white"
        />
      </CardContent>
    </Card>
  );
});

OptimizedQueueNode.displayName = 'OptimizedQueueNode';
