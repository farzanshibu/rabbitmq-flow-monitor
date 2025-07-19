import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Inbox } from 'lucide-react';

interface QueueData {
  label: string;
  status: 'active' | 'idle' | 'error';
  messageCount: number;
  consumerCount: number;
  messageRate?: number;
  durable: boolean;
}

const QueueNode = ({ data }: NodeProps) => {
  const nodeData = data as unknown as QueueData;
  return (
    <div className="relative">
      <div className={`node-status ${nodeData.status}`} />
      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle target"
      />
      <div className="flex items-center gap-2">
        <Inbox size={16} />
        <div>
          <div className="font-medium">{nodeData.label}</div>
          <div className="text-xs opacity-75">
            {nodeData.messageCount} msgs • {nodeData.consumerCount} consumers
          </div>
          <div className="text-xs opacity-75">
            {nodeData.durable ? 'Durable' : 'Transient'}
          </div>
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

export default memo(QueueNode);