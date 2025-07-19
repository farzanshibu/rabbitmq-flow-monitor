import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Radio, Hash, Settings } from 'lucide-react';

interface ExchangeData {
  label: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  status: 'active' | 'idle' | 'error';
  messageRate?: number;
  durable: boolean;
}

const getExchangeIcon = (type: string) => {
  switch (type) {
    case 'direct': return <GitBranch size={16} />;
    case 'fanout': return <Radio size={16} />;
    case 'topic': return <Hash size={16} />;
    case 'headers': return <Settings size={16} />;
    default: return <GitBranch size={16} />;
  }
};

const ExchangeNode = ({ data }: NodeProps) => {
  const nodeData = data as unknown as ExchangeData;
  return (
    <div className="relative">
      <div className={`node-status ${nodeData.status}`} />
      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle target"
      />
      <div className="flex items-center gap-2">
        {getExchangeIcon(nodeData.type)}
        <div>
          <div className="font-medium">{nodeData.label}</div>
          <div className="text-xs opacity-75 capitalize">
            {nodeData.type} {nodeData.durable ? '• Durable' : '• Transient'}
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

export default memo(ExchangeNode);