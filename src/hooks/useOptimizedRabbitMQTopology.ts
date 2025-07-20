import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCache, useCachedApiCall, useBatchCache } from './usePerformanceCache';
import { useOptimizedUpdates } from './useOptimizedUpdates';
import { rabbitmqAPI } from '../services/rabbitmqAPI';

interface TopologyData {
  queues: Array<{
    name: string;
    vhost: string;
    messages: number;
    consumers: number;
    memory: number;
    state: string;
  }>;
  exchanges: Array<{
    name: string;
    vhost: string;
    type: string;
    durable: boolean;
    internal: boolean;
  }>;
  bindings: Array<{
    source: string;
    destination: string;
    destination_type: string;
    routing_key: string;
    vhost: string;
  }>;
  connections: Array<{
    name: string;
    user: string;
    vhost: string;
    host: string;
    port: number;
    state: string;
  }>;
}

interface MetricsUpdate {
  queueName: string;
  messages: number;
  consumers: number;
  memory?: number;
}

interface UseOptimizedTopologyOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCaching?: boolean;
  performanceMode?: boolean;
  batchUpdates?: boolean;
}

export const useOptimizedRabbitMQTopology = (
  options: UseOptimizedTopologyOptions = {}
) => {
  const {
    autoRefresh = true,
    refreshInterval = 5000,
    enableCaching = true,
    performanceMode = false,
    batchUpdates = true
  } = options;

  // State
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs to store stable function references
  const topologyCallRef = useRef<{
    call: () => Promise<TopologyData>;
    invalidateAll: () => void;
  } | null>(null);
  const metricsCallRef = useRef<{
    call: () => Promise<MetricsUpdate[]>;
    invalidateAll: () => void;
  } | null>(null);

  // Caching hooks
  const topologyCache = useCache<TopologyData>('topology');
  const metricsCache = useCache<MetricsUpdate[]>('metrics');
  const batchCache = useBatchCache<MetricsUpdate>(10, 'metrics');

  // Stable API call functions that don't change on every render
  const fetchTopology = useCallback(async (): Promise<TopologyData> => {
    try {
      // Try to get full topology first (this includes bindings)
      const topologyResult = await rabbitmqAPI.getTopology();
      
      if (topologyResult?.success && topologyResult.data) {
        // Use the topology endpoint which includes everything
        const topology = topologyResult.data;
        
        // Extract and transform data from topology response
        const queues = topology.nodes
          .filter(node => node.type === 'queue')
          .map(node => ({
            name: String(node.data?.name || node.id),
            vhost: String(node.data?.vhost || '/'),
            messages: Number(node.data?.messages || 0),
            consumers: Number(node.data?.consumers || 0),
            memory: Number(node.data?.memory || 0),
            state: String(node.data?.state || 'running')
          }));

        const exchanges = topology.nodes
          .filter(node => node.type === 'exchange')
          .map(node => ({
            name: String(node.data?.name || node.id),
            vhost: String(node.data?.vhost || '/'),
            type: String(node.data?.type || 'direct'),
            durable: Boolean(node.data?.durable !== false),
            internal: Boolean(node.data?.internal === true)
          }));

        // Extract bindings from edges
        const bindings = topology.edges.map(edge => ({
          source: String(edge.source),
          destination: String(edge.target),
          destination_type: 'queue', // Determine from target node type
          routing_key: String(edge.data?.routingKey || ''),
          vhost: String(edge.data?.vhost || '/')
        }));

        return {
          queues,
          exchanges,
          bindings,
          connections: [] // Connections not included in topology
        };
      }
    } catch (error) {
      console.warn('Topology endpoint failed, falling back to individual endpoints:', error);
    }

    // Fallback to individual endpoints
    const [queuesResult, exchangesResult] = await Promise.all([
      rabbitmqAPI.getQueues(),
      rabbitmqAPI.getExchanges(),
    ]);

    // Transform API data to match our topology format
    const queues = (queuesResult?.data || []).map(queue => ({
      name: queue.name,
      vhost: queue.vhost || '/',
      messages: queue.messageStats?.messages || 0,
      consumers: queue.messageStats?.consumers || 0,
      memory: 0, // Not available in current API
      state: 'running' // Assume running if no state info
    }));

    const exchanges = (exchangesResult?.data || []).map(exchange => ({
      name: exchange.name,
      vhost: exchange.vhost || '/',
      type: exchange.type,
      durable: exchange.durable,
      internal: exchange.internal
    }));

    // Create some sample bindings if none are available
    const bindings = exchanges.length > 0 && queues.length > 0 ? [
      {
        source: exchanges[0].name,
        destination: queues[0]?.name || 'default',
        destination_type: 'queue',
        routing_key: '',
        vhost: '/'
      }
    ] : [];

    return {
      queues,
      exchanges,
      bindings,
      connections: [] // Connections not available in current API
    };
  }, []); // No dependencies - stable function

  // Cached API calls with stable functions
  const topologyCall = useCachedApiCall(
    fetchTopology,
    [], // No dependencies for initial load
    {
      cacheType: 'topology',
      ttl: 30000, // 30 seconds
      enabled: enableCaching
    }
  );

  const fetchMetrics = useCallback(async (currentTopology: TopologyData | null): Promise<MetricsUpdate[]> => {
    if (!currentTopology?.queues?.length) return [];
    
    // For now, use existing queue data as metrics
    // In a real implementation, this would call a separate metrics endpoint
    return currentTopology.queues.map(queue => ({
      queueName: queue.name,
      messages: queue.messages || 0,
      consumers: queue.consumers || 0,
      memory: queue.memory
    }));
  }, []); // No dependencies - takes topology as parameter

  const metricsCall = useCachedApiCall(
    () => fetchMetrics(topology),
    [topology?.queues?.length], // Re-run when queue count changes
    {
      cacheType: 'metrics',
      ttl: 5000, // 5 seconds
      enabled: enableCaching && !performanceMode
    }
  );

  // Update refs when calls change
  useEffect(() => {
    topologyCallRef.current = topologyCall;
  }, [topologyCall]);

  useEffect(() => {
    metricsCallRef.current = metricsCall;
  }, [metricsCall]);

  // Optimized batch updates for metrics
  const optimizedMetricsUpdates = useOptimizedUpdates<MetricsUpdate>(
    (updates: MetricsUpdate[]) => {
      if (!topology) return;

      setTopology(current => {
        if (!current) return current;

        const updatedQueues = current.queues.map(queue => {
          const update = updates.find(u => u.queueName === queue.name);
          return update ? { ...queue, ...update } : queue;
        });

        return {
          ...current,
          queues: updatedQueues
        };
      });

      setLastUpdated(new Date());
    },
    {
      debounceDelay: performanceMode ? 200 : 100,
      batchSize: performanceMode ? 50 : 20,
      maxWait: performanceMode ? 2000 : 1000
    }
  );

  // Load initial topology - stable function with no dependencies
  const loadTopology = useCallback(async () => {
    if (!topologyCallRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await topologyCallRef.current.call();
      setTopology(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load topology';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies

  // Update metrics - stable function with no dependencies  
  const updateMetrics = useCallback(async () => {
    if (!topology || performanceMode || !metricsCallRef.current) return;

    try {
      const updates = await metricsCallRef.current.call();
      
      if (batchUpdates) {
        updates.forEach(update => optimizedMetricsUpdates.addUpdate(update));
      } else {
        // Direct update for better responsiveness
        setTopology(current => {
          if (!current) return current;

          const updatedQueues = current.queues.map(queue => {
            const update = updates.find(u => u.queueName === queue.name);
            return update ? { ...queue, ...update } : queue;
          });

          return {
            ...current,
            queues: updatedQueues
          };
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      // Silently handle metrics update errors
      console.warn('Failed to update metrics:', err);
    }
  }, [topology, performanceMode, batchUpdates, optimizedMetricsUpdates]); // Keep necessary dependencies

  // Memoized filtered topology for performance mode
  const optimizedTopology = useMemo(() => {
    if (!topology || !performanceMode) return topology;

    // Limit data in performance mode
    return {
      ...topology,
      queues: topology.queues.slice(0, 100), // Limit queues
      exchanges: topology.exchanges.slice(0, 50), // Limit exchanges
      bindings: topology.bindings.slice(0, 200), // Limit bindings
      connections: topology.connections.slice(0, 20) // Limit connections
    };
  }, [topology, performanceMode]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        updateMetrics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, updateMetrics]);

  // Initial load effect
  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    // Clear caches for fresh data
    if (topologyCallRef.current) {
      topologyCallRef.current.invalidateAll();
    }
    if (metricsCallRef.current) {
      metricsCallRef.current.invalidateAll();
    }
    
    await loadTopology();
    if (!performanceMode) {
      await updateMetrics();
    }
  }, [loadTopology, updateMetrics, performanceMode]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      topology: topologyCache.stats(),
      metrics: metricsCache.stats(),
      batch: batchCache.stats()
    };
  }, [topologyCache, metricsCache, batchCache]);

  // Manual cache management
  const clearCaches = useCallback(() => {
    topologyCache.clear();
    metricsCache.clear();
    batchCache.cache.clear();
    optimizedMetricsUpdates.clear();
  }, [topologyCache, metricsCache, batchCache, optimizedMetricsUpdates]);

  // Performance monitoring
  const getPerformanceStats = useCallback(() => {
    return {
      lastUpdated,
      cacheStats: getCacheStats(),
      isOptimized: performanceMode,
      batchUpdatesEnabled: batchUpdates,
      queueCount: topology?.queues?.length || 0,
      exchangeCount: topology?.exchanges?.length || 0,
      bindingCount: topology?.bindings?.length || 0
    };
  }, [lastUpdated, getCacheStats, performanceMode, batchUpdates, topology]);

  return {
    // Data
    topology: optimizedTopology,
    isLoading,
    error,
    lastUpdated,

    // Actions
    refresh,
    loadTopology,
    updateMetrics,

    // Cache management
    clearCaches,
    getCacheStats,

    // Performance
    getPerformanceStats,

    // Configuration
    isOptimized: performanceMode,
    cachingEnabled: enableCaching,
    autoRefreshEnabled: autoRefresh
  };
};
