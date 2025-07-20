import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '../ui/card';

interface OptimizedProducerNodeData {
  name: string;
  exchange: string;
  state: string;
  performanceMode?: boolean;
}

export const OptimizedProducerNode: React.FC<NodeProps> = memo(({ 
  data, 
  selected 
}) => {
  const nodeData = data as unknown as OptimizedProducerNodeData;
  const { name, exchange, state, performanceMode } = nodeData;

  // Simplified rendering in performance mode
  if (performanceMode) {
    return (
      <div className="bg-white border-2 border-purple-200 rounded-lg p-2 min-w-[120px]">
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-purple-500"
        />
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-xs text-gray-500">Producer</div>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-purple-500"
        />
      </div>
    );
  }

  return (
    <Card className={`min-w-[180px] transition-all duration-200 ${
      selected ? 'ring-2 ring-purple-500 shadow-lg' : 'shadow-md hover:shadow-lg'
    }`}>
      <CardContent className="p-3">
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 !bg-purple-500 border-2 border-white"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate flex-1">{name}</h3>
            <div className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Producer
            </div>
          </div>
          
          <div className="text-xs space-y-1">
            <div>
              <span className="text-gray-600">Exchange: </span>
              <span className="font-medium">{exchange}</span>
            </div>
            <div>
              <span className="text-gray-600">State: </span>
              <span className={`font-medium ${
                state === 'running' ? 'text-green-600' : 'text-red-600'
              }`}>
                {state}
              </span>
            </div>
          </div>
        </div>
        
        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-4 !bg-purple-500 border-2 border-white"
        />
      </CardContent>
    </Card>
  );
});

OptimizedProducerNode.displayName = 'OptimizedProducerNode';
