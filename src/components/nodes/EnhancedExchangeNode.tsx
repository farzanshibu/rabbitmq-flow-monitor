import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Share, Hash, Filter, TrendingUp } from 'lucide-react';
import { RabbitMQMetrics } from '@/services/rabbitmqWebSocket';

interface ExchangeData {
  label: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  status: 'active' | 'idle' | 'warning' | 'error';
  messageRate?: number;
  durable: boolean;
}

interface EnhancedExchangeNodeProps extends NodeProps {
  realTimeMetrics?: RabbitMQMetrics;
}

const EnhancedExchangeNode = ({ data, realTimeMetrics }: EnhancedExchangeNodeProps) => {
  const nodeData = data as unknown as ExchangeData;
  const [animationClass, setAnimationClass] = useState('');
  const [currentMetrics, setCurrentMetrics] = useState(nodeData);

  useEffect(() => {
    if (realTimeMetrics) {
      setCurrentMetrics(prev => ({
        ...prev,
        messageRate: realTimeMetrics.messageRate,
        status: realTimeMetrics.status
      }));

      setAnimationClass('metrics-update');
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [realTimeMetrics]);

  const getExchangeIcon = (type: string) => {
    switch (type) {
      case 'direct': return <GitBranch size={16} className="text-blue-500" />;
      case 'fanout': return <Share size={16} className="text-purple-500" />;
      case 'topic': return <Hash size={16} className="text-orange-500" />;
      case 'headers': return <Filter size={16} className="text-pink-500" />;
      default: return <GitBranch size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'fanout': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'topic': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'headers': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={`relative transition-all duration-300 ${animationClass}`}>
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(currentMetrics.status)} shadow-lg z-10`}>
        {currentMetrics.status === 'active' && currentMetrics.messageRate && currentMetrics.messageRate > 0 && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor(currentMetrics.status)} animate-ping opacity-75`} />
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle target"
      />
      
      <div className="bg-card border border-border rounded-lg p-3 shadow-sm min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          {getExchangeIcon(currentMetrics.type)}
          <div className="font-medium text-foreground">{currentMetrics.label}</div>
        </div>
        
        <div className="space-y-1 text-xs">
          {/* Exchange Type */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTypeColor(currentMetrics.type)}`}>
              {currentMetrics.type.toUpperCase()}
            </span>
          </div>
          
          {/* Message Rate */}
          {currentMetrics.messageRate !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} />
                <span className="text-muted-foreground">Throughput:</span>
              </div>
              <span className={`font-mono ${
                currentMetrics.messageRate > 30 ? 'text-red-500' :
                currentMetrics.messageRate > 15 ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {currentMetrics.messageRate.toFixed(1)} msg/s
              </span>
            </div>
          )}
          
          {/* Durability */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Durability:</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentMetrics.durable 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {currentMetrics.durable ? 'Durable' : 'Transient'}
            </span>
          </div>
          
          {/* Routing Description */}
          <div className="pt-1 border-t border-border">
            <span className="text-muted-foreground text-xs">
              {currentMetrics.type === 'direct' && 'Routes by exact key match'}
              {currentMetrics.type === 'fanout' && 'Broadcasts to all queues'}
              {currentMetrics.type === 'topic' && 'Routes by pattern matching'}
              {currentMetrics.type === 'headers' && 'Routes by header attributes'}
            </span>
          </div>
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

export default memo(EnhancedExchangeNode);
