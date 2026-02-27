// ============================================
// Collaborator Cursors - SVG overlay for remote users
// ============================================

import { memo } from 'react';

interface RemoteCursor {
  userId: string;
  email: string;
  color: string;
  x: number;
  y: number;
}

interface RemoteSelection {
  userId: string;
  color: string;
  blockId: string;
}

interface CollaboratorCursorsProps {
  cursors: RemoteCursor[];
  selections: RemoteSelection[];
  blocks: { id: string; x: number; y: number; w: number; h: number }[];
}

export const CollaboratorCursors = memo(function CollaboratorCursors({
  cursors,
  selections,
  blocks,
}: CollaboratorCursorsProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 9999 }}
    >
      {/* Selection highlights */}
      {selections.map((sel) => {
        const block = blocks.find((b) => b.id === sel.blockId);
        if (!block) return null;
        return (
          <rect
            key={`sel-${sel.userId}`}
            x={block.x - 3}
            y={block.y - 3}
            width={block.w + 6}
            height={block.h + 6}
            rx={6}
            fill="none"
            stroke={sel.color}
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        );
      })}

      {/* Cursors */}
      {cursors.map((cursor) => (
        <g
          key={`cursor-${cursor.userId}`}
          transform={`translate(${cursor.x}, ${cursor.y})`}
          style={{ transition: 'transform 80ms linear' }}
        >
          {/* Cursor arrow */}
          <path
            d="M0 0 L0 16 L4.5 12.5 L8.5 20 L11 19 L7 11 L12 10 Z"
            fill={cursor.color}
            stroke="white"
            strokeWidth={1}
          />
          {/* Name label */}
          <g transform="translate(14, 16)">
            <rect
              x={0}
              y={0}
              width={Math.max(cursor.email.split('@')[0].length * 6.5 + 12, 32)}
              height={18}
              rx={4}
              fill={cursor.color}
            />
            <text
              x={6}
              y={13}
              fontSize={10}
              fontFamily="system-ui, sans-serif"
              fill="white"
              fontWeight={500}
            >
              {cursor.email.split('@')[0]}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
});
