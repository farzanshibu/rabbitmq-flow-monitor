import { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { rabbitmqAPI, TopologyData, RabbitMQOverview } from '@/services/rabbitmqAPI';

interface UseRabbitMQTopologyReturn {
  nodes: Node[];
  edges: Edge[];
  overview: RabbitMQOverview | null;
  isLoading: boolean;
  error: string | null;
  dataSource: 'rabbitmq' | 'none';
  lastUpdated: string | null;
  refreshTopology: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'testing';
}

export const useRabbitMQTopology = (): UseRabbitMQTopologyReturn => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [overview, setOverview] = useState<RabbitMQOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'rabbitmq' | 'none'>('none');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');

  const loadTopologyData = async () => {
    try {
      setError(null);
      
      // Test connection first
      setConnectionStatus('testing');
      const connectionTest = await rabbitmqAPI.testConnection();
      
      if (!connectionTest.success) {
        setConnectionStatus('disconnected');
        setDataSource('none');
        setError('RabbitMQ connection failed: ' + connectionTest.error);
        console.warn('⚠️ RabbitMQ API connection failed:', connectionTest.error);
        return;
      }

      setConnectionStatus('connected');
      console.log('✅ RabbitMQ API connection successful');

      // Load topology data
      const [topologyResult, overviewResult] = await Promise.all([
        rabbitmqAPI.getTopology(),
        rabbitmqAPI.getOverview()
      ]);

      if (topologyResult.success) {
        setNodes(topologyResult.data.nodes);
        setEdges(topologyResult.data.edges);
        setDataSource('rabbitmq');
        setLastUpdated(topologyResult.data.metadata.lastUpdated);
        
        console.log(`📊 Topology loaded from RabbitMQ:`, {
          nodes: topologyResult.data.nodes.length,
          edges: topologyResult.data.edges.length,
          queues: topologyResult.data.metadata.queues,
          exchanges: topologyResult.data.metadata.exchanges
        });
      } else {
        setError('Failed to load topology: ' + topologyResult.error);
      }

      if (overviewResult.success) {
        setOverview(overviewResult.data);
        console.log(`📈 Overview loaded from RabbitMQ:`, overviewResult.data);
      } else {
        setError('Failed to load overview: ' + overviewResult.error);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setConnectionStatus('disconnected');
      setDataSource('none');
      console.error('❌ Error loading RabbitMQ data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTopology = async () => {
    setIsLoading(true);
    await loadTopologyData();
  };

  useEffect(() => {
    loadTopologyData();
  }, []); // Initial load only

  // Separate effect for periodic refresh based on data source
  useEffect(() => {
    if (dataSource !== 'rabbitmq') return;

    const interval = setInterval(() => {
      loadTopologyData();
    }, 30000);

    return () => clearInterval(interval);
  }, [dataSource]);

  return {
    nodes,
    edges,
    overview,
    isLoading,
    error,
    dataSource,
    lastUpdated,
    refreshTopology,
    connectionStatus
  };
};
