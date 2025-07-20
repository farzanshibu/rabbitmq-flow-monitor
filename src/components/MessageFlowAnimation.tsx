import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MessageFlow } from '@/services/rabbitmqWebSocket';

interface MessageFlowAnimationProps {
  flow: MessageFlow;
  onComplete: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface MessageState {
  position: Position;
  currentHop: number;
  stage: 'moving' | 'queued' | 'consuming' | 'processing';
  queueTime?: number;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BezierPath {
  start: Position;
  end: Position;
  cp1: Position;
  cp2: Position;
}

export const MessageFlowAnimation: React.FC<MessageFlowAnimationProps> = ({ flow, onComplete }) => {
  const [messageState, setMessageState] = useState<MessageState>({
    position: { x: 0, y: 0 },
    currentHop: 0,
    stage: 'moving'
  });
  const [isVisible, setIsVisible] = useState(true);
  const animationRef = useRef<number>();
  const dotRef = useRef<HTMLDivElement>(null);

  // Get node positions with better connection points
  const getNodePosition = useCallback((nodeId: string): NodePosition | null => {
    const element = document.querySelector(`[data-id="${nodeId}"]`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const reactFlowWrapper = document.querySelector('.react-flow');
    const wrapperRect = reactFlowWrapper?.getBoundingClientRect();
    
    if (!wrapperRect) return null;

    return {
      x: rect.left - wrapperRect.left + rect.width / 2,
      y: rect.top - wrapperRect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }, []);

  // Get connection points based on node types
  const getConnectionPoints = useCallback((from: NodePosition, to: NodePosition, nodeType: { from: string, to: string }) => {
    const fromCenterX = from.x;
    const fromCenterY = from.y;
    const toCenterX = to.x;
    const toCenterY = to.y;

    // Determine optimal connection points
    let fromX = fromCenterX;
    const fromY = fromCenterY;
    let toX = toCenterX;
    const toY = toCenterY;

    // For producers: connect from right side
    if (nodeType.from.includes('producer')) {
      fromX = from.x + from.width * 0.4;
    }

    // For exchanges: connect from left side (input) and right side (output)
    if (nodeType.from.includes('exchange')) {
      fromX = from.x + from.width * 0.4;
    }
    if (nodeType.to.includes('exchange')) {
      toX = to.x - to.width * 0.4;
    }

    // For queues: connect from left side (input) and right side (output)
    if (nodeType.from.includes('queue')) {
      fromX = from.x + from.width * 0.4;
    }
    if (nodeType.to.includes('queue')) {
      toX = to.x - to.width * 0.4;
    }

    // For consumers: connect from left side
    if (nodeType.to.includes('consumer')) {
      toX = to.x - to.width * 0.4;
    }

    return { from: { x: fromX, y: fromY }, to: { x: toX, y: toY } };
  }, []);

  // Create bezier curve path between two points
  const createBezierPath = useCallback((start: Position, end: Position): BezierPath => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Control points for smooth curve
    const cp1x = start.x + dx * 0.5;
    const cp1y = start.y;
    const cp2x = end.x - dx * 0.5;
    const cp2y = end.y;

    return { start, end, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } };
  }, []);

  // Calculate position along bezier curve
  const getPositionOnBezier = useCallback((path: BezierPath, t: number): Position => {
    const { start, cp1, cp2, end } = path;
    const mt = 1 - t;
    
    const x = mt * mt * mt * start.x + 
              3 * mt * mt * t * cp1.x + 
              3 * mt * t * t * cp2.x + 
              t * t * t * end.x;
              
    const y = mt * mt * mt * start.y + 
              3 * mt * mt * t * cp1.y + 
              3 * mt * t * t * cp2.y + 
              t * t * t * end.y;

    return { x, y };
  }, []);

  // Update position using CSS transform instead of inline styles
  const updatePosition = useCallback((position: Position) => {
    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${position.x - 6}px, ${position.y - 6}px)`;
    }
  }, []);

  useEffect(() => {
    // Build complete flow path: producer -> exchange -> queue -> consumer
    const flowPath = flow.flowPath || [flow.fromNodeId, flow.toNodeId];
    
    if (flowPath.length < 2) {
      onComplete();
      return;
    }

    let currentHopIndex = 0;
    const hopDuration = 800; // Duration for each hop
    const pauseDuration = 200; // Pause at each node

    const animateFlow = () => {
      if (currentHopIndex >= flowPath.length - 1) {
        // Animation complete
        setIsVisible(false);
        onComplete();
        return;
      }

      const fromNodeId = flowPath[currentHopIndex];
      const toNodeId = flowPath[currentHopIndex + 1];
      
      const fromPos = getNodePosition(fromNodeId);
      const toPos = getNodePosition(toNodeId);

      if (!fromPos || !toPos) {
        // Skip this hop if nodes not found
        currentHopIndex++;
        requestAnimationFrame(animateFlow);
        return;
      }

      // Get proper connection points
      const connectionPoints = getConnectionPoints(fromPos, toPos, {
        from: fromNodeId,
        to: toNodeId
      });

      // Create bezier path
      const bezierPath = createBezierPath(connectionPoints.from, connectionPoints.to);
      
      const startTime = Date.now();
      
      const animateHop = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < hopDuration) {
          // Moving along the current edge
          const progress = elapsed / hopDuration;
          const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
          
          const position = getPositionOnBezier(bezierPath, easeProgress);
          
          setMessageState(prev => ({
            ...prev,
            position,
            currentHop: currentHopIndex,
            stage: 'moving'
          }));

          updatePosition(position);
          animationRef.current = requestAnimationFrame(animateHop);
        } else {
          // Reached the target node
          const isQueue = toNodeId.includes('queue');
          const isConsumer = toNodeId.includes('consumer');
          const isLastHop = currentHopIndex === flowPath.length - 2;

          setMessageState(prev => ({
            ...prev,
            position: connectionPoints.to,
            stage: isQueue ? 'queued' : isConsumer ? 'consuming' : 'processing'
          }));

          updatePosition(connectionPoints.to);

          if (isLastHop) {
            // Final destination reached
            setTimeout(() => {
              setIsVisible(false);
              onComplete();
            }, 500);
          } else {
            // Move to next hop after brief pause
            setTimeout(() => {
              currentHopIndex++;
              animateFlow();
            }, pauseDuration);
          }
        }
      };

      animateHop();
    };

    animateFlow();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [flow, onComplete, getNodePosition, getConnectionPoints, createBezierPath, getPositionOnBezier, updatePosition]);

  if (!isVisible) return null;

  // Get visual properties based on message state
  const getMessageVisual = () => {
    switch (messageState.stage) {
      case 'moving':
        return {
          color: 'bg-blue-500',
          effect: 'animate-pulse',
          size: 'w-2 h-2',
          shadow: 'shadow-blue-400'
        };
      case 'queued':
        return {
          color: 'bg-yellow-500',
          effect: 'animate-bounce',
          size: 'w-2 h-2',
          shadow: 'shadow-yellow-400'
        };
      case 'processing':
        return {
          color: 'bg-purple-500',
          effect: 'animate-spin',
          size: 'w-2 h-2',
          shadow: 'shadow-purple-400'
        };
      case 'consuming':
        return {
          color: 'bg-green-500',
          effect: 'animate-ping',
          size: 'w-3 h-3',
          shadow: 'shadow-green-400'
        };
      default:
        return {
          color: 'bg-blue-500',
          effect: 'animate-pulse',
          size: 'w-2 h-2',
          shadow: 'shadow-blue-400'
        };
    }
  };

  const visual = getMessageVisual();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Simple message dot */}
      <div 
        ref={dotRef}
        className={`absolute rounded-full ${visual.size} ${visual.color} ${visual.effect} ${visual.shadow} shadow-sm transition-all duration-200`}
      >
        {/* Enhanced visual effects for different stages */}
        {messageState.stage === 'consuming' && (
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
        )}
        {messageState.stage === 'moving' && (
          <div className="absolute inset-0 bg-blue-300 rounded-full animate-pulse opacity-50" />
        )}
        {messageState.stage === 'processing' && (
          <div className="absolute inset-0 bg-purple-300 rounded-full animate-pulse opacity-60" />
        )}
      </div>
    </div>
  );
};

export default MessageFlowAnimation;
