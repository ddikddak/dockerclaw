// ============================================
// Connections Layer - Optimized SVG rendering
// Uses spatial indexing for viewport culling
// ============================================

import { useMemo, useRef, useEffect } from 'react';
import { memo } from 'react';
import { ConnectionSpatialIndex, type BBox } from '@/lib/SpatialIndex';
import type { Block, Connection, ConnectionType } from '@/types';

interface ConnectionsLayerProps {
  connections: Connection[];
  blocksById: Map<string, Block>;
  viewport: BBox;
  zoom: number;
  onDoubleClick?: (conn: Connection) => void;
}

const CONNECTION_COLORS: Record<ConnectionType, string> = {
  notify: '#ef4444',
  explains: '#22c55e',
  displays: '#3b82f6',
  links: '#6b7280',
};

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  notify: 'Notifies',
  explains: 'Explains',
  displays: 'Displays',
  links: 'Links',
};

function getConnectionColor(type: ConnectionType): string {
  return CONNECTION_COLORS[type] || '#6b7280';
}

function getConnectionLabel(type: ConnectionType): string {
  return CONNECTION_LABELS[type] || type;
}

function getSideCenter(block: Block, side: 'top' | 'right' | 'bottom' | 'left'): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: block.x + block.w / 2, y: block.y };
    case 'right':
      return { x: block.x + block.w, y: block.y + block.h / 2 };
    case 'bottom':
      return { x: block.x + block.w / 2, y: block.y + block.h };
    case 'left':
      return { x: block.x, y: block.y + block.h / 2 };
  }
}

function getConnectionSide(fromBlock: Block, toBlock: Block): { from: 'top' | 'right' | 'bottom' | 'left'; to: 'top' | 'right' | 'bottom' | 'left' } {
  const dx = toBlock.x + toBlock.w / 2 - (fromBlock.x + fromBlock.w / 2);
  const dy = toBlock.y + toBlock.h / 2 - (fromBlock.y + fromBlock.h / 2);
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      from: dx > 0 ? 'right' : 'left',
      to: dx > 0 ? 'left' : 'right',
    };
  } else {
    return {
      from: dy > 0 ? 'bottom' : 'top',
      to: dy > 0 ? 'top' : 'bottom',
    };
  }
}

function getBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: 'top' | 'right' | 'bottom' | 'left',
  toSide: 'top' | 'right' | 'bottom' | 'left'
): string {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const tension = Math.min(0.5, Math.max(0.2, (dx + dy) / 1000));
  
  let c1x: number, c1y: number, c2x: number, c2y: number;
  
  switch (fromSide) {
    case 'right':
      c1x = from.x + dx * tension;
      c1y = from.y;
      break;
    case 'left':
      c1x = from.x - dx * tension;
      c1y = from.y;
      break;
    case 'bottom':
      c1x = from.x;
      c1y = from.y + dy * tension;
      break;
    case 'top':
      c1x = from.x;
      c1y = from.y - dy * tension;
      break;
  }
  
  switch (toSide) {
    case 'right':
      c2x = to.x + dx * tension;
      c2y = to.y;
      break;
    case 'left':
      c2x = to.x - dx * tension;
      c2y = to.y;
      break;
    case 'bottom':
      c2x = to.x;
      c2y = to.y + dy * tension;
      break;
    case 'top':
      c2x = to.x;
      c2y = to.y - dy * tension;
      break;
  }
  
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

interface ConnectionPath {
  conn: Connection;
  path: string;
  color: string;
  midX: number;
  midY: number;
}

export const ConnectionsLayer = memo(function ConnectionsLayer({
  connections,
  blocksById,
  viewport,
  onDoubleClick,
}: ConnectionsLayerProps) {
  // Build spatial index for viewport culling
  const spatialIndexRef = useRef<ConnectionSpatialIndex | null>(null);
  
  if (!spatialIndexRef.current) {
    spatialIndexRef.current = new ConnectionSpatialIndex(200);
  }
  
  // Update spatial index when connections change
  useEffect(() => {
    const index = spatialIndexRef.current!;
    index.clear();
    
    for (const conn of connections) {
      const fromBlock = blocksById.get(conn.fromBlockId);
      const toBlock = blocksById.get(conn.toBlockId);
      if (!fromBlock || !toBlock) continue;
      
      const { from: fromSide, to: toSide } = getConnectionSide(fromBlock, toBlock);
      const fromPoint = getSideCenter(fromBlock, fromSide);
      const toPoint = getSideCenter(toBlock, toSide);
      
      index.insert({
        id: conn.id,
        x1: fromPoint.x,
        y1: fromPoint.y,
        x2: toPoint.x,
        y2: toPoint.y,
        data: conn,
      });
    }
  }, [connections, blocksById]);
  
  // Query visible connections
  const visiblePaths = useMemo((): ConnectionPath[] => {
    const index = spatialIndexRef.current!;
    const visible = index.queryRange(viewport);
    
    return visible
      .map((segment): ConnectionPath | null => {
        const conn = segment.data as Connection;
        const fromBlock = blocksById.get(conn.fromBlockId);
        const toBlock = blocksById.get(conn.toBlockId);
        if (!fromBlock || !toBlock) return null;
        
        const { from: fromSide, to: toSide } = getConnectionSide(fromBlock, toBlock);
        const fromPoint = getSideCenter(fromBlock, fromSide);
        const toPoint = getSideCenter(toBlock, toSide);
        
        return {
          conn,
          path: getBezierPath(fromPoint, toPoint, fromSide, toSide),
          color: getConnectionColor(conn.type),
          midX: (fromPoint.x + toPoint.x) / 2,
          midY: (fromPoint.y + toPoint.y) / 2,
        };
      })
      .filter((p): p is ConnectionPath => p !== null);
  }, [viewport, blocksById]);

  return (
    <svg 
      className="absolute pointer-events-none" 
      style={{ 
        width: '100%', 
        height: '100%', 
        left: 0, 
        top: 0, 
        overflow: 'visible' 
      }}
    >
      <defs>
        {(['notify', 'explains', 'displays', 'links'] as ConnectionType[]).map((type) => (
          <marker 
            key={type} 
            id={`arrowhead-${type}`} 
            markerWidth="10" 
            markerHeight="7" 
            refX="9" 
            refY="3.5" 
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={getConnectionColor(type)} />
          </marker>
        ))}
      </defs>
      
      {visiblePaths.map(({ conn, path, color, midX, midY }) => (
        <g key={conn.id}>
          {/* Invisible hit area for easier clicking */}
          <path 
            d={path} 
            stroke="transparent" 
            strokeWidth="20" 
            fill="none" 
            style={{ cursor: 'pointer', pointerEvents: 'auto' }} 
            onDoubleClick={() => onDoubleClick?.(conn)} 
          />
          
          {/* Visible connection line */}
          <path 
            d={path} 
            stroke={color} 
            strokeWidth="2" 
            fill="none" 
            markerEnd={`url(#arrowhead-${conn.type})`} 
            className="hover:stroke-[3px] transition-all" 
          />
          
          {/* Label */}
          {(conn.label || getConnectionLabel(conn.type)) && (
            <g>
              <rect 
                x={midX - 32} 
                y={midY - 11} 
                width="64" 
                height="22" 
                rx="4" 
                fill="white" 
                stroke={color} 
                strokeWidth="1" 
              />
              <text 
                x={midX} 
                y={midY + 4} 
                fontSize="10" 
                fill={color} 
                fontWeight="500" 
                textAnchor="middle"
              >
                {conn.label || getConnectionLabel(conn.type)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
});

ConnectionsLayer.displayName = 'ConnectionsLayer';
