import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '../ui/card';

interface OptimizedConsumerNodeData {
  name: string;
  queue: string;
  state: string;
  performanceMode?: boolean;
}

export const OptimizedConsumerNode: React.FC<NodeProps> = memo(({ 
  data, 
  selected 
}) => {
  const nodeData = data as unknown as OptimizedConsumerNodeData;
  const { name, queue, state, performanceMode } = nodeData;

  // Simplified rendering in performance mode
  if (performanceMode) {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-lg p-2 min-w-[120px]">
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-orange-500"
        />
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-xs text-gray-500">Consumer</div>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-orange-500"
        />
      </div>
    );
  }

  return (
    <Card className={`min-w-[180px] transition-all duration-200 ${
      selected ? 'ring-2 ring-orange-500 shadow-lg' : 'shadow-md hover:shadow-lg'
    }`}>
      <CardContent className="p-3">
        <Handle
          type="target"
          position={Position.Left}
          className="w-4 h-4 !bg-orange-500 border-2 border-white"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate flex-1">{name}</h3>
            <div className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
              Consumer
            </div>
          </div>
          
          <div className="text-xs space-y-1">
            <div>
              <span className="text-gray-600">Queue: </span>
              <span className="font-medium">{queue}</span>
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
          className="w-4 h-4 !bg-orange-500 border-2 border-white"
        />
      </CardContent>
    </Card>
  );
});

OptimizedConsumerNode.displayName = 'OptimizedConsumerNode';
