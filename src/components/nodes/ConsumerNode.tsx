import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Download } from 'lucide-react';

interface ConsumerData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
  prefetchCount: number;
  autoAck: boolean;
}

const ConsumerNode = ({ data }: NodeProps) => {
  const nodeData = data as unknown as ConsumerData;
  return (
    <div className="relative">
      <div className={`node-status ${nodeData.status}`} />
      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle target"
      />
      <div className="flex items-center gap-2">
        <Download size={16} />
        <div>
          <div className="font-medium">{nodeData.label}</div>
          <div className="text-xs opacity-75">
            Prefetch: {nodeData.prefetchCount} • {nodeData.autoAck ? 'Auto-ack' : 'Manual-ack'}
          </div>
          {nodeData.messageRate !== undefined && (
            <div className="node-metrics">
              {nodeData.messageRate} msg/s
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ConsumerNode);