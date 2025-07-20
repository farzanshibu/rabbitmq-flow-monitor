import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { enhancedRabbitMQAPI } from '@/services/enhancedRabbitMQAPI';
import { realTimeRabbitMQService } from '@/services/realTimeRabbitMQService';
import { errorLogger } from '@/utils/errorLogger';
import { TopologyData, RabbitMQOverview } from '@/services/rabbitmqAPI';

interface UseRealTimeTopologyReturn {
  nodes: Node[];
  edges: Edge[];
  overview: RabbitMQOverview | null;
  isLoading: boolean;
  error: string | null;
  dataSource: 'rabbitmq' | 'none';
  lastUpdated: string | null;
  refreshTopology: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'testing' | 'reconnecting';
  isRealTimeEnabled: boolean;
  enableRealTime: () => void;
  disableRealTime: () => void;
}

export const useRealTimeTopology = (): UseRealTimeTopologyReturn => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [overview, setOverview] = useState<RabbitMQOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'rabbitmq' | 'none'>('none');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing' | 'reconnecting'>('testing');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  
  // Track if real-time listeners are set up
  const realTimeListenersSetup = useRef(false);
  const lastTopologyRefresh = useRef(0);

  const loadTopologyData = useCallback(async (skipCache = false) => {
    try {
      setError(null);
      
      // Test connection first if not recently checked
      const now = Date.now();
      if (skipCache || now - lastTopologyRefresh.current > 10000) {
        setConnectionStatus('testing');
        const connectionTest = await enhancedRabbitMQAPI.testConnection();
        const testResult = connectionTest as { success?: boolean; error?: string };
        
        if (!testResult.success) {
          setConnectionStatus('disconnected');
          setDataSource('none');
          setError('RabbitMQ connection failed: ' + testResult.error);
          errorLogger.warning('useRealTimeTopology', 'RabbitMQ API connection failed', {
            context: { error: testResult.error }
          });
          return;
        }

        setConnectionStatus('connected');
        lastTopologyRefresh.current = now;
        errorLogger.info('useRealTimeTopology', 'RabbitMQ API connection successful');
      }

      // Load topology data
      const [topologyResult, overviewResult] = await Promise.all([
        enhancedRabbitMQAPI.getTopology(),
        enhancedRabbitMQAPI.getOverview()
      ]);

      const topology = topologyResult as { success?: boolean; data?: TopologyData; error?: string };
      const overviewData = overviewResult as { success?: boolean; data?: RabbitMQOverview; error?: string };

      if (topology.success && topology.data) {
        setNodes(topology.data.nodes);
        setEdges(topology.data.edges);
        setDataSource('rabbitmq');
        setLastUpdated(topology.data.metadata.lastUpdated);
        
        errorLogger.info('useRealTimeTopology', 'Topology loaded from RabbitMQ', {
          context: {
            nodes: topology.data.nodes.length,
            edges: topology.data.edges.length,
            queues: topology.data.metadata.queues,
            exchanges: topology.data.metadata.exchanges
          }
        });
      } else {
        setError('Failed to load topology: ' + topology.error);
        errorLogger.error('useRealTimeTopology', 'Failed to load topology', {
          context: { error: topology.error }
        });
      }

      if (overviewData.success && overviewData.data) {
        setOverview(overviewData.data);
        errorLogger.info('useRealTimeTopology', 'Overview loaded from RabbitMQ');
      } else {
        setError('Failed to load overview: ' + overviewData.error);
        errorLogger.error('useRealTimeTopology', 'Failed to load overview', {
          context: { error: overviewData.error }
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setConnectionStatus('disconnected');
      setDataSource('none');
      errorLogger.error('useRealTimeTopology', 'Error loading RabbitMQ data', {
        context: { error: errorMessage }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTopology = useCallback(async () => {
    setIsLoading(true);
    await loadTopologyData(true);
  }, [loadTopologyData]);

  const enableRealTime = useCallback(() => {
    setIsRealTimeEnabled(true);
    errorLogger.info('useRealTimeTopology', 'Real-time updates enabled');
  }, []);

  const disableRealTime = useCallback(() => {
    setIsRealTimeEnabled(false);
    errorLogger.info('useRealTimeTopology', 'Real-time updates disabled');
  }, []);

  // Initial load
  useEffect(() => {
    loadTopologyData();
  }, [loadTopologyData]);

  // Set up real-time listeners
  useEffect(() => {
    if (!isRealTimeEnabled || realTimeListenersSetup.current) {
      return;
    }

    realTimeListenersSetup.current = true;

    // Listen for topology updates from real-time service
    const handleTopologyUpdate = async (update: { type: string; data?: unknown; timestamp: number }) => {
      errorLogger.info('useRealTimeTopology', `Real-time topology update: ${update.type}`, {
        context: { updateType: update.type, timestamp: update.timestamp }
      });

      // For now, refresh the entire topology on any update
      // In the future, this could be optimized to handle specific updates
      if (update.type === 'full_refresh' || update.type.includes('_added') || update.type.includes('_removed')) {
        await loadTopologyData();
      }
    };

    // Listen for connection status changes
    const handleConnectionEvent = (event: { type: string; message?: string; timestamp: number }) => {
      switch (event.type) {
        case 'connected':
          setConnectionStatus('connected');
          // Refresh topology when connection is established
          loadTopologyData();
          break;
        case 'disconnected':
          setConnectionStatus('disconnected');
          break;
        case 'reconnecting':
          setConnectionStatus('reconnecting');
          break;
        case 'error':
          setConnectionStatus('disconnected');
          setError(event.message || 'Real-time connection error');
          break;
      }
    };

    realTimeRabbitMQService.onTopologyUpdate(handleTopologyUpdate);
    realTimeRabbitMQService.onConnection(handleConnectionEvent);

    return () => {
      realTimeListenersSetup.current = false;
    };
  }, [isRealTimeEnabled, loadTopologyData]);

  // Periodic fallback refresh when real-time is disabled
  useEffect(() => {
    if (isRealTimeEnabled || dataSource !== 'rabbitmq') return;

    const interval = setInterval(() => {
      loadTopologyData();
    }, 30000); // Fallback to 30-second polling

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, dataSource, loadTopologyData]);

  return {
    nodes,
    edges,
    overview,
    isLoading,
    error,
    dataSource,
    lastUpdated,
    refreshTopology,
    connectionStatus,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime
  };
};
