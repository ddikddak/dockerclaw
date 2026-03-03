// ============================================
// Hook: Block Dragging
// Manages drag state and coordinate transformation
// ============================================

import { useState, useCallback, useRef } from 'react';
import type { Block } from '@/types';

interface DragState {
  isDragging: boolean;
  draggedBlockId: string | null;
  dragStart: { x: number; y: number } | null;
  blockStart: { x: number; y: number } | null;
}

interface UseBlockDragOptions {
  onDragStart?: (blockId: string) => void;
  onDragMove?: (blockId: string, x: number, y: number) => void;
  onDragEnd?: (blockId: string, screenX?: number, screenY?: number) => void;
  zoom?: number;
}

interface UseBlockDragReturn {
  dragState: DragState;
  handleDragStart: (blockId: string, clientX: number, clientY: number, blocks: Block[]) => void;
  handleDragMove: (clientX: number, clientY: number) => void;
  handleDragEnd: (clientX?: number, clientY?: number) => void;
  resetDrag: () => void;
}

export function useBlockDrag(options: UseBlockDragOptions = {}): UseBlockDragReturn {
  const { onDragStart, onDragMove, onDragEnd, zoom = 1 } = options;
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBlockId: null,
    dragStart: null,
    blockStart: null,
  });

  const stateRef = useRef(dragState);
  stateRef.current = dragState;

  const handleDragStart = useCallback((
    blockId: string,
    clientX: number,
    clientY: number,
    blocks: Block[]
  ) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setDragState({
      isDragging: true,
      draggedBlockId: blockId,
      dragStart: { x: clientX, y: clientY },
      blockStart: { x: block.x, y: block.y },
    });

    onDragStart?.(blockId);
  }, [onDragStart]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const state = stateRef.current;
    if (!state.isDragging || !state.draggedBlockId || !state.dragStart || !state.blockStart) return;

    const dx = (clientX - state.dragStart.x) / zoom;
    const dy = (clientY - state.dragStart.y) / zoom;

    onDragMove?.(
      state.draggedBlockId,
      state.blockStart.x + dx,
      state.blockStart.y + dy
    );
  }, [onDragMove, zoom]);

  const handleDragEnd = useCallback((clientX?: number, clientY?: number) => {
    const state = stateRef.current;
    if (!state.draggedBlockId) return;

    onDragEnd?.(state.draggedBlockId, clientX, clientY);

    setDragState({
      isDragging: false,
      draggedBlockId: null,
      dragStart: null,
      blockStart: null,
    });
  }, [onDragEnd]);

  const resetDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      dragStart: null,
      blockStart: null,
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetDrag,
  };
}
