import React, { useCallback } from 'react';
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
} from '@xyflow/react';
import { initialNodes, initialEdges } from '@/data/mockTopology';
import ProducerNode from './nodes/ProducerNode';
import ExchangeNode from './nodes/ExchangeNode';
import QueueNode from './nodes/QueueNode';
import ConsumerNode from './nodes/ConsumerNode';
import '@/styles/reactflow.css';

// Define custom node types
const nodeTypes = {
  producer: ProducerNode,
  'exchange-direct': ExchangeNode,
  'exchange-fanout': ExchangeNode,
  'exchange-topic': ExchangeNode,
  'exchange-headers': ExchangeNode,
  queue: QueueNode,
  consumer: ConsumerNode,
};

// MiniMap node colors
const nodeClassName = (node: any) => {
  if (node.type === 'producer') return 'producer';
  if (node.type?.startsWith('exchange')) return 'exchange';
  if (node.type === 'queue') return 'queue';
  if (node.type === 'consumer') return 'consumer';
  return 'default';
};

const TopologyVisualization = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-screen bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
        <MiniMap 
          nodeClassName={nodeClassName}
          position="top-right"
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        <Panel position="bottom-right">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 text-sm text-muted-foreground max-w-xs">
            <div className="font-medium text-foreground mb-2">RabbitMQ Topology</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-producer"></div>
                <span>Producers ({nodes.filter(n => n.type === 'producer').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-exchange-direct"></div>
                <span>Exchanges ({nodes.filter(n => n.type?.startsWith('exchange')).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-queue"></div>
                <span>Queues ({nodes.filter(n => n.type === 'queue').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-consumer"></div>
                <span>Consumers ({nodes.filter(n => n.type === 'consumer').length})</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default TopologyVisualization;