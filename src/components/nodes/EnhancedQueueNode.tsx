import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Inbox, TrendingUp, Users, Clock, AlertCircle, CheckCircle, MessageCircle, Skull } from 'lucide-react';
import { RabbitMQMetrics } from '@/services/rabbitmqWebSocket';

interface QueueData {
  label: string;
  status: 'active' | 'idle' | 'warning' | 'error';
  messageCount: number;
  consumerCount: number;
  messageRate?: number;
  durable: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  isDeadLetterQueue?: boolean;
  dlqMessageCount?: number;
}

interface EnhancedQueueNodeProps extends NodeProps {
  realTimeMetrics?: RabbitMQMetrics;
}

const EnhancedQueueNode = ({ data, realTimeMetrics }: EnhancedQueueNodeProps) => {
  const nodeData = data as unknown as QueueData;
  const [animationClass, setAnimationClass] = useState('');
  const [currentMetrics, setCurrentMetrics] = useState(nodeData);
  const [messageHistory, setMessageHistory] = useState<number[]>([]);

  // Update metrics when real-time data is available
  useEffect(() => {
    if (realTimeMetrics) {
      const newMessageCount = realTimeMetrics.messageCount ?? nodeData.messageCount;
      
      setCurrentMetrics(prev => ({
        ...prev,
        messageRate: realTimeMetrics.messageRate,
        messageCount: newMessageCount,
        consumerCount: realTimeMetrics.consumerCount ?? prev.consumerCount,
        status: realTimeMetrics.status
      }));

      // Track message count history for trend display
      setMessageHistory(prev => {
        const newHistory = [...prev, newMessageCount].slice(-10); // Keep last 10 readings
        return newHistory;
      });

      // Trigger animation when metrics update
      setAnimationClass('metrics-update');
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [realTimeMetrics, nodeData.messageCount]);

  // Update queue depth indicator width
  useEffect(() => {
    const queueDepthElement = document.querySelector(`[data-node-id="${nodeData.label}"] .queue-depth-fill`);
    if (queueDepthElement) {
      const width = Math.min((currentMetrics.messageCount || 0) / 1000 * 100, 100);
      (queueDepthElement as HTMLElement).style.width = `${width}%`;
    }
  }, [currentMetrics.messageCount, nodeData.label]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={12} className="text-green-500" />;
      case 'warning': return <AlertCircle size={12} className="text-yellow-500" />;
      case 'error': return <AlertCircle size={12} className="text-red-500" />;
      default: return <MessageCircle size={12} className="text-gray-500" />;
    }
  };

  const getMetricsTrend = () => {
    if (!currentMetrics.messageRate) return null;
    
    if (currentMetrics.messageRate > 20) return 'text-red-500';
    if (currentMetrics.messageRate > 10) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getQueueDepthStatus = () => {
    const count = currentMetrics.messageCount || 0;
    if (count > 1000) return 'critical';
    if (count > 500) return 'high';
    if (count > 100) return 'medium';
    return 'low';
  };

  const getQueueDepthColor = () => {
    const status = getQueueDepthStatus();
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-950';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      default: return 'text-green-600 bg-green-50 dark:bg-green-950';
    }
  };

  // Calculate throughput trend
  const getThroughputTrend = () => {
    if (messageHistory.length < 2) return 'stable';
    const recent = messageHistory.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const latest = recent[recent.length - 1];
    
    if (latest > avg * 1.2) return 'increasing';
    if (latest < avg * 0.8) return 'decreasing';
    return 'stable';
  };

  return (
    <div className={`relative transition-all duration-300 ${animationClass}`} data-node-id={currentMetrics.label}>
      {/* Status indicator with enhanced visual feedback */}
      <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${getStatusColor(currentMetrics.status)} shadow-lg z-10 flex items-center justify-center`}>
        {currentMetrics.status === 'active' && (
          <div className={`absolute inset-0 w-4 h-4 rounded-full ${getStatusColor(currentMetrics.status)} animate-ping opacity-75`} />
        )}
        <div className="relative z-10 text-white">
          {getStatusIcon(currentMetrics.status)}
        </div>
      </div>

      {/* Pending messages indicator */}
      {(currentMetrics.messageCount || 0) > 0 && (
        <div className="absolute -top-1 -left-1 z-10">
          <div className={`px-2 py-1 rounded-full text-xs font-bold ${getQueueDepthColor()} border-2 border-white shadow-lg`}>
            {(currentMetrics.messageCount || 0).toLocaleString()}
          </div>
        </div>
      )}

      {/* Dead Letter Queue indicator */}
      {(currentMetrics.isDeadLetterQueue || currentMetrics.deadLetterExchange) && (
        <div className="absolute -bottom-1 -right-1 z-10">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border-2 border-white shadow-lg ${
            currentMetrics.isDeadLetterQueue 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
          }`}>
            <Skull size={10} />
            {currentMetrics.isDeadLetterQueue ? 'DLQ' : 'DLX'}
          </div>
        </div>
      )}

      {/* DLQ failed message count */}
      {currentMetrics.isDeadLetterQueue && currentMetrics.dlqMessageCount && currentMetrics.dlqMessageCount > 0 && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white border-2 border-white shadow-lg animate-pulse">
            {currentMetrics.dlqMessageCount} failed
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="custom-handle target"
      />
      
      <div className="bg-card border border-border rounded-lg p-3 shadow-sm min-w-[220px]">
        <div className="flex items-center gap-2 mb-3">
          <Inbox size={16} className="text-blue-500" />
          <div className="font-medium text-foreground">{currentMetrics.label}</div>
          <div className={`ml-auto px-2 py-0.5 rounded text-xs ${
            currentMetrics.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            currentMetrics.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            currentMetrics.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}>
            {currentMetrics.status}
          </div>
        </div>
        
        <div className="space-y-2 text-xs">
          {/* Pending Messages with Visual Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <MessageCircle size={12} />
              Pending:
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${
                (currentMetrics.messageCount || 0) > 100 ? 'text-orange-600' :
                (currentMetrics.messageCount || 0) > 0 ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {(currentMetrics.messageCount || 0).toLocaleString()}
              </span>
              {/* Visual queue depth indicator */}
              <div className={`queue-depth-bar ${
                getQueueDepthStatus() === 'critical' ? 'bg-red-200 dark:bg-red-800' :
                getQueueDepthStatus() === 'high' ? 'bg-orange-200 dark:bg-orange-800' :
                getQueueDepthStatus() === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800' :
                'bg-green-200 dark:bg-green-800'
              }`}>
                <div 
                  className={`queue-depth-fill ${getQueueDepthStatus()}`}
                  data-width={Math.min((currentMetrics.messageCount || 0) / 1000 * 100, 100)}
                />
              </div>
            </div>
          </div>
          
          {/* Consumer Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span className="text-muted-foreground">Consumers:</span>
            </div>
            <span className={`font-mono ${
              (currentMetrics.consumerCount || 0) === 0 ? 'text-red-500 font-bold' : 'text-foreground'
            }`}>
              {currentMetrics.consumerCount || 0}
            </span>
          </div>
          
          {/* Message Rate */}
          {(currentMetrics.messageRate !== undefined && currentMetrics.messageRate !== null) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} />
                <span className="text-muted-foreground">Rate:</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-mono ${getMetricsTrend()}`}>
                  {(currentMetrics.messageRate || 0).toFixed(1)} msg/s
                </span>
                {/* Trend indicator */}
                <div className={`w-2 h-2 rounded-full ${
                  getThroughputTrend() === 'increasing' ? 'bg-green-500' :
                  getThroughputTrend() === 'decreasing' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
              </div>
            </div>
          )}
          
          {/* Queue Properties */}
          <div className="flex items-center justify-between border-t border-border/50 pt-2">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span className="text-muted-foreground">Type:</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentMetrics.durable 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {currentMetrics.durable ? 'Durable' : 'Transient'}
            </span>
          </div>

          <div className="pt-1">
            <div className="text-xs text-muted-foreground mb-1">Queue Health:</div>
            <div className="flex items-center gap-1">
              <div className={`queue-health-bar ${
                getQueueDepthStatus() === 'critical' ? 'bg-red-200 dark:bg-red-800' :
                getQueueDepthStatus() === 'high' ? 'bg-orange-200 dark:bg-orange-800' :
                getQueueDepthStatus() === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800' :
                'bg-green-200 dark:bg-green-800'
              }`}>
                <div className={`queue-health-fill ${
                  getQueueDepthStatus() === 'critical' ? 'bg-red-500' :
                  getQueueDepthStatus() === 'high' ? 'bg-orange-500' :
                  getQueueDepthStatus() === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
              </div>
              <span className={`text-xs font-medium ${
                getQueueDepthStatus() === 'critical' ? 'text-red-600' :
                getQueueDepthStatus() === 'high' ? 'text-orange-600' :
                getQueueDepthStatus() === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {getQueueDepthStatus()}
              </span>
            </div>
          </div>

          {/* Dead Letter Queue Information */}
          {(currentMetrics.deadLetterExchange || currentMetrics.isDeadLetterQueue) && (
            <div className="border-t border-border/50 pt-2 space-y-1">
              {currentMetrics.isDeadLetterQueue ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Skull size={12} className="text-red-500" />
                    <span className="text-muted-foreground">Dead Letter Queue</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Failed Messages
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Skull size={12} className="text-orange-500" />
                      <span className="text-muted-foreground">DL Exchange:</span>
                    </div>
                    <span className="text-xs font-mono text-orange-700 dark:text-orange-300">
                      {currentMetrics.deadLetterExchange}
                    </span>
                  </div>
                  {currentMetrics.deadLetterRoutingKey && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">DL Key:</span>
                      <span className="text-xs font-mono text-orange-700 dark:text-orange-300">
                        {currentMetrics.deadLetterRoutingKey}
                      </span>
                    </div>
                  )}
                </>
              )}
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

export default memo(EnhancedQueueNode);
