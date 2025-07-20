import React from 'react';
import {
  EdgeProps,
  getBezierPath,
  BaseEdge,
  useReactFlow,
  Node,
} from '@xyflow/react';

interface NodeData {
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
}

interface ConnectionPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  score: number; // Quality score for this connection point
}

// Constants for edge connection optimization
const CORNER_MARGIN_RATIO = 0.25; // Avoid connections in the corner 25% of each side
const MIN_CONNECTION_AREA_RATIO = 0.5; // Use at least 50% of available connection area

// Helper function to calculate the best connection point on a node
function getBestConnectionPoint(node: NodeData, targetNode: NodeData): ConnectionPoint {
  const {
    width: nodeWidth = 180,
    height: nodeHeight = 80,
    position: nodePosition,
    measured: nodeMeasured,
  } = node;

  const {
    width: targetWidth = 180,
    height: targetHeight = 80,
    position: targetPosition,
    measured: targetMeasured,
  } = targetNode;

  // Use measured dimensions if available, otherwise fall back to provided or default dimensions
  const actualNodeWidth = nodeMeasured?.width || nodeWidth;
  const actualNodeHeight = nodeMeasured?.height || nodeHeight;
  const actualTargetWidth = targetMeasured?.width || targetWidth;
  const actualTargetHeight = targetMeasured?.height || targetHeight;

  // Calculate node centers using actual dimensions
  const nodeCenterX = nodePosition.x + actualNodeWidth / 2;
  const nodeCenterY = nodePosition.y + actualNodeHeight / 2;
  const targetCenterX = targetPosition.x + actualTargetWidth / 2;
  const targetCenterY = targetPosition.y + actualTargetHeight / 2;

  // Calculate relative position
  const deltaX = targetCenterX - nodeCenterX;
  const deltaY = targetCenterY - nodeCenterY;

  // Calculate corner margins using actual dimensions
  const horizontalMargin = actualNodeWidth * CORNER_MARGIN_RATIO;
  const verticalMargin = actualNodeHeight * CORNER_MARGIN_RATIO;
  
  // Available connection areas for each side (avoiding corners) using actual dimensions
  const connectionAreas = {
    top: {
      start: nodePosition.x + horizontalMargin,
      end: nodePosition.x + actualNodeWidth - horizontalMargin,
      position: nodePosition.y,
      direction: 'horizontal'
    },
    bottom: {
      start: nodePosition.x + horizontalMargin,
      end: nodePosition.x + actualNodeWidth - horizontalMargin,
      position: nodePosition.y + actualNodeHeight,
      direction: 'horizontal'
    },
    left: {
      start: nodePosition.y + verticalMargin,
      end: nodePosition.y + actualNodeHeight - verticalMargin,
      position: nodePosition.x,
      direction: 'vertical'
    },
    right: {
      start: nodePosition.y + verticalMargin,
      end: nodePosition.y + actualNodeHeight - verticalMargin,
      position: nodePosition.x + actualNodeWidth,
      direction: 'vertical'
    }
  };

  // Calculate potential connection points for each side
  const connectionOptions: ConnectionPoint[] = [];

  // Top side
  if (deltaY < 0) { // Target is above
    const area = connectionAreas.top;
    const connectionX = Math.max(area.start, Math.min(area.end, targetCenterX));
    const distance = Math.abs(deltaY);
    const alignment = 1 - Math.abs(connectionX - targetCenterX) / (actualNodeWidth / 2);
    connectionOptions.push({
      x: connectionX,
      y: area.position,
      side: 'top',
      score: distance * 0.5 + alignment * 0.5
    });
  }

  // Bottom side
  if (deltaY > 0) { // Target is below
    const area = connectionAreas.bottom;
    const connectionX = Math.max(area.start, Math.min(area.end, targetCenterX));
    const distance = Math.abs(deltaY);
    const alignment = 1 - Math.abs(connectionX - targetCenterX) / (actualNodeWidth / 2);
    connectionOptions.push({
      x: connectionX,
      y: area.position,
      side: 'bottom',
      score: distance * 0.5 + alignment * 0.5
    });
  }

  // Left side
  if (deltaX < 0) { // Target is to the left
    const area = connectionAreas.left;
    const connectionY = Math.max(area.start, Math.min(area.end, targetCenterY));
    const distance = Math.abs(deltaX);
    const alignment = 1 - Math.abs(connectionY - targetCenterY) / (actualNodeHeight / 2);
    connectionOptions.push({
      x: area.position,
      y: connectionY,
      side: 'left',
      score: distance * 0.5 + alignment * 0.5
    });
  }

  // Right side
  if (deltaX > 0) { // Target is to the right
    const area = connectionAreas.right;
    const connectionY = Math.max(area.start, Math.min(area.end, targetCenterY));
    const distance = Math.abs(deltaX);
    const alignment = 1 - Math.abs(connectionY - targetCenterY) / (actualNodeHeight / 2);
    connectionOptions.push({
      x: area.position,
      y: connectionY,
      side: 'right',
      score: distance * 0.5 + alignment * 0.5
    });
  }

  // If no options available (nodes are overlapping), use fallback
  if (connectionOptions.length === 0) {
    // Default to right side center using actual dimensions
    return {
      x: nodePosition.x + actualNodeWidth,
      y: nodeCenterY,
      side: 'right',
      score: 0
    };
  }

  // Choose the best connection point based on score
  return connectionOptions.reduce((best, current) => 
    current.score > best.score ? current : best
  );
}

// Enhanced helper function for smart edge connections
function getSmartConnectionPoints(sourceNode: NodeData, targetNode: NodeData) {
  const sourcePoint = getBestConnectionPoint(sourceNode, targetNode);
  const targetPoint = getBestConnectionPoint(targetNode, sourceNode);

  return {
    source: sourcePoint,
    target: targetPoint
  };
}

// Helper function to determine if a node should have markers
function shouldHaveMarkers(nodeType: string): { start: boolean; end: boolean } {
  // All nodes should have both start and end markers to show message flow direction
  switch (nodeType) {
    case 'producer':
      return { start: true, end: true }; // Producers send messages (need markers)
    case 'queue':
      return { start: true, end: true }; // Queues receive and forward messages (need markers)
    case 'consumer':
      return { start: true, end: true }; // Consumers receive messages (need markers)
    case 'exchange-direct':
      return { start: true, end: true }
    case 'exchange-fanout':
      return { start: true, end: true }
    case 'exchange-topic':
      return { start: true, end: true }
    case 'exchange-headers':
      return { start: true, end: true }
    case 'direct':
      return { start: true, end: true }
    case 'fanout':
      return { start: true, end: true }
    case 'topic':
      return { start: true, end: true }
    case 'headers':
      return { start: true, end: true }; // All exchanges route messages (need markers)
    default:
      return { start: true, end: true }; // Default to having markers for all nodes
  }
}

// Helper function to get floating edge parameters using smart connections
function getFloatingEdgeParams(sourceNode: NodeData, targetNode: NodeData) {
  const { source, target } = getSmartConnectionPoints(sourceNode, targetNode);

  // Get actual node dimensions - use measured dimensions if available, otherwise defaults
  const sourceWidth = sourceNode.measured?.width || sourceNode.width || 180;
  const sourceHeight = sourceNode.measured?.height || sourceNode.height || 80;
  const targetWidth = targetNode.measured?.width || targetNode.width || 180;
  const targetHeight = targetNode.measured?.height || targetNode.height || 80;

  let adjustedSx = source.x;
  let adjustedSy = source.y;
  let adjustedTx = target.x;
  let adjustedTy = target.y;

  // Ensure source point is exactly on the node border using actual dimensions
  switch (source.side) {
    case 'right':
      adjustedSx = sourceNode.position.x + sourceWidth;
      break;
    case 'left':
      adjustedSx = sourceNode.position.x;
      break;
    case 'top':
      adjustedSy = sourceNode.position.y;
      break;
    case 'bottom':
      adjustedSy = sourceNode.position.y + sourceHeight;
      break;
  }

  // Ensure target point is exactly on the node border using actual dimensions
  switch (target.side) {
    case 'right':
      adjustedTx = targetNode.position.x + targetWidth;
      break;
    case 'left':
      adjustedTx = targetNode.position.x;
      break;
    case 'top':
      adjustedTy = targetNode.position.y;
      break;
    case 'bottom':
      adjustedTy = targetNode.position.y + targetHeight;
      break;
  }

  return {
    sx: adjustedSx,
    sy: adjustedSy,
    tx: adjustedTx,
    ty: adjustedTy,
    sourceSide: source.side,
    targetSide: target.side,
  };
}

// Helper function to calculate control points for better bezier curves
function getEnhancedBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceSide: string,
  targetSide: string
) {
  const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  const controlOffset = Math.min(distance * 0.3, 100); // Adaptive control point distance

  let sourceControlX = sourceX;
  let sourceControlY = sourceY;
  let targetControlX = targetX;
  let targetControlY = targetY;

  // Calculate control points based on connection sides
  switch (sourceSide) {
    case 'right':
      sourceControlX += controlOffset;
      break;
    case 'left':
      sourceControlX -= controlOffset;
      break;
    case 'bottom':
      sourceControlY += controlOffset;
      break;
    case 'top':
      sourceControlY -= controlOffset;
      break;
  }

  switch (targetSide) {
    case 'right':
      targetControlX += controlOffset;
      break;
    case 'left':
      targetControlX -= controlOffset;
      break;
    case 'bottom':
      targetControlY += controlOffset;
      break;
    case 'top':
      targetControlY -= controlOffset;
      break;
  }

  // Create smooth bezier path
  return `M ${sourceX},${sourceY} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`;
}

export interface FloatingBezierEdgeProps extends EdgeProps {
  animated?: boolean;
  style?: React.CSSProperties;
  markerEnd?: string;
  markerStart?: string;
}

const FloatingBezierEdge: React.FC<FloatingBezierEdgeProps> = (edgeProps) => {
  const {
    id,
    source,
    target,
    markerEnd,
    markerStart,
    style = {},
    animated = false,
    // Filter out React Flow specific props that should not be passed to DOM
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    ...restProps
  } = edgeProps;

  const { getNode } = useReactFlow();
  
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourceSide, targetSide } = getFloatingEdgeParams(sourceNode, targetNode);

  // Calculate dynamic marker offsets based on actual node dimensions
  const sourceWidth = sourceNode.measured?.width || sourceNode.width || 180;
  const sourceHeight = sourceNode.measured?.height || sourceNode.height || 80;
  const targetWidth = targetNode.measured?.width || targetNode.width || 180;
  const targetHeight = targetNode.measured?.height || targetNode.height || 80;
  
  // Calculate proportional offsets (minimum 6px, maximum 12px)
  const sourceHorizontalOffset = Math.max(6, Math.min(12, sourceWidth * 0.04));
  const sourceVerticalOffset = Math.max(6, Math.min(12, sourceHeight * 0.06));
  const targetHorizontalOffset = Math.max(6, Math.min(10, targetWidth * 0.03));
  const targetVerticalOffset = Math.max(6, Math.min(10, targetHeight * 0.05));
  
  let adjustedSx = sx;
  let adjustedSy = sy;
  let adjustedTx = tx;
  let adjustedTy = ty;

  // Adjust source point based on connection side with proportional offsets
  switch (sourceSide) {
    case 'right':
      adjustedSx = sx + sourceHorizontalOffset;
      break;
    case 'left':
      adjustedSx = sx - sourceHorizontalOffset;
      break;
    case 'bottom':
      adjustedSy = sy + sourceVerticalOffset;
      break;
    case 'top':
      adjustedSy = sy - sourceVerticalOffset;
      break;
  }

  // Adjust target point based on connection side with proportional offsets
  switch (targetSide) {
    case 'right':
      adjustedTx = tx + targetHorizontalOffset;
      break;
    case 'left':
      adjustedTx = tx - targetHorizontalOffset;
      break;
    case 'bottom':
      adjustedTy = ty + targetVerticalOffset;
      break;
    case 'top':
      adjustedTy = ty - targetVerticalOffset;
      break;
  }

  // Create the main edge path with adjusted points
  const edgePath = getEnhancedBezierPath(adjustedSx, adjustedSy, adjustedTx, adjustedTy, sourceSide, targetSide);

  // Determine marker visibility based on node types
  const sourceMarkers = shouldHaveMarkers(sourceNode.type || '');
  const targetMarkers = shouldHaveMarkers(targetNode.type || '');

  // Enhanced style with better visual feedback
  const enhancedStyle = {
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? '#3b82f6' : '#64748b',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    filter: selected ? 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
    transition: 'all 0.2s ease-in-out',
    ...style,
  };

  // Create custom markers with simple positioning
  const startMarkerId = `square-start-${id}`;
  const endMarkerId = `arrow-end-${id}`;

  // Determine which markers to show
  const showStartMarker = sourceMarkers.start;
  const showEndMarker = targetMarkers.end;

  // Only pass specific props that BaseEdge actually needs
  const baseEdgeProps = {
    id,
    path: edgePath,
    markerStart: showStartMarker ? (markerStart || `url(#${startMarkerId})`) : undefined,
    markerEnd: showEndMarker ? (markerEnd || `url(#${endMarkerId})`) : undefined,
    style: enhancedStyle,
    className: `floating-bezier-edge ${animated ? 'animated' : ''} ${selected ? 'selected' : ''}`,
  };

  return (
    <>
      {/* Define custom markers in SVG defs only if needed */}
      {(showStartMarker || showEndMarker) && (
        <defs>
          {/* Square marker for start point */}
          {showStartMarker && (
            <marker
              id={startMarkerId}
              markerWidth="8"
              markerHeight="8"
              refX="4"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
              viewBox="0 0 8 8"
            >
              <rect
                x="1"
                y="1"
                width="6"
                height="6"
                fill={selected ? '#3b82f6' : '#64748b'}
                stroke="none"
              />
            </marker>
          )}
          
          {/* Arrow marker for end point */}
          {showEndMarker && (
            <marker
              id={endMarkerId}
              markerWidth="10"
              markerHeight="7"
              refX="5"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
              viewBox="0 0 10 7"
            >
              <polygon
                points="0,0 0,7 10,3.5"
                fill={selected ? '#3b82f6' : '#64748b'}
                stroke="none"
              />
            </marker>
          )}
        </defs>
      )}
      
      <BaseEdge {...baseEdgeProps} />
    </>
  );
};

export default FloatingBezierEdge;
