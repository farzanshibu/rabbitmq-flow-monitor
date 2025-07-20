import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeRabbitMQService, RabbitMQMetrics, MessageFlow, TopologyUpdate, ConnectionEvent } from '@/services/realTimeRabbitMQService';
import { errorLogger } from '@/utils/errorLogger';

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now()}`;
};

export interface UseRealTimeDataReturn {
  metrics: Map<string, RabbitMQMetrics>;
  messageFlows: MessageFlow[];
  isConnected: boolean;
  connectionAttempts: number;
  connectionStatus: string;
  lastTopologyUpdate: number | null;
  clearMessageFlow: (flowId: string) => void;
  refreshTopology: () => Promise<void>;
  setTransportPreference: (transport: 'sse' | 'websocket' | 'auto') => void;
}

export const useRealTimeData = (): UseRealTimeDataReturn => {
  const [metrics, setMetrics] = useState<Map<string, RabbitMQMetrics>>(new Map());
  const [messageFlows, setMessageFlows] = useState<MessageFlow[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [lastTopologyUpdate, setLastTopologyUpdate] = useState<number | null>(null);
  
  // Use ref to track if service is initialized to prevent multiple connections
  const isInitialized = useRef(false);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const clearMessageFlow = useCallback((flowId: string) => {
    setMessageFlows(prev => prev.filter(flow => flow.id !== flowId));
  }, []);

  const refreshTopology = useCallback(async () => {
    try {
      await realTimeRabbitMQService.requestTopologyRefresh();
      errorLogger.info('useRealTimeData', 'Manual topology refresh requested');
    } catch (error) {
      errorLogger.error('useRealTimeData', 'Failed to refresh topology', {
        context: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }, []);

  const setTransportPreference = useCallback((transport: 'sse' | 'websocket' | 'auto') => {
    realTimeRabbitMQService.setTransportPreference(transport);
    errorLogger.info('useRealTimeData', `Transport preference changed to: ${transport}`);
  }, []);

  // Initialize real-time service
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    isInitialized.current = true;
    errorLogger.info('useRealTimeData', 'Initializing real-time data service');

    // Set up event handlers
    const handleMetrics = (newMetrics: RabbitMQMetrics) => {
      setMetrics(prev => {
        const updated = new Map(prev);
        updated.set(newMetrics.nodeId, newMetrics);
        return updated;
      });
    };

    const handleMessageFlow = (flow: MessageFlow) => {
      const uniqueFlow = {
        ...flow,
        id: flow.id || generateUniqueId()
      };
      
      setMessageFlows(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        if (existingIds.has(uniqueFlow.id)) {
          uniqueFlow.id = generateUniqueId();
        }
        return [...prev, uniqueFlow];
      });
    };

    const handleTopologyUpdate = (update: TopologyUpdate) => {
      setLastTopologyUpdate(update.timestamp);
      errorLogger.info('useRealTimeData', `Topology update received: ${update.type}`, {
        context: { updateType: update.type, timestamp: update.timestamp }
      });
    };

    const handleConnection = (event: ConnectionEvent) => {
      setConnectionStatus(realTimeRabbitMQService.connectionStatus);
      
      switch (event.type) {
        case 'connected':
          setIsConnected(true);
          setConnectionAttempts(0);
          errorLogger.info('useRealTimeData', 'Real-time connection established', {
            context: { message: event.message }
          });
          break;
          
        case 'disconnected':
          setIsConnected(false);
          errorLogger.warning('useRealTimeData', 'Real-time connection lost', {
            context: { message: event.message }
          });
          break;
          
        case 'reconnecting':
          setConnectionAttempts(prev => prev + 1);
          errorLogger.info('useRealTimeData', 'Attempting to reconnect', {
            context: { message: event.message }
          });
          break;
          
        case 'error':
          errorLogger.error('useRealTimeData', 'Real-time connection error', {
            context: { message: event.message }
          });
          break;
      }
    };

    // Register event handlers
    realTimeRabbitMQService.onMetrics(handleMetrics);
    realTimeRabbitMQService.onMessageFlow(handleMessageFlow);
    realTimeRabbitMQService.onTopologyUpdate(handleTopologyUpdate);
    realTimeRabbitMQService.onConnection(handleConnection);

    // Store cleanup functions
    cleanupFunctions.current = [
      () => realTimeRabbitMQService.destroy()
    ];

    // Initiate connection
    realTimeRabbitMQService.connect().catch(error => {
      errorLogger.error('useRealTimeData', 'Failed to establish initial connection', {
        context: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    });

    return () => {
      isInitialized.current = false;
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []);

  // Clean up old message flows periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setMessageFlows(prev => {
        // Keep flows for 5 seconds and limit total number to prevent memory issues
        const filtered = prev.filter(flow => now - flow.timestamp < 5000);
        // Also limit to maximum 50 flows at a time for better performance
        return filtered.slice(-50);
      });
    }, 2000); // Clean up every 2 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Periodic metrics cleanup
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setMetrics(prev => {
        const updated = new Map();
        for (const [nodeId, metric] of prev.entries()) {
          // Keep metrics for 30 seconds
          if (now - metric.timestamp < 30000) {
            updated.set(nodeId, metric);
          }
        }
        return updated;
      });
    }, 10000); // Clean up every 10 seconds

    return () => clearInterval(cleanup);
  }, []);

  return {
    metrics,
    messageFlows,
    isConnected,
    connectionAttempts,
    connectionStatus,
    lastTopologyUpdate,
    clearMessageFlow,
    refreshTopology,
    setTransportPreference
  };
};
