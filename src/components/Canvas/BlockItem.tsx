// ============================================
// Block Item - Optimized block wrapper
// Memoized with custom comparison for minimal re-renders
// ============================================

import { memo, useCallback } from 'react';
import { BlockWrapper } from '@/components/BlockWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { renderBlockContent } from './renderBlockContent';
import type { Block, Agent, Connection } from '@/types';

interface BlockItemProps {
  block: Block;
  isSelected: boolean;
  isViewOnly: boolean;
  zoom: number;
  isConnecting: boolean;
  connectionStart: string | null;
  agents: Agent[];
  connectedBlockIds: string[];
  allBlocks: Block[];
  connections: Connection[];
  
  // Callbacks (should be stable from parent)
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onStartConnection: (id: string) => void;
  onToggleAgentAccess: (blockId: string, agentId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, screenX?: number, screenY?: number) => void;
  onDragMove: (screenX: number, screenY: number) => void;
  onDoubleTap: (id: string) => void;
  onBlockDataUpdate: (id: string, updates: Partial<Block['data']>) => void;
  onCardMoveBetweenBlocks: (fromId: string, toId: string, card: { id: string; title?: string; [key: string]: unknown }) => void;
  onConvertToTask: (item: { id: string; title: string; bodyMarkdown: string }) => void;
  onConvertToDoc: (item: { id: string; title: string; bodyMarkdown: string }) => void;
}

function BlockItemComponent({
  block,
  isSelected,
  isViewOnly,
  zoom,
  isConnecting,
  connectionStart,
  agents,
  connectedBlockIds,
  allBlocks,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onBringToFront,
  onTitleChange,
  onStartConnection,
  onToggleAgentAccess,
  onDragStart,
  onDragEnd,
  onDragMove,
  onDoubleTap,
  onBlockDataUpdate,
  onCardMoveBetweenBlocks,
  onConvertToTask,
  onConvertToDoc,
}: BlockItemProps) {
  // Memoized handlers bound to this block's ID
  const handleSelect = useCallback(() => {
    onSelect(block.id);
  }, [block.id, onSelect]);
  
  const handleUpdate = useCallback((updates: Partial<Block>) => {
    onUpdate(block.id, updates);
  }, [block.id, onUpdate]);
  
  const handleDuplicate = useCallback(() => {
    onDuplicate(block.id);
  }, [block.id, onDuplicate]);
  
  const handleDelete = useCallback(() => {
    onDelete(block.id);
  }, [block.id, onDelete]);
  
  const handleBringToFront = useCallback(() => {
    onBringToFront(block.id);
  }, [block.id, onBringToFront]);
  
  const handleTitleChange = useCallback((title: string) => {
    onTitleChange(block.id, title);
  }, [block.id, onTitleChange]);
  
  const handleStartConnection = useCallback(() => {
    onStartConnection(block.id);
  }, [block.id, onStartConnection]);
  
  const handleToggleAgentAccess = useCallback((agentId: string) => {
    onToggleAgentAccess(block.id, agentId);
  }, [block.id, onToggleAgentAccess]);
  
  const handleDragStart = useCallback(() => {
    onDragStart(block.id);
  }, [block.id, onDragStart]);
  
  const handleDragEnd = useCallback((screenX?: number, screenY?: number) => {
    onDragEnd(block.id, screenX, screenY);
  }, [block.id, onDragEnd]);
  
  const handleDoubleTap = useCallback(() => {
    onDoubleTap(block.id);
  }, [block.id, onDoubleTap]);
  
  // Get block title based on type
  const getBlockTitle = (block: Block): string => {
    const data = block.data || {};
    if ('title' in data && typeof (data as { title?: string }).title === 'string') {
      return (data as { title: string }).title;
    }
    switch (block.type) {
      case 'doc': return 'Untitled Document';
      case 'kanban': return 'Kanban Board';
      case 'inbox': return 'Inbox';
      case 'checklist': return 'Checklist';
      case 'table': return 'Table';
      case 'text': return 'Note';
      case 'folder': return (data as { title?: string }).title || 'Folder';
      case 'image': return 'Image';
      case 'heading': return (data as { content?: string }).content?.slice(0, 30) || 'Heading';
      default: return 'Block';
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div 
          className="absolute p-4 bg-red-50 border border-red-200 rounded-lg"
          style={{ 
            left: block.x, 
            top: block.y, 
            width: block.w, 
            height: block.h,
            zIndex: block.z || 1 
          }}
        >
          <h4 className="text-red-800 font-semibold text-sm">Error loading block</h4>
          <p className="text-red-600 text-xs mt-1">Block ID: {block.id}</p>
        </div>
      }
    >
      <BlockWrapper
        block={block}
        isSelected={isSelected}
        onSelect={handleSelect}
        onUpdate={isViewOnly ? () => {} : handleUpdate}
        onDuplicate={isViewOnly ? () => {} : handleDuplicate}
        onDelete={isViewOnly ? () => {} : handleDelete}
        onBringToFront={handleBringToFront}
        title={getBlockTitle(block)}
        onTitleChange={isViewOnly ? undefined : handleTitleChange}
        zoom={zoom}
        isConnecting={isConnecting}
        connectionStart={connectionStart}
        onStartConnection={handleStartConnection}
        agents={agents}
        onToggleAgentAccess={isViewOnly ? undefined : handleToggleAgentAccess}
        onDragStart={isViewOnly ? undefined : handleDragStart}
        onDragEnd={isViewOnly ? undefined : handleDragEnd}
        onDragMove={isViewOnly ? undefined : onDragMove}
        onDoubleTap={handleDoubleTap}
      >
        {renderBlockContent(block, {
          connectedBlockIds,
          allBlocks,
          onBlockDataUpdate,
          onCardMoveBetweenBlocks,
          onConvertToTask,
          onConvertToDoc,
          isSelected,
        })}
      </BlockWrapper>
    </ErrorBoundary>
  );
}

// Custom comparison for memo - only re-render if these specific props change
export const BlockItem = memo(BlockItemComponent, (prev, next) => {
  // Block identity and position
  if (prev.block.id !== next.block.id) return false;
  if (prev.block.x !== next.block.x) return false;
  if (prev.block.y !== next.block.y) return false;
  if (prev.block.w !== next.block.w) return false;
  if (prev.block.h !== next.block.h) return false;
  if (prev.block.z !== next.block.z) return false;
  
  // Data reference equality (parent should maintain immutability)
  if (prev.block.data !== next.block.data) return false;
  if (prev.block.agentAccess !== next.block.agentAccess) return false;
  if (prev.block.locked !== next.block.locked) return false;
  
  // Selection and interaction state
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isViewOnly !== next.isViewOnly) return false;
  if (prev.isConnecting !== next.isConnecting) return false;
  if (prev.connectionStart !== next.connectionStart) return false;
  if (prev.zoom !== next.zoom) return false;
  
  // Arrays - check reference equality (parent should memoize these)
  if (prev.agents !== next.agents) return false;
  if (prev.connectedBlockIds !== next.connectedBlockIds) return false;
  if (prev.allBlocks !== next.allBlocks) return false;
  if (prev.connections !== next.connections) return false;
  
  // Callbacks are assumed stable from parent (useCallback)
  return true;
});

BlockItem.displayName = 'BlockItem';
