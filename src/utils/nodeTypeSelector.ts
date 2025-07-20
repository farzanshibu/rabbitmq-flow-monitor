// Utility for smart node type selection based on performance requirements
import { NodeTypes } from '@xyflow/react';
import ProducerNode from '@/components/nodes/ProducerNode';
import ExchangeNode from '@/components/nodes/ExchangeNode';
import QueueNode from '@/components/nodes/QueueNode';
import ConsumerNode from '@/components/nodes/ConsumerNode';
import EnhancedProducerNode from '@/components/nodes/EnhancedProducerNode';
import EnhancedExchangeNode from '@/components/nodes/EnhancedExchangeNode';
import EnhancedQueueNode from '@/components/nodes/EnhancedQueueNode';
import EnhancedConsumerNode from '@/components/nodes/EnhancedConsumerNode';
import { OptimizedProducerNode } from '@/components/nodes/OptimizedProducerNode';
import { OptimizedExchangeNode } from '@/components/nodes/OptimizedExchangeNode';
import { OptimizedQueueNode } from '@/components/nodes/OptimizedQueueNode';
import { OptimizedConsumerNode } from '@/components/nodes/OptimizedConsumerNode';

export type NodeTypeMode = 'basic' | 'enhanced' | 'optimized';

export const basicNodeTypes: NodeTypes = {
  producer: ProducerNode,
  'exchange-direct': ExchangeNode,
  'exchange-fanout': ExchangeNode,
  'exchange-topic': ExchangeNode,
  'exchange-headers': ExchangeNode,
  direct: ExchangeNode,
  fanout: ExchangeNode,
  topic: ExchangeNode,
  headers: ExchangeNode,
  queue: QueueNode,
  consumer: ConsumerNode,
};

export const enhancedNodeTypes: NodeTypes = {
  producer: EnhancedProducerNode,
  'exchange-direct': EnhancedExchangeNode,
  'exchange-fanout': EnhancedExchangeNode,
  'exchange-topic': EnhancedExchangeNode,
  'exchange-headers': EnhancedExchangeNode,
  direct: EnhancedExchangeNode,
  fanout: EnhancedExchangeNode,
  topic: EnhancedExchangeNode,
  headers: EnhancedExchangeNode,
  queue: EnhancedQueueNode,
  consumer: EnhancedConsumerNode,
};

export const optimizedNodeTypes: NodeTypes = {
  producer: OptimizedProducerNode,
  'exchange-direct': OptimizedExchangeNode,
  'exchange-fanout': OptimizedExchangeNode,
  'exchange-topic': OptimizedExchangeNode,
  'exchange-headers': OptimizedExchangeNode,
  direct: OptimizedExchangeNode,
  fanout: OptimizedExchangeNode,
  topic: OptimizedExchangeNode,
  headers: OptimizedExchangeNode,
  queue: OptimizedQueueNode,
  consumer: OptimizedConsumerNode,
};

export interface NodeTypeSelectionCriteria {
  nodeCount: number;
  performanceMode?: boolean;
  realTimeUpdates?: boolean;
  userPreference?: NodeTypeMode;
}

/**
 * Intelligently selects the appropriate node types based on context
 */
export const selectNodeTypes = (criteria: NodeTypeSelectionCriteria): { nodeTypes: NodeTypes; mode: NodeTypeMode } => {
  const { nodeCount, performanceMode, realTimeUpdates, userPreference } = criteria;

  // User preference takes precedence
  if (userPreference) {
    switch (userPreference) {
      case 'basic':
        return { nodeTypes: basicNodeTypes, mode: 'basic' };
      case 'enhanced':
        return { nodeTypes: enhancedNodeTypes, mode: 'enhanced' };
      case 'optimized':
        return { nodeTypes: optimizedNodeTypes, mode: 'optimized' };
    }
  }

  // Auto-selection based on performance requirements
  if (performanceMode || nodeCount > 100) {
    return { nodeTypes: optimizedNodeTypes, mode: 'optimized' };
  }

  // For real-time updates with moderate node counts, use enhanced
  if (realTimeUpdates && nodeCount <= 100) {
    return { nodeTypes: enhancedNodeTypes, mode: 'enhanced' };
  }

  // For very small topologies or minimal resource usage
  if (nodeCount < 10) {
    return { nodeTypes: basicNodeTypes, mode: 'basic' };
  }

  // Default to enhanced for most use cases
  return { nodeTypes: enhancedNodeTypes, mode: 'enhanced' };
};

/**
 * Performance thresholds for automatic mode switching
 */
export const PERFORMANCE_THRESHOLDS = {
  MINIMAL_NODES: 10,
  OPTIMAL_ENHANCED_NODES: 100,
  FORCE_OPTIMIZED_NODES: 200,
} as const;
