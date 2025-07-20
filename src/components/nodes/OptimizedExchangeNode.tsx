import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '../ui/card';

interface OptimizedExchangeNodeData {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  internal: boolean;
  performanceMode?: boolean;
}

export const OptimizedExchangeNode: React.FC<NodeProps> = memo(({ 
  data, 
  selected 
}) => {
  const nodeData = data as unknown as OptimizedExchangeNodeData;
  const { name, type, durable, performanceMode } = nodeData;

  // Memoized type color
  const typeColor = useMemo(() => {
    switch (type) {
      case 'direct': return 'bg-green-100 border-green-300';
      case 'fanout': return 'bg-blue-100 border-blue-300';
      case 'topic': return 'bg-purple-100 border-purple-300';
      case 'headers': return 'bg-orange-100 border-orange-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  }, [type]);

  // Simplified rendering in performance mode
  if (performanceMode) {
    return (
      <div className={`border-2 rounded-lg p-2 min-w-[120px] ${typeColor}`}>
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-green-500"
        />
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-xs text-gray-500">{type}</div>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-green-500"
        />
      </div>
    );
  }

  return (
    <Card className={`min-w-[200px] transition-all duration-200 ${
      selected ? 'ring-2 ring-green-500 shadow-lg' : 'shadow-md hover:shadow-lg'
    }`}>
      <CardContent className="p-3">
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 !bg-green-500 border-2 border-white"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate flex-1">{name}</h3>
            <div className={`px-2 py-1 rounded text-xs font-medium ${typeColor}`}>
              {type}
            </div>
          </div>
          
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Durable</span>
              <span className={`font-medium ${durable ? 'text-green-600' : 'text-gray-400'}`}>
                {durable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
        
        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-4 !bg-green-500 border-2 border-white"
        />
      </CardContent>
    </Card>
  );
});

OptimizedExchangeNode.displayName = 'OptimizedExchangeNode';
