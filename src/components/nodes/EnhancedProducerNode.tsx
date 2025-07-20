import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Send, Activity, Zap } from 'lucide-react';
import { RabbitMQMetrics } from '@/services/rabbitmqWebSocket';

interface ProducerData {
  label: string;
  status: 'active' | 'idle' | 'warning' | 'error';
  messageRate?: number;
}

interface EnhancedProducerNodeProps extends NodeProps {
  realTimeMetrics?: RabbitMQMetrics;
}

const EnhancedProducerNode = ({ data, realTimeMetrics }: EnhancedProducerNodeProps) => {
  const nodeData = data as unknown as ProducerData;
  const [animationClass, setAnimationClass] = useState('');
  const [currentMetrics, setCurrentMetrics] = useState(nodeData);

  useEffect(() => {
    if (realTimeMetrics) {
      setCurrentMetrics(prev => ({
        ...prev,
        messageRate: realTimeMetrics.messageRate,
        status: realTimeMetrics.status
      }));

      // Trigger animation when metrics update
      setAnimationClass('metrics-update');
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [realTimeMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityLevel = () => {
    if (!currentMetrics.messageRate) return 'idle';
    if (currentMetrics.messageRate > 20) return 'high';
    if (currentMetrics.messageRate > 5) return 'medium';
    return 'low';
  };

  return (
    <div className={`relative transition-all duration-300 ${animationClass}`}>
      {/* Status indicator with pulse animation for active producers */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(currentMetrics.status)} shadow-lg z-10`}>
        {currentMetrics.status === 'active' && currentMetrics.messageRate && currentMetrics.messageRate > 0 && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor(currentMetrics.status)} animate-ping opacity-75`} />
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 shadow-sm min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <Send size={16} className="text-green-500" />
          <div className="font-medium text-foreground">{currentMetrics.label}</div>
        </div>
        
        <div className="space-y-1 text-xs">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Activity size={12} />
              <span className="text-muted-foreground">Status:</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentMetrics.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : currentMetrics.status === 'error'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {currentMetrics.status.toUpperCase()}
            </span>
          </div>
          
          {/* Message Rate */}
          {currentMetrics.messageRate !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Zap size={12} />
                <span className="text-muted-foreground">Rate:</span>
              </div>
              <span className={`font-mono ${
                getActivityLevel() === 'high' ? 'text-red-500' :
                getActivityLevel() === 'medium' ? 'text-yellow-500' :
                getActivityLevel() === 'low' ? 'text-green-500' :
                'text-gray-500'
              }`}>
                {currentMetrics.messageRate.toFixed(1)} msg/s
              </span>
            </div>
          )}
          
          {/* Activity Level Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Activity:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-1 h-3 rounded-sm ${
                    level <= (getActivityLevel() === 'high' ? 5 : 
                             getActivityLevel() === 'medium' ? 3 : 
                             getActivityLevel() === 'low' ? 1 : 0)
                      ? 'bg-green-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
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

export default memo(EnhancedProducerNode);
