import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useState, 
  useEffect, 
  useRef 
} from 'react';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  MiniMap,
  Controls,
  Background,
  useViewport
} from '@xyflow/react';
import { useCache, usePerformanceMonitor } from '../hooks/usePerformanceCache';
import { useDragDebounce, useResizeDebounce, useOptimizedUpdates } from '../hooks/useOptimizedUpdates';

// Import optimized node components
import { OptimizedQueueNode } from './nodes/OptimizedQueueNode';
import { OptimizedExchangeNode } from './nodes/OptimizedExchangeNode';
import { OptimizedConsumerNode } from './nodes/OptimizedConsumerNode';
import { OptimizedProducerNode } from './nodes/OptimizedProducerNode';
import FloatingBezierEdge from './edges/FloatingBezierEdge';
import { TopologyData } from '@/services/rabbitmqAPI';

interface VirtualizedTopologyProps {
  data: TopologyData;
  className?: string;
  height?: number;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  performanceMode?: boolean;
}

// Node type mapping for optimized components
const optimizedNodeTypes: NodeTypes = {
  queue: OptimizedQueueNode,
  exchange: OptimizedExchangeNode,
  consumer: OptimizedConsumerNode,
  producer: OptimizedProducerNode,
};

const optimizedEdgeTypes: EdgeTypes = {
  floating: FloatingBezierEdge,
};

// Memoized topology calculation
const useTopologyNodes = (data: TopologyData, performanceMode: boolean) => {
  const cache = useCache<{ nodes: Node[]; edges: Edge[] }>('topology');
  
  return useMemo(() => {
    const cacheKey = `topology-${JSON.stringify(data)}-${performanceMode}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Use the nodes and edges directly from TopologyData
    let nodes = [...data.nodes];
    let edges = [...data.edges];
    
    // Apply performance optimizations if needed
    if (performanceMode) {
      // Limit number of edges in performance mode
      edges = edges.slice(0, 100);
      
      // Simplify node data in performance mode
      nodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          performanceMode,
          // Remove heavy data in performance mode
          messages: undefined,
          consumers: undefined,
          memory: undefined
        }
      }));
      
      // Simplify edge styles in performance mode
      edges = edges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          performanceMode
        },
        style: { stroke: '#64748b' }
      }));
    }

    const result = { nodes, edges };
    cache.set(cacheKey, result, 30000); // Cache for 30 seconds
    
    return result;
  }, [data, performanceMode, cache]);
};

// Virtualized viewport management
const useVirtualizedViewport = (nodes: Node[], performanceMode: boolean) => {
  const { getViewport } = useReactFlow();
  const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);
  const viewport = useViewport();

  const updateVisibleNodes = useCallback(() => {
    if (!performanceMode) {
      setVisibleNodes(nodes);
      return;
    }

    const { x, y, zoom } = getViewport();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate visible area with some buffer
    const buffer = 200;
    const visibleArea = {
      left: -x / zoom - buffer,
      top: -y / zoom - buffer,
      right: (-x + viewportWidth) / zoom + buffer,
      bottom: (-y + viewportHeight) / zoom + buffer,
    };

    // Filter nodes that are in the visible area
    const visible = nodes.filter(node => {
      const nodeRight = node.position.x + 200; // Approximate node width
      const nodeBottom = node.position.y + 100; // Approximate node height

      return (
        nodeRight >= visibleArea.left &&
        node.position.x <= visibleArea.right &&
        nodeBottom >= visibleArea.top &&
        node.position.y <= visibleArea.bottom
      );
    });

    setVisibleNodes(visible);
  }, [nodes, performanceMode, getViewport]);

  // Debounced viewport update
  const debouncedUpdate = useDragDebounce(updateVisibleNodes, 16);

  useEffect(() => {
    debouncedUpdate();
  }, [viewport, nodes, debouncedUpdate]);

  return performanceMode ? visibleNodes : nodes;
};

// Main virtualized topology component
const VirtualizedTopologyInner: React.FC<VirtualizedTopologyProps> = memo(({
  data,
  className = '',
  height = 600,
  onNodeClick,
  onEdgeClick,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  performanceMode = false
}) => {
  // Removed toast usage for now
  const performance = usePerformanceMonitor();
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate nodes and edges
  const { nodes: allNodes, edges } = useTopologyNodes(data, performanceMode);
  
  // Use virtualized viewport for performance mode
  const visibleNodes = useVirtualizedViewport(allNodes, performanceMode);
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(visibleNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes when visible nodes change
  useEffect(() => {
    setNodes(visibleNodes);
  }, [visibleNodes, setNodes]);

  // Update edges when data changes
  useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  // Optimized node drag handler
  const optimizedUpdates = useOptimizedUpdates(
    (updates: Array<{ id: string; position: { x: number; y: number } }>) => {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          const update = updates.find(u => u.id === node.id);
          return update ? { ...node, position: update.position } : node;
        })
      );
    },
    { debounceDelay: 16, batchSize: 10, maxWait: 100 }
  );

  // Handle node drag with optimization
  const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    optimizedUpdates.addUpdate({
      id: node.id,
      position: node.position
    });
  }, [optimizedUpdates]);

  // Optimized node click handler
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    performance.startRender();
    
    try {
      const nodeType = node.type || 'unknown';
      onNodeClick?.(node.id, nodeType);
    } finally {
      performance.endRender('node-click');
    }
  }, [onNodeClick, performance]);

  // Optimized edge click handler
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    onEdgeClick?.(edge.id);
  }, [onEdgeClick]);

  // Performance monitoring
  const renderStats = performance.getStats();
  
  // Resize handler for responsive layout
  const handleResize = useResizeDebounce(() => {
    // Trigger re-calculation of visible nodes
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  }, 250);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Dynamic container height class
  const containerClass = useMemo(() => {
    const heightClass = height === 600 ? 'h-[600px]' : 
                       height === 400 ? 'h-[400px]' : 
                       height === 800 ? 'h-[800px]' : 'h-[600px]';
    return `relative ${className} ${heightClass}`;
  }, [className, height]);

  return (
    <div className={containerClass}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDrag={handleNodeDrag}
        nodeTypes={optimizedNodeTypes}
        edgeTypes={optimizedEdgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        // Performance optimizations
        nodesDraggable={!performanceMode}
        nodesConnectable={false}
        elementsSelectable={!performanceMode}
        panOnDrag={!performanceMode}
        zoomOnDoubleClick={!performanceMode}
        selectNodesOnDrag={false}
        // Reduce re-renders in performance mode
        {...(performanceMode && {
          onlyRenderVisibleElements: true,
          nodeExtent: [[-2000, -2000], [2000, 2000]],
        })}
      >
        {showBackground && (
          <Background 
            color={performanceMode ? "#f1f5f9" : "#aaa"} 
            gap={performanceMode ? 50 : 16} 
          />
        )}
        
        {showControls && <Controls showInteractive={!performanceMode} />}
        
        {showMiniMap && !performanceMode && (
          <MiniMap 
            nodeStrokeColor="#64748b"
            nodeColor="#e2e8f0"
            nodeBorderRadius={2}
          />
        )}

        {/* Performance Panel - Removed for simplicity */}

        {/* Loading overlay */}
        {isLoading && (
          <Panel position="top-center" className="bg-white p-2 rounded shadow">
            <div className="text-sm">Optimizing layout...</div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
});

// Wrapper component with React Flow Provider
export const VirtualizedTopology: React.FC<VirtualizedTopologyProps> = (props) => {
  return (
    <ReactFlowProvider>
      <VirtualizedTopologyInner {...props} />
    </ReactFlowProvider>
  );
};

VirtualizedTopologyInner.displayName = 'VirtualizedTopologyInner';
VirtualizedTopology.displayName = 'VirtualizedTopology';
