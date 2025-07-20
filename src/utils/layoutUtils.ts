import { Node } from '@xyflow/react';

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  containerPadding?: number;
}

interface GridLayoutOptions extends LayoutOptions {
  columns?: number;
}

interface LayeredLayoutOptions extends LayoutOptions {
  layerSpacing?: number;
}

// Default spacing values
const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 80;
const DEFAULT_HORIZONTAL_SPACING = 100;
const DEFAULT_VERTICAL_SPACING = 80;
const DEFAULT_CONTAINER_PADDING = 50;
const DEFAULT_LAYER_SPACING = 300;

// Node type hierarchy for layered layout
const NODE_TYPE_LAYERS = {
  producer: 0,
  'exchange-direct': 1,
  'exchange-fanout': 1,
  'exchange-topic': 1,
  'exchange-headers': 1,
  direct: 1,
  fanout: 1,
  topic: 1,
  headers: 1,
  queue: 2,
  consumer: 3,
};

/**
 * Arranges nodes in a simple grid layout
 */
export function arrangeNodesInGrid(
  nodes: Node[],
  options: GridLayoutOptions = {}
): Node[] {
  const {
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    horizontalSpacing = DEFAULT_HORIZONTAL_SPACING,
    verticalSpacing = DEFAULT_VERTICAL_SPACING,
    containerPadding = DEFAULT_CONTAINER_PADDING,
    columns = Math.ceil(Math.sqrt(nodes.length))
  } = options;

  const cellWidth = nodeWidth + horizontalSpacing;
  const cellHeight = nodeHeight + verticalSpacing;

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: containerPadding + col * cellWidth,
        y: containerPadding + row * cellHeight,
      },
    };
  });
}

/**
 * Arranges nodes in a layered layout based on RabbitMQ message flow
 * Producers -> Exchanges -> Queues -> Consumers
 */
export function arrangeNodesInLayers(
  nodes: Node[],
  options: LayeredLayoutOptions = {}
): Node[] {
  const {
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    horizontalSpacing = DEFAULT_HORIZONTAL_SPACING,
    verticalSpacing = DEFAULT_VERTICAL_SPACING,
    containerPadding = DEFAULT_CONTAINER_PADDING,
    layerSpacing = DEFAULT_LAYER_SPACING,
  } = options;

  // Group nodes by their layer (type)
  const nodesByLayer = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const layer = getNodeLayer(node.type || '');
    if (!nodesByLayer.has(layer)) {
      nodesByLayer.set(layer, []);
    }
    nodesByLayer.get(layer)!.push(node);
  });

  const positionedNodes: Node[] = [];

  // Position nodes layer by layer
  Array.from(nodesByLayer.keys()).sort().forEach((layer) => {
    const layerNodes = nodesByLayer.get(layer)!;
    const layerWidth = layerNodes.length * (nodeWidth + horizontalSpacing) - horizontalSpacing;
    const startX = containerPadding - layerWidth / 2 + nodeWidth / 2;

    layerNodes.forEach((node, index) => {
      const x = startX + index * (nodeWidth + horizontalSpacing);
      const y = containerPadding + layer * layerSpacing;

      positionedNodes.push({
        ...node,
        position: { x, y },
      });
    });
  });

  return positionedNodes;
}

/**
 * Arranges nodes in a hierarchical layout optimized for RabbitMQ topology
 */
export function arrangeNodesHierarchical(
  nodes: Node[],
  options: LayeredLayoutOptions = {}
): Node[] {
  const {
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    horizontalSpacing = DEFAULT_HORIZONTAL_SPACING,
    verticalSpacing = DEFAULT_VERTICAL_SPACING,
    containerPadding = DEFAULT_CONTAINER_PADDING,
    layerSpacing = DEFAULT_LAYER_SPACING,
  } = options;

  // Separate nodes by type
  const producers = nodes.filter(n => n.type === 'producer');
  const exchanges = nodes.filter(n => n.type?.includes('exchange') || ['direct', 'fanout', 'topic', 'headers'].includes(n.type || ''));
  const queues = nodes.filter(n => n.type === 'queue');
  const consumers = nodes.filter(n => n.type === 'consumer');

  const layers = [producers, exchanges, queues, consumers];
  const positionedNodes: Node[] = [];

  let currentY = containerPadding;

  layers.forEach((layerNodes, layerIndex) => {
    if (layerNodes.length === 0) return;

    // Calculate horizontal centering
    const totalWidth = layerNodes.length * nodeWidth + (layerNodes.length - 1) * horizontalSpacing;
    let currentX = containerPadding;

    // For better visual balance, center each layer
    if (layerNodes.length > 1) {
      currentX = containerPadding + (800 - totalWidth) / 2; // Assume viewport width ~800px
    }

    layerNodes.forEach((node, nodeIndex) => {
      positionedNodes.push({
        ...node,
        position: {
          x: currentX + nodeIndex * (nodeWidth + horizontalSpacing),
          y: currentY,
        },
      });
    });

    currentY += layerSpacing;
  });

  return positionedNodes;
}

/**
 * Auto-distributes nodes with collision detection and spacing optimization
 */
export function arrangeNodesWithSpacing(
  nodes: Node[],
  options: LayoutOptions = {}
): Node[] {
  const {
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    horizontalSpacing = DEFAULT_HORIZONTAL_SPACING,
    verticalSpacing = DEFAULT_VERTICAL_SPACING,
    containerPadding = DEFAULT_CONTAINER_PADDING,
  } = options;

  if (nodes.length === 0) return nodes;

  // First, try hierarchical layout
  let arrangedNodes = arrangeNodesHierarchical(nodes, options);

  // Check for overlaps and adjust if necessary
  arrangedNodes = resolveCollisions(arrangedNodes, {
    nodeWidth,
    nodeHeight,
    horizontalSpacing,
    verticalSpacing,
  });

  return arrangedNodes;
}

/**
 * Resolves node collisions by adjusting positions
 */
function resolveCollisions(
  nodes: Node[],
  options: {
    nodeWidth: number;
    nodeHeight: number;
    horizontalSpacing: number;
    verticalSpacing: number;
  }
): Node[] {
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = options;
  const result = [...nodes];

  // Simple collision detection and resolution
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const nodeA = result[i];
      const nodeB = result[j];

      const minDistanceX = nodeWidth + horizontalSpacing;
      const minDistanceY = nodeHeight + verticalSpacing;

      const distanceX = Math.abs(nodeA.position.x - nodeB.position.x);
      const distanceY = Math.abs(nodeA.position.y - nodeB.position.y);

      // If nodes are too close, adjust position
      if (distanceX < minDistanceX && distanceY < minDistanceY) {
        // Move the second node to avoid overlap
        if (nodeB.position.x >= nodeA.position.x) {
          result[j] = {
            ...nodeB,
            position: {
              ...nodeB.position,
              x: nodeA.position.x + minDistanceX,
            },
          };
        } else {
          result[j] = {
            ...nodeB,
            position: {
              ...nodeB.position,
              x: nodeA.position.x - minDistanceX,
            },
          };
        }
      }
    }
  }

  return result;
}

/**
 * Gets the layer number for a node type
 */
function getNodeLayer(nodeType: string): number {
  return NODE_TYPE_LAYERS[nodeType as keyof typeof NODE_TYPE_LAYERS] ?? 0;
}

/**
 * Calculates optimal viewport bounds for the given nodes
 */
export function calculateViewportBounds(nodes: Node[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  const positions = nodes.map(n => n.position);
  const minX = Math.min(...positions.map(p => p.x)) - DEFAULT_CONTAINER_PADDING;
  const maxX = Math.max(...positions.map(p => p.x)) + DEFAULT_NODE_WIDTH + DEFAULT_CONTAINER_PADDING;
  const minY = Math.min(...positions.map(p => p.y)) - DEFAULT_CONTAINER_PADDING;
  const maxY = Math.max(...positions.map(p => p.y)) + DEFAULT_NODE_HEIGHT + DEFAULT_CONTAINER_PADDING;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Layout presets for different use cases
 */
export const LAYOUT_PRESETS = {
  default: {
    name: 'Default',
    description: 'Hierarchical layout optimized for RabbitMQ message flow',
    layoutFn: arrangeNodesHierarchical,
  },
  grid: {
    name: 'Grid',
    description: 'Simple grid layout with equal spacing',
    layoutFn: arrangeNodesInGrid,
  },
  layers: {
    name: 'Layers',
    description: 'Layered layout with producers, exchanges, queues, and consumers',
    layoutFn: arrangeNodesInLayers,
  },
  compact: {
    name: 'Compact',
    description: 'Space-efficient layout with minimal spacing',
    layoutFn: (nodes: Node[]) => arrangeNodesWithSpacing(nodes, {
      horizontalSpacing: 60,
      verticalSpacing: 40,
    }),
  },
  spacious: {
    name: 'Spacious',
    description: 'Extended layout with generous spacing',
    layoutFn: (nodes: Node[]) => arrangeNodesWithSpacing(nodes, {
      horizontalSpacing: 150,
      verticalSpacing: 100,
    }),
  },
};
