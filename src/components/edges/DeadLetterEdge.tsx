import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { Skull } from 'lucide-react';

export const DeadLetterEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    ...style,
    stroke: '#dc2626', // Red color for dead letter routing
    strokeWidth: 2,
    strokeDasharray: '8 4', // Dashed line to indicate error/failure routing
    filter: 'drop-shadow(0 2px 4px rgba(220, 38, 38, 0.3))',
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-xs pointer-events-auto nodrag nopan"
          style={{
            transform: `translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div className="bg-red-600 text-white px-2 py-1 rounded-full shadow-lg flex items-center gap-1 text-xs font-medium border-2 border-red-400">
            <Skull size={12} />
            <span>Dead Letter</span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default DeadLetterEdge;
