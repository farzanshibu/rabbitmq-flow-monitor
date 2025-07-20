import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Download, CheckCircle, XCircle, Settings, Timer } from 'lucide-react';
import { RabbitMQMetrics } from '@/services/rabbitmqWebSocket';

interface ConsumerData {
  label: string;
  status: 'active' | 'idle' | 'warning' | 'error';
  messageRate?: number;
  prefetchCount: number;
  autoAck: boolean;
}

interface EnhancedConsumerNodeProps extends NodeProps {
  realTimeMetrics?: RabbitMQMetrics;
}

const EnhancedConsumerNode = ({ data, realTimeMetrics }: EnhancedConsumerNodeProps) => {
  const nodeData = data as unknown as ConsumerData;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPerformanceLevel = () => {
    if (!currentMetrics.messageRate) return 'idle';
    if (currentMetrics.messageRate > 25) return 'excellent';
    if (currentMetrics.messageRate > 15) return 'good';
    if (currentMetrics.messageRate > 5) return 'fair';
    return 'slow';
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
          <Download size={16} className="text-indigo-500" />
          <div className="font-medium text-foreground">{currentMetrics.label}</div>
        </div>
        
        <div className="space-y-1 text-xs">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              {currentMetrics.status === 'active' ? (
                <CheckCircle size={12} className="text-green-500" />
              ) : currentMetrics.status === 'error' ? (
                <XCircle size={12} className="text-red-500" />
              ) : (
                <Timer size={12} className="text-gray-500" />
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${
                currentMetrics.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : currentMetrics.status === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : currentMetrics.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {currentMetrics.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Processing Rate */}
          {currentMetrics.messageRate !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Processing:</span>
              <span className={`font-mono ${
                getPerformanceLevel() === 'excellent' ? 'text-green-600' :
                getPerformanceLevel() === 'good' ? 'text-green-500' :
                getPerformanceLevel() === 'fair' ? 'text-yellow-500' :
                getPerformanceLevel() === 'slow' ? 'text-red-500' :
                'text-gray-500'
              }`}>
                {currentMetrics.messageRate.toFixed(1)} msg/s
              </span>
            </div>
          )}
          
          {/* Prefetch Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Settings size={12} />
              <span className="text-muted-foreground">Prefetch:</span>
            </div>
            <span className="font-mono text-blue-600">{currentMetrics.prefetchCount}</span>
          </div>
          
          {/* Auto-ACK */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Auto-ACK:</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentMetrics.autoAck 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            }`}>
              {currentMetrics.autoAck ? 'ON' : 'OFF'}
            </span>
          </div>
          
          {/* Performance Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-muted-foreground">Performance:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-1.5 h-2 rounded-sm ${
                    level <= (getPerformanceLevel() === 'excellent' ? 4 : 
                             getPerformanceLevel() === 'good' ? 3 : 
                             getPerformanceLevel() === 'fair' ? 2 : 
                             getPerformanceLevel() === 'slow' ? 1 : 0)
                      ? (level <= 2 ? 'bg-green-500' : level === 3 ? 'bg-yellow-500' : 'bg-red-500')
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedConsumerNode);
