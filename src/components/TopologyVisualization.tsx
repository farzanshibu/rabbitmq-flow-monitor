import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Panel,
  ConnectionLineType,
  MarkerType,
  useReactFlow,
  Node,
  NodeChange,
} from '@xyflow/react';
import { useRealTimeTopology } from '@/hooks/useRealTimeTopology';
import { rabbitmqAPI } from '@/services/rabbitmqAPI';
import FloatingBezierEdge from './edges/FloatingBezierEdge';
import ProducerNode from './nodes/ProducerNode';
import ExchangeNode from './nodes/ExchangeNode';
import QueueNode from './nodes/QueueNode';
import ConsumerNode from './nodes/ConsumerNode';
import EnhancedProducerNode from './nodes/EnhancedProducerNode';
import EnhancedExchangeNode from './nodes/EnhancedExchangeNode';
import EnhancedQueueNode from './nodes/EnhancedQueueNode';
import EnhancedConsumerNode from './nodes/EnhancedConsumerNode';
import MessageFlowAnimation from './MessageFlowAnimation';
import { ConnectionStatus } from './ConnectionStatus';
import QueueDetailsDrawer from './QueueDetailsDrawer';
import NodeDetailsDrawer from './NodeDetailsDrawer';
import { RabbitMQMetrics, MessageFlow } from '@/services/rabbitmqWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Cloud, AlertTriangle, CheckCircle, LayoutGrid, GitBranch, Zap, Grid3X3, Layers3, Minimize2, Maximize2 } from 'lucide-react';
import { arrangeNodesWithSpacing, LAYOUT_PRESETS, calculateViewportBounds } from '@/utils/layoutUtils';
import '@/styles/reactflow.css';

interface TopologyVisualizationProps {
  metrics: Map<string, RabbitMQMetrics>;
  messageFlows: MessageFlow[];
  isConnected: boolean;
  connectionAttempts: number;
  clearMessageFlow: (flowId: string) => void;
}

// Define custom node types - use enhanced versions for real-time features
const nodeTypes = {
  producer: EnhancedProducerNode,
  'exchange-direct': EnhancedExchangeNode,
  'exchange-fanout': EnhancedExchangeNode,
  'exchange-topic': EnhancedExchangeNode,
  'exchange-headers': EnhancedExchangeNode,
  // Handle real RabbitMQ exchange types
  direct: EnhancedExchangeNode,
  fanout: EnhancedExchangeNode,
  topic: EnhancedExchangeNode,
  headers: EnhancedExchangeNode,
  queue: EnhancedQueueNode,
  consumer: EnhancedConsumerNode,
  // Fallback to basic nodes if needed
  'producer-basic': ProducerNode,
  'exchange-basic': ExchangeNode,
  'queue-basic': QueueNode,
  'consumer-basic': ConsumerNode,
};

// Define custom edge types with floating Bezier edges
const edgeTypes = {
  'floating-bezier': FloatingBezierEdge,
};

// MiniMap node colors
const nodeClassName = (node: { type?: string }) => {
  if (node.type === 'producer') return 'producer';
  if (node.type?.startsWith('exchange')) return 'exchange';
  if (node.type === 'queue') return 'queue';
  if (node.type === 'consumer') return 'consumer';
  return 'default';
};

const TopologyVisualization: React.FC<TopologyVisualizationProps> = ({
  metrics,
  messageFlows,
  isConnected,
  connectionAttempts,
  clearMessageFlow
}) => {
  // Get real RabbitMQ topology data using real-time hook
  const { 
    nodes: rabbitMQNodes, 
    edges: rabbitMQEdges, 
    overview,
    isLoading, 
    error, 
    dataSource, 
    lastUpdated,
    refreshTopology,
    connectionStatus 
  } = useRealTimeTopology();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Store to preserve node positions
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // State for node details drawer (universal for all node types)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isNodeDrawerOpen, setIsNodeDrawerOpen] = useState(false);
  
  // State for queue details drawer (legacy, specific for queues)
  const [selectedQueueName, setSelectedQueueName] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Layout management state
  const [currentLayout, setCurrentLayout] = useState<string>('default');
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);
  
  // Create a ref for fitView functionality
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactFlowInstance = useRef<any>(null);

  // Update nodes and edges when RabbitMQ data changes, preserving positions
  useEffect(() => {
    if (rabbitMQNodes.length > 0) {
      const updatedNodes = rabbitMQNodes.map((node: Node) => {
        const savedPosition = nodePositionsRef.current.get(node.id);
        if (savedPosition) {
          return {
            ...node,
            position: savedPosition,
          };
        }
        return node;
      });
      
      // Apply automatic layout if no saved positions exist
      const hasAnySavedPositions = updatedNodes.some(node => 
        nodePositionsRef.current.has(node.id)
      );
      
      if (!hasAnySavedPositions && updatedNodes.length > 0) {
        // Apply default layout with proper spacing
        const layoutedNodes = arrangeNodesWithSpacing(updatedNodes);
        // Save the new positions
        layoutedNodes.forEach(node => {
          nodePositionsRef.current.set(node.id, node.position);
        });
        setNodes(layoutedNodes);
      } else {
        setNodes(updatedNodes);
      }
    }
    if (rabbitMQEdges.length > 0) {
      // Update edges to use floating Bezier type
      const floatingEdges = rabbitMQEdges.map(edge => ({
        ...edge,
        type: 'floating-bezier',
      }));
      setEdges(floatingEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rabbitMQNodes, rabbitMQEdges]);

  // Save node positions when they change
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && 'position' in change && change.position) {
        nodePositionsRef.current.set(change.id, change.position);
      }
    });
    onNodesChange(changes);
  }, [onNodesChange]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node click to open drawer for all node types
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Open the new universal node details drawer for all node types
    setSelectedNode(node);
    setIsNodeDrawerOpen(true);
    
    // For queue nodes, also open the legacy queue-specific drawer if needed
    if (node.type === 'queue') {
      setSelectedQueueName(node.id);
      setIsDrawerOpen(true);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.3 });
    }
  }, []);

  const handleResetPositions = useCallback(() => {
    // Clear saved positions and refresh topology
    nodePositionsRef.current.clear();
    refreshTopology();
  }, [refreshTopology]);

  // Apply a specific layout
  const applyLayout = useCallback((layoutKey: string) => {
    if (!nodes.length || isApplyingLayout) return;
    
    setIsApplyingLayout(true);
    setCurrentLayout(layoutKey);
    
    try {
      const layoutPreset = LAYOUT_PRESETS[layoutKey as keyof typeof LAYOUT_PRESETS];
      if (layoutPreset) {
        const layoutedNodes = layoutPreset.layoutFn(nodes);
        
        // Save the new positions
        layoutedNodes.forEach(node => {
          nodePositionsRef.current.set(node.id, node.position);
        });
        
        setNodes(layoutedNodes);
        
        // Auto-fit view to new layout after a brief delay
        setTimeout(() => {
          if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView({ 
              padding: 0.2,
              duration: 800 
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error applying layout:', error);
    } finally {
      setIsApplyingLayout(false);
    }
  }, [nodes, isApplyingLayout, setNodes]);

  // Auto-arrange nodes with optimal spacing
  const autoArrangeNodes = useCallback(() => {
    if (!nodes.length || isApplyingLayout) return;
    
    setIsApplyingLayout(true);
    
    try {
      const arrangedNodes = arrangeNodesWithSpacing(nodes, {
        horizontalSpacing: 120,
        verticalSpacing: 100,
      });
      
      // Save the new positions
      arrangedNodes.forEach(node => {
        nodePositionsRef.current.set(node.id, node.position);
      });
      
      setNodes(arrangedNodes);
      
      // Auto-fit view
      setTimeout(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.fitView({ 
            padding: 0.2,
            duration: 800 
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error auto-arranging nodes:', error);
    } finally {
      setIsApplyingLayout(false);
    }
  }, [nodes, isApplyingLayout, setNodes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance;
  }, []);

  // Enhanced nodes with real-time metrics
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => {
      const realTimeMetrics = metrics.get(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          realTimeMetrics
        }
      };
    });
  }, [nodes, metrics]);

  return (
    <div className="w-full h-screen bg-background relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50  flex items-center justify-center">
          <Card className="p-6">
            <CardContent className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Loading RabbitMQ topology...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compact Data Source Status */}
      <div className="absolute top-48 right-4 z-40">
        <Card className="bg-card/95 backdrop-blur-sm border-border/60 shadow-lg w-40">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1">
              {dataSource === 'rabbitmq' ? (
                <>
                  <Database className="w-3 h-3 text-green-600" />
                  Live
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  No Data
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-1">
                {connectionStatus === 'connected' ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : connectionStatus === 'testing' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                )}
                <span className="text-xs">{connectionStatus.slice(0, 4)}</span>
              </div>
            </div>
            
            {overview && (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Q:</span>
                  <span className="font-mono">{overview.totalQueues}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E:</span>
                  <span className="font-mono">{overview.totalExchanges}</span>
                </div>
              </div>
            )}
            
            {dataSource === 'rabbitmq' && (
              <button
                onClick={refreshTopology}
                className="w-full text-xs h-6 px-2 border border-border rounded bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
                disabled={isLoading}
                title="Refresh Topology"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            
            {error && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-1 rounded">
                <div className="font-medium">Error</div>
                <div className="truncate" title={error}>{error.slice(0, 20)}...</div>
              </div>
            )}
            
            {connectionStatus === 'disconnected' && (
              <button
                onClick={async () => {
                  try {
                    const result = await rabbitmqAPI.retryConnection();
                    if (result.success) {
                      await refreshTopology();
                    }
                  } catch (err) {
                    console.error('Retry failed:', err);
                  }
                }}
                className="w-full text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-1"
                disabled={isLoading}
                title="Retry Connection"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
            
            {lastUpdated && (
              <div className="text-xs text-muted-foreground border-t pt-1">
                {new Date(lastUpdated).toLocaleTimeString().slice(0, 5)}
              </div>
            )}
          </CardContent>
        </Card>
      </div> 

      {/* Message Flow Animations */}
      {messageFlows.map((flow) => (
        <MessageFlowAnimation
          key={flow.id}
          flow={flow}
          onComplete={() => clearMessageFlow(flow.id)}
        />
      ))}

      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={false}
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        minZoom={0.05}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{
          type: 'floating-bezier',
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: '#64748b',
          },
          // Markers are now handled by the custom FloatingBezierEdge component
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background 
          gap={20} 
          size={1}
          color="hsl(var(--border))"
        />
        <Controls 
          position="top-left"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        
        {/* Compact Layout Controls */}
        <Panel position="bottom-left" className="space-y-1">
          <Card className="bg-card/95 backdrop-blur-sm border-border/60 shadow-lg w-48">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-1">
                <LayoutGrid className="w-3 h-3 text-primary" />
                Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              {/* Compact Quick Actions */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={handleFitView}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1"
                  title="Fit to View"
                >
                  <Zap className="w-3 h-3" />
                  Fit
                </button>
                <button
                  onClick={autoArrangeNodes}
                  disabled={isApplyingLayout || nodes.length === 0}
                  className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 flex items-center gap-1 disabled:opacity-50"
                  title="Auto Arrange"
                >
                  <Grid3X3 className={`w-3 h-3 ${isApplyingLayout ? 'animate-spin' : ''}`} />
                  Auto
                </button>
              </div>
              
              {/* Compact Layout Presets */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Presets:</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyLayout(key)}
                      disabled={isApplyingLayout || nodes.length === 0}
                      className={`text-xs px-1 py-1 rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 flex items-center justify-center gap-1 ${
                        currentLayout === key ? 'bg-accent text-accent-foreground' : ''
                      }`}
                      title={preset.name}
                    >
                      {key === 'grid' && <Grid3X3 className="w-3 h-3" />}
                      {key === 'layers' && <Layers3 className="w-3 h-3" />}
                      {key === 'compact' && <Minimize2 className="w-3 h-3" />}
                      {key === 'spacious' && <Maximize2 className="w-3 h-3" />}
                      {key === 'default' && <LayoutGrid className="w-3 h-3" />}
                      <span className="truncate">{key === 'default' ? 'Def' : key.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Compact Reset Action */}
              <button
                onClick={handleResetPositions}
                className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 flex items-center gap-1 w-full disabled:opacity-50"
                disabled={isLoading}
                title="Reset All Positions"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Reset
              </button>
              
              <div className="text-xs text-muted-foreground text-center">
                {isApplyingLayout ? 'Applying...' : 'Positions auto-saved'}
              </div>
            </CardContent>
          </Card>
        </Panel>
        
        <MiniMap 
          nodeClassName={nodeClassName}
          position="top-right"
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        <Panel position="bottom-right">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-muted-foreground w-36">
            <div className="font-medium text-foreground mb-2 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              Topology
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded bg-producer"></div>
                <span>Prod ({enhancedNodes.filter(n => n.type === 'producer').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded bg-exchange-direct"></div>
                <span>Exch ({enhancedNodes.filter(n => n.type?.includes('exchange') || ['direct', 'fanout', 'topic', 'headers'].includes(n.type)).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded bg-queue"></div>
                <span>Queue ({enhancedNodes.filter(n => n.type === 'queue').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded bg-consumer"></div>
                <span>Cons ({enhancedNodes.filter(n => n.type === 'consumer').length})</span>
              </div>
              {isConnected && (
                <div className="pt-1 border-t border-border text-xs">
                  <div className="text-green-600 dark:text-green-400">
                    Real-time
                  </div>
                  <div className="text-muted-foreground">
                    Flows: {messageFlows.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Universal Node Details Drawer */}
      <NodeDetailsDrawer
        isOpen={isNodeDrawerOpen}
        onClose={() => setIsNodeDrawerOpen(false)}
        selectedNode={selectedNode}
        onOpenQueueDetails={(queueName) => {
          setSelectedQueueName(queueName);
          setIsDrawerOpen(true);
        }}
      />
      
      {/* Queue Details Drawer (Legacy - for detailed queue management) */}
      <QueueDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        queueName={selectedQueueName}
      />
    </div>
  );
};

export default TopologyVisualization;