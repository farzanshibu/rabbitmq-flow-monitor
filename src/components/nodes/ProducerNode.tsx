import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Send } from 'lucide-react';

interface ProducerData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
}

const ProducerNode = ({ data }: NodeProps) => {
  const nodeData = data as unknown as ProducerData;
  return (
    <div className="relative">
      <div className={`node-status ${nodeData.status}`} />
      <div className="flex items-center gap-2">
        <Send size={16} />
        <div>
          <div className="font-medium">{nodeData.label}</div>
          {nodeData.messageRate !== undefined && (
            <div className="node-metrics">
              {nodeData.messageRate} msg/s
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="custom-handle source"
      />
    </div>
  );
};

export default memo(ProducerNode);