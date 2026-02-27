// ============================================
// Canvas Component - Infinite canvas with pan/zoom and bezier connections
// ============================================

import { useRef, useCallback, useState, useEffect, useMemo, memo } from 'react';
import { BlockWrapper } from './BlockWrapper';
import { DocBlock, KanbanBlock, InboxBlock, ChecklistBlock, TableBlock, TextBlock, FolderBlock, ImageBlock, HeadingBlock } from './blocks';
import { BlockService } from '@/services/db';
import { SharedBlockService } from '@/services/boardSharing';
import { ZoomIn, ZoomOut, Maximize, Move, Link2, Unlink, Users, Folder, Grid3X3, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CollaboratorCursors } from './CollaboratorCursors';
import { collaborationService, type PresenceUser } from '@/services/collaboration';
import { useAuthContext } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Block, BlockData, Board, InboxItem, BlockType, Connection, ConnectionType, Agent, FolderItem, BoardPermission } from '@/types';

interface CanvasProps {
  board: Board;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  agents?: Agent[];
  onAgentsChange?: (agents: Agent[]) => void;
  onAddImageBlock?: (x: number, y: number, base64: string, fileName: string) => void;
  permission?: BoardPermission;
  isCollaborative?: boolean;
  isSharedBoard?: boolean;
  boardOwnerId?: string;
  onOnlineUsersChange?: (users: PresenceUser[]) => void;
  isAgentDialogOpen?: boolean;
  onAgentDialogOpenChange?: (open: boolean) => void;
  focusBlockId?: string | null;
  onFocusBlockHandled?: () => void;
  connections?: Connection[];
  onConnectionsChange?: (connections: Connection[]) => void;
}

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

type ConnectionPoint = 'top' | 'right' | 'bottom' | 'left';

interface Point {
  x: number;
  y: number;
}

function getSideCenter(block: Block, side: ConnectionPoint): Point {
  const centerX = block.x + block.w / 2;
  const centerY = block.y + block.h / 2;
  
  switch (side) {
    case 'top': return { x: centerX, y: block.y };
    case 'right': return { x: block.x + block.w, y: centerY };
    case 'bottom': return { x: centerX, y: block.y + block.h };
    case 'left': return { x: block.x, y: centerY };
  }
}

function getConnectionSide(fromBlock: Block, toBlock: Block): { from: ConnectionPoint; to: ConnectionPoint } {
  const fromCenterX = fromBlock.x + fromBlock.w / 2;
  const fromCenterY = fromBlock.y + fromBlock.h / 2;
  const toCenterX = toBlock.x + toBlock.w / 2;
  const toCenterY = toBlock.y + toBlock.h / 2;
  
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  } else {
    return dy > 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
  }
}

function getBezierPath(from: Point, to: Point, fromSide: ConnectionPoint, toSide: ConnectionPoint): string {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const tension = Math.min(Math.max(dx, dy) * 0.5, 150);
  
  let cp1: Point, cp2: Point;
  
  switch (fromSide) {
    case 'top': cp1 = { x: from.x, y: from.y - tension }; break;
    case 'right': cp1 = { x: from.x + tension, y: from.y }; break;
    case 'bottom': cp1 = { x: from.x, y: from.y + tension }; break;
    case 'left': cp1 = { x: from.x - tension, y: from.y }; break;
  }
  
  switch (toSide) {
    case 'top': cp2 = { x: to.x, y: to.y - tension }; break;
    case 'right': cp2 = { x: to.x + tension, y: to.y }; break;
    case 'bottom': cp2 = { x: to.x, y: to.y + tension }; break;
    case 'left': cp2 = { x: to.x - tension, y: to.y }; break;
  }
  
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
}

function getConnectionColor(type: ConnectionType): string {
  switch (type) {
    case 'notify': return '#8b5cf6';
    case 'explains': return '#3b82f6';
    case 'displays': return '#10b981';
    case 'links': return '#6b7280';
    default: return '#6b7280';
  }
}

function getConnectionLabel(type: ConnectionType): string {
  switch (type) {
    case 'notify': return 'notifies';
    case 'explains': return 'explains';
    case 'displays': return 'displays';
    case 'links': return 'links to';
    default: return 'connects';
  }
}

function validateConnection(fromType: BlockType, toType: BlockType): ConnectionType | null {
  if (fromType === 'inbox' && (toType === 'text' || toType === 'doc')) return 'notify';
  if ((fromType === 'text' || fromType === 'doc') && toType === 'kanban') return 'explains';
  if (fromType === 'checklist' && toType === 'kanban') return 'displays';
  return 'links';
}

function getBlockTitle(block: Block): string {
  const title = (block.data as any).title;
  if (title) return title;
  switch (block.type) {
    case 'doc': return 'Untitled Document';
    case 'kanban': return 'Kanban Board';
    case 'inbox': return 'Inbox';
    case 'checklist': return 'Checklist';
    case 'table': return 'Table';
    case 'text': return 'Note';
    case 'folder': return 'Folder';
    case 'image': return 'Image';
    case 'heading': return (block.data as any).content?.slice(0, 30) || 'Heading';
    default: return 'Block';
  }
}

// Convert a block to a folder item
function blockToFolderItem(block: Block): FolderItem {
  const now = new Date().toISOString();
  const data = block.data as any;
  
  let preview = '';
  switch (block.type) {
    case 'doc': preview = data.contentMarkdown?.slice(0, 100) || 'Empty document'; break;
    case 'text': preview = data.content?.slice(0, 100) || 'Empty note'; break;
    case 'kanban': preview = `${data.cards?.length || 0} cards`; break;
    case 'checklist': preview = `${data.items?.length || 0} items`; break;
    case 'table': preview = `${data.rows?.length || 0} rows`; break;
    case 'inbox': preview = `${data.items?.length || 0} items`; break;
    case 'image': preview = data.fileName || 'Image'; break;
    case 'heading': preview = data.content?.slice(0, 100) || 'Empty heading'; break;
    default: preview = '';
  }
  
  return {
    id: crypto.randomUUID(),
    type: block.type as FolderItem['type'],
    title: getBlockTitle(block),
    preview,
    data: block.data,
    createdAt: now,
    updatedAt: now,
  };
}

// Stable fullscreen block view — avoids IIFE remounting on every Canvas re-render.
// Memoized so block content persists (scroll position, internal state) across parent renders.
const FullScreenBlockView = memo(function FullScreenBlockView({
  block,
  onUpdate,
  onClose,
  connections,
  blocks: allBlocks,
  handleCardMoveBetweenBlocks,
  handleConvertToTask,
  handleConvertToDoc,
  selectedBlockId,
  dragOverFolderId,
  draggedBlockId,
  updateDragOverFolderId,
  handleDropOnFolder,
  handleFolderItemDragOut,
}: {
  block: Block;
  onUpdate: (blockId: string, updates: any) => void;
  onClose: () => void;
  connections: any[];
  blocks: Block[];
  handleCardMoveBetweenBlocks: (fromId: string, toId: string, card: any) => void;
  handleConvertToTask: (item: any) => void;
  handleConvertToDoc: (item: any) => void;
  selectedBlockId: string | null;
  dragOverFolderId: string | null;
  draggedBlockId: string | null;
  updateDragOverFolderId: (id: string | null) => void;
  handleDropOnFolder: (folderId: string, blockId: string) => void;
  handleFolderItemDragOut: (folderId: string, item: any, x: number, y: number) => void;
}) {
  const HEADER_H = 44;

  // Stable onUpdate callback bound to this block's ID
  const handleUpdate = useCallback((updates: any) => {
    onUpdate(block.id, updates);
  }, [block.id, onUpdate]);

  const connectedBlockIds = useMemo(() =>
    connections
      .filter(c => c.fromBlockId === block.id || c.toBlockId === block.id)
      .map(c => c.fromBlockId === block.id ? c.toBlockId : c.fromBlockId),
    [connections, block.id]
  );

  const renderContent = () => {
    switch (block.type) {
      case 'doc':
        return <DocBlock data={block.data as any} onUpdate={handleUpdate} />;
      case 'kanban':
        return (
          <KanbanBlock
            data={block.data as any}
            onUpdate={handleUpdate}
            connectedBlocks={connectedBlockIds}
            onCardMoveToBlock={(card, targetBlockId) => handleCardMoveBetweenBlocks(block.id, targetBlockId, card)}
            allBlocks={allBlocks}
          />
        );
      case 'inbox':
        return <InboxBlock data={block.data as any} onUpdate={handleUpdate} onConvertToTask={handleConvertToTask} onConvertToDoc={handleConvertToDoc} />;
      case 'checklist':
        return <ChecklistBlock data={block.data as any} onUpdate={handleUpdate} />;
      case 'table':
        return (
          <TableBlock
            data={block.data as any}
            onUpdate={handleUpdate}
            connectedBlocks={connectedBlockIds}
            onCardMoveToBlock={(card, targetBlockId) => handleCardMoveBetweenBlocks(block.id, targetBlockId, card)}
            allBlocks={allBlocks}
          />
        );
      case 'text':
        return <TextBlock data={block.data as any} onUpdate={handleUpdate} />;
      case 'image':
        return <ImageBlock data={block.data as any} onUpdate={handleUpdate} />;
      case 'heading':
        return <HeadingBlock data={block.data as any} onUpdate={handleUpdate} isSelected={selectedBlockId === block.id} />;
      case 'folder':
        return (
          <FolderBlock
            data={{ ...(block.data as any), id: block.id }}
            onUpdate={handleUpdate}
            isDropTarget={dragOverFolderId === block.id}
            onDragOver={() => draggedBlockId && updateDragOverFolderId(block.id)}
            onDragLeave={() => updateDragOverFolderId(null)}
            onDropBlock={(droppedBlockId) => handleDropOnFolder(block.id, droppedBlockId)}
            onItemDragOut={(item, x, y) => handleFolderItemDragOut(block.id, item, x, y)}
          />
        );
      default:
        return <div className="p-4 text-gray-500">Unknown block type</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      <div style={{ height: HEADER_H }} className="flex items-center justify-between px-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="font-semibold text-gray-800 truncate text-sm">{getBlockTitle(block)}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

export function Canvas({ board, blocks, onBlocksChange, agents = [], onAgentsChange, onAddImageBlock, permission = 'owner', isCollaborative = false, isSharedBoard = false, boardOwnerId, onOnlineUsersChange, isAgentDialogOpen: externalAgentDialogOpen, onAgentDialogOpenChange, focusBlockId, onFocusBlockHandled, connections: externalConnections, onConnectionsChange }: CanvasProps) {
  const { user } = useAuthContext();
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(1);

  // Collaboration state
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; email: string; color: string }>>(new Map());
  const [remoteSelections, setRemoteSelections] = useState<Map<string, { blockId: string; color: string }>>(new Map());
  
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [localConnections, setLocalConnections] = useState<Connection[]>([]);
  const connections = externalConnections ?? localConnections;
  const setConnections = useCallback((updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
    if (typeof updater === 'function') {
      const next = updater(connections);
      if (onConnectionsChange) onConnectionsChange(next);
      else setLocalConnections(next);
    } else {
      if (onConnectionsChange) onConnectionsChange(updater);
      else setLocalConnections(updater);
    }
  }, [connections, onConnectionsChange]);
  
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [connectionLabel, setConnectionLabel] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>('links');
  
  const [localAgentDialogOpen, setLocalAgentDialogOpen] = useState(false);
  const isAgentDialogOpen = externalAgentDialogOpen ?? localAgentDialogOpen;
  const setIsAgentDialogOpen = onAgentDialogOpenChange ?? setLocalAgentDialogOpen;
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentColor, setNewAgentColor] = useState('#3b82f6');
  const [fullScreenBlockId, setFullScreenBlockId] = useState<string | null>(null);
  const fullScreenBlock = useMemo(() => fullScreenBlockId ? blocks.find(b => b.id === fullScreenBlockId) || null : null, [fullScreenBlockId, blocks]);

  // Push/pop browser history so device back button closes fullscreen instead of leaving the page
  const openFullScreen = useCallback((blockId: string) => {
    setFullScreenBlockId(blockId);
    window.history.pushState({ fullscreen: true }, '');
  }, []);
  const closeFullScreen = useCallback(() => {
    setFullScreenBlockId(prev => {
      if (prev !== null) {
        // Only go back if we pushed a state (avoid double-pop)
        try { window.history.back(); } catch {}
      }
      return null;
    });
  }, []);
  useEffect(() => {
    const onPopState = () => {
      // Browser back pressed — close fullscreen without another history.back()
      setFullScreenBlockId(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auto-focus on a block (e.g. after adding a new one)
  useEffect(() => {
    if (!focusBlockId) return;
    const block = blocks.find(b => b.id === focusBlockId);
    if (!block) return;
    const canvas = canvasRef.current;
    const el = transformRef.current;
    if (!canvas || !el) return;

    const rect = canvas.getBoundingClientRect();
    const PADDING = 1.3;
    const zoomToFit = Math.min(rect.width / (block.w * PADDING), rect.height / (block.h * PADDING));
    const targetZoom = Math.max(MIN_ZOOM, Math.min(zoomToFit, 1.5));
    const newPanX = rect.width / 2 - (block.x + block.w / 2) * targetZoom;
    const newPanY = rect.height / 2 - (block.y + block.h / 2) * targetZoom;

    el.animate(
      [
        { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` },
        { transform: `translate(${newPanX}px, ${newPanY}px) scale(${targetZoom})` },
      ],
      { duration: 300, easing: 'ease-out', fill: 'none' }
    );

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
    onFocusBlockHandled?.();
  }, [focusBlockId]);

  // Drag and drop state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dragOverFolderIdRef = useRef<string | null>(null);

  useEffect(() => {
    const max = blocks.reduce((acc, b) => Math.max(acc, b.z || 1), 1);
    setMaxZIndex(max);
  }, [blocks]);

  useEffect(() => {
    const preventZoom = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventZoom);
    document.addEventListener('gesturechange', preventZoom);
    document.addEventListener('gestureend', preventZoom);
    return () => {
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  // Join/leave collaboration channel (only for boards with collaborators)
  useEffect(() => {
    if (!user || !isCollaborative) {
      // Clear any stale state
      setRemoteCursors(new Map());
      setRemoteSelections(new Map());
      onOnlineUsersChange?.([]);
      return;
    }

    collaborationService.join(board.id, user);

    collaborationService.setOnCursorMove((update) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        const existing = next.get(update.userId);
        if (existing) {
          next.set(update.userId, { ...existing, x: update.x, y: update.y });
        }
        return next;
      });
    });

    collaborationService.setOnSelectionChange((update) => {
      setRemoteSelections((prev) => {
        const next = new Map(prev);
        if (update.blockId) {
          const cursor = remoteCursors.get(update.userId);
          next.set(update.userId, { blockId: update.blockId, color: cursor?.color || '#3b82f6' });
        } else {
          next.delete(update.userId);
        }
        return next;
      });
    });

    // Update cursor map and online users when presence changes
    collaborationService.setOnPresenceChange((users) => {
      onOnlineUsersChange?.(users);
      setRemoteCursors((prev) => {
        const next = new Map<string, { x: number; y: number; email: string; color: string }>();
        for (const u of users) {
          const existing = prev.get(u.userId);
          next.set(u.userId, {
            x: existing?.x ?? u.cursorX,
            y: existing?.y ?? u.cursorY,
            email: u.email,
            color: u.color,
          });
        }
        return next;
      });
    });

    return () => {
      collaborationService.leave();
      setRemoteCursors(new Map());
      setRemoteSelections(new Map());
      onOnlineUsersChange?.([]);
    };
  }, [board.id, user, isCollaborative]);

  // Broadcast selection changes (only when collaborative)
  useEffect(() => {
    if (isCollaborative) {
      collaborationService.broadcastSelection(selectedBlockId);
    }
  }, [selectedBlockId, isCollaborative]);

  const isViewOnly = permission === 'viewer';

  const handleBlockUpdate = useCallback(async (blockId: string, updates: Partial<Block>) => {
    if (isSharedBoard) {
      await SharedBlockService.update(blockId, updates);
    } else {
      await BlockService.update(blockId, updates);
    }
    onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
  }, [blocks, onBlocksChange, isSharedBoard]);

  const handleBlockDataUpdate = useCallback(async (blockId: string, dataUpdates: any) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const updatedData = { ...block.data, ...dataUpdates };
    if (isSharedBoard) {
      await SharedBlockService.update(blockId, { data: updatedData });
    } else {
      await BlockService.update(blockId, { data: updatedData });
    }
    onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, data: updatedData } : b));
  }, [blocks, onBlocksChange, isSharedBoard]);

  const handleBlockDuplicate = useCallback(async (blockId: string) => {
    if (isSharedBoard && boardOwnerId) {
      const block = blocks.find(b => b.id === blockId);
      if (!block) return;
      const newBlock = await SharedBlockService.duplicate(block, boardOwnerId);
      onBlocksChange([...blocks, newBlock]);
    } else {
      const newBlock = await BlockService.duplicate(blockId);
      onBlocksChange([...blocks, newBlock]);
    }
  }, [blocks, onBlocksChange, isSharedBoard, boardOwnerId]);

  const handleBlockDelete = useCallback(async (blockId: string) => {
    if (isSharedBoard) {
      await SharedBlockService.delete(blockId);
    } else {
      await BlockService.delete(blockId);
    }
    onBlocksChange(blocks.filter(b => b.id !== blockId));
    setConnections(prev => prev.filter(c => c.fromBlockId !== blockId && c.toBlockId !== blockId));
  }, [blocks, onBlocksChange, isSharedBoard]);

  const handleBringToFront = useCallback(async (blockId: string) => {
    const newZIndex = maxZIndex + 1;
    if (isSharedBoard) {
      await SharedBlockService.update(blockId, { z: newZIndex } as Partial<Block>);
    } else {
      await BlockService.updateZIndex(blockId, newZIndex);
    }
    setMaxZIndex(newZIndex);
    onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, z: newZIndex } : b));
  }, [blocks, maxZIndex, onBlocksChange, isSharedBoard]);

  const getCanvasCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  const zoomAtPoint = useCallback((newZoom: number, centerX: number, centerY: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;
    setZoom(clampedZoom);
    setPan({ x: centerX - worldX * clampedZoom, y: centerY - worldY * clampedZoom });
  }, [pan, zoom]);

  const handleZoomIn = useCallback(() => {
    const center = getCanvasCenter();
    zoomAtPoint(zoom + ZOOM_STEP, center.x, center.y);
  }, [zoom, getCanvasCenter, zoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    const center = getCanvasCenter();
    zoomAtPoint(zoom - ZOOM_STEP, center.x, center.y);
  }, [zoom, getCanvasCenter, zoomAtPoint]);

  const handleResetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleBlockDoubleTap = useCallback((blockId: string) => {
    if (isMobile) {
      openFullScreen(blockId);
      return;
    }
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const canvas = canvasRef.current;
    const el = transformRef.current;
    if (!canvas || !el) return;
    const rect = canvas.getBoundingClientRect();
    const PADDING = 1.3;
    const zoomToFit = Math.min(rect.width / (block.w * PADDING), rect.height / (block.h * PADDING));
    const targetZoom = Math.max(MIN_ZOOM, Math.min(zoomToFit, 1.5));
    const newPanX = rect.width / 2 - (block.x + block.w / 2) * targetZoom;
    const newPanY = rect.height / 2 - (block.y + block.h / 2) * targetZoom;

    // Animate from current to target using Web Animations API (won't interfere with pinch zoom)
    const fromTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    const toTransform = `translate(${newPanX}px, ${newPanY}px) scale(${targetZoom})`;
    el.animate(
      [{ transform: fromTransform }, { transform: toTransform }],
      { duration: 300, easing: 'ease-out', fill: 'none' }
    );

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [blocks, pan, zoom, isMobile]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) zoomAtPoint(zoom + delta, e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [zoom, zoomAtPoint]);

  const getPinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY });
    setPanStartPos({ ...pan });
  }, [pan]);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    setPan({ x: panStartPos.x + (clientX - panStart.x), y: panStartPos.y + (clientY - panStart.y) });
  }, [isPanning, panStart, panStartPos]);

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan when clicking anywhere that isn't inside a block or controls
    const target = e.target as HTMLElement;
    if (target.closest('.block-wrapper') || target.closest('.canvas-controls')) return;
    if (e.button === 0 || e.button === 1) {
      setSelectedBlockId(null);
      handlePanStart(e.clientX, e.clientY);
    }
  }, [handlePanStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handlePanMove(e.clientX, e.clientY);
    // Broadcast cursor position for collaboration (only when collaborative)
    if (isCollaborative) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;
        collaborationService.broadcastCursor(canvasX, canvasY);
      }
    }
  }, [handlePanMove, pan, zoom, isCollaborative]);
  const handleMouseUp = useCallback(() => handlePanEnd(), [handlePanEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-controls') || target.closest('.canvas-sidebar')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 2) {
      setInitialPinchDistance(getPinchDistance(e.touches));
      setInitialZoom(zoom);
      setPinchCenter({ 
        x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
        y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top 
      });
      e.preventDefault();
    } else if (e.touches.length === 1) {
      const touchTarget = e.target as HTMLElement;
      if (!touchTarget.closest('.block-wrapper')) {
        setSelectedBlockId(null);
        handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
  }, [handlePanStart, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance > 0) {
      const scale = getPinchDistance(e.touches) / initialPinchDistance;
      zoomAtPoint(initialZoom * scale, pinchCenter.x, pinchCenter.y);
      e.preventDefault();
    } else if (e.touches.length === 1) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePanMove, initialPinchDistance, initialZoom, pinchCenter, zoomAtPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) setInitialPinchDistance(0);
    handlePanEnd();
  }, [handlePanEnd]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { 
      x: (screenX - rect.left - pan.x) / zoom, 
      y: (screenY - rect.top - pan.y) / zoom 
    };
  }, [pan, zoom]);

  const handleStartConnection = useCallback((blockId: string) => {
    if (!isConnecting) {
      setIsConnecting(true);
      setConnectionStart(blockId);
    } else if (connectionStart && connectionStart !== blockId) {
      const fromBlock = blocks.find(b => b.id === connectionStart);
      const toBlock = blocks.find(b => b.id === blockId);
      if (fromBlock && toBlock) {
        const connType = validateConnection(fromBlock.type, toBlock.type);
        if (connType) {
          setConnections(prev => [...prev, {
            id: crypto.randomUUID(),
            fromBlockId: connectionStart,
            toBlockId: blockId,
            fromType: fromBlock.type,
            toType: toBlock.type,
            type: connType,
            createdAt: new Date().toISOString(),
          }]);
        }
      }
      setIsConnecting(false);
      setConnectionStart(null);
    }
  }, [isConnecting, connectionStart, blocks]);

  const handleCancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionStart(null);
  }, []);

  const handleConnectionDoubleClick = useCallback((conn: Connection) => {
    setEditingConnection(conn);
    setConnectionLabel(conn.label || '');
    setConnectionType(conn.type);
  }, []);

  const handleSaveConnection = useCallback(() => {
    if (!editingConnection) return;
    setConnections(prev => prev.map(c => 
      c.id === editingConnection.id 
        ? { ...c, label: connectionLabel || undefined, type: connectionType }
        : c
    ));
    setEditingConnection(null);
  }, [editingConnection, connectionLabel, connectionType]);

  const handleDeleteConnection = useCallback(() => {
    if (!editingConnection) return;
    setConnections(prev => prev.filter(c => c.id !== editingConnection.id));
    setEditingConnection(null);
  }, [editingConnection]);

  const handleAddAgent = useCallback(() => {
    if (!newAgentName.trim() || !onAgentsChange) return;
    onAgentsChange([...agents, {
      id: crypto.randomUUID(),
      name: newAgentName.trim(),
      color: newAgentColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
    setNewAgentName('');
  }, [newAgentName, newAgentColor, agents, onAgentsChange]);

  const handleRemoveAgent = useCallback((agentId: string) => {
    if (!onAgentsChange) return;
    onAgentsChange(agents.filter(a => a.id !== agentId));
    blocks.forEach(block => {
      if (block.agentAccess?.includes(agentId)) {
        handleBlockUpdate(block.id, { agentAccess: block.agentAccess.filter(id => id !== agentId) });
      }
    });
  }, [agents, blocks, onAgentsChange, handleBlockUpdate]);

  const toggleAgentAccess = useCallback((blockId: string, agentId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const currentAccess = block.agentAccess || [];
    handleBlockUpdate(blockId, { 
      agentAccess: currentAccess.includes(agentId) 
        ? currentAccess.filter(id => id !== agentId)
        : [...currentAccess, agentId]
    });
  }, [blocks, handleBlockUpdate]);

  // Handle block drag start
  const handleBlockDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
  }, []);

  // Helper to set both state and ref for dragOverFolderId
  const updateDragOverFolderId = useCallback((id: string | null) => {
    dragOverFolderIdRef.current = id;
    setDragOverFolderId(id);
  }, []);

  // Handle mouse-based drag move — hit-test folders for visual feedback
  const handleBlockDragMove = useCallback((screenX: number, screenY: number) => {
    const canvasPos = screenToCanvas(screenX, screenY);
    const hoveredFolder = blocks.find(
      (b) =>
        b.type === 'folder' &&
        b.id !== draggedBlockId &&
        canvasPos.x >= b.x &&
        canvasPos.x <= b.x + b.w &&
        canvasPos.y >= b.y &&
        canvasPos.y <= b.y + b.h
    );
    updateDragOverFolderId(hoveredFolder?.id || null);
  }, [blocks, draggedBlockId, screenToCanvas, updateDragOverFolderId]);

  // Handle dropping a block onto a folder
  // Combines folder update + block delete in a single state update to avoid race conditions
  const handleDropOnFolder = useCallback(async (folderId: string, droppedBlockId: string) => {
    const draggedBlock = blocks.find(b => b.id === droppedBlockId);
    const folderBlock = blocks.find(b => b.id === folderId);

    if (draggedBlock && folderBlock && draggedBlock.id !== folderBlock.id) {
      const folderItem = blockToFolderItem(draggedBlock);
      const folderData = folderBlock.data as { items?: FolderItem[] };
      const updatedFolderData = { ...folderBlock.data, items: [...(folderData.items || []), folderItem] } as BlockData;

      // Persist both changes
      await BlockService.update(folderId, { data: updatedFolderData });
      await BlockService.delete(droppedBlockId);

      // Single state update: update folder data AND remove dragged block
      onBlocksChange(
        blocks
          .map(b => b.id === folderId ? { ...b, data: updatedFolderData } : b)
          .filter(b => b.id !== droppedBlockId)
      );
    }

    setDraggedBlockId(null);
    updateDragOverFolderId(null);
  }, [blocks, onBlocksChange, updateDragOverFolderId]);

  // Handle mouse-based drag end — drop onto folder if hovering one
  const handleBlockDragEnd = useCallback((blockId: string, screenX?: number, screenY?: number) => {
    const folderId = dragOverFolderIdRef.current;
    if (folderId && screenX != null && screenY != null) {
      handleDropOnFolder(folderId, blockId);
    } else {
      setDraggedBlockId(null);
      updateDragOverFolderId(null);
    }
  }, [handleDropOnFolder, updateDragOverFolderId]);

  // Handle dragging folder item out to create a block
  // Combines block creation + folder item removal in a single state update
  const handleFolderItemDragOut = useCallback(async (folderId: string, item: FolderItem, screenX: number, screenY: number) => {
    const canvasPos = screenToCanvas(screenX, screenY);
    const defaultSizes: Record<string, { w: number; h: number }> = {
      doc: { w: 400, h: 500 },
      kanban: { w: 800, h: 500 },
      inbox: { w: 400, h: 500 },
      checklist: { w: 350, h: 400 },
      table: { w: 600, h: 400 },
      text: { w: 300, h: 150 },
    };
    const size = defaultSizes[item.type] || { w: 300, h: 200 };

    const newBlock = await BlockService.create({
      id: crypto.randomUUID(),
      boardId: board.id,
      type: item.type as BlockType,
      x: canvasPos.x - size.w / 2,
      y: canvasPos.y - size.h / 2,
      w: size.w,
      h: size.h,
      z: maxZIndex + 1,
      data: item.data as any,
    });

    setMaxZIndex(prev => prev + 1);

    // Build updated blocks in one pass: remove item from folder + add new block
    const folderBlock = blocks.find(b => b.id === folderId);
    let updatedBlocks = blocks;
    if (folderBlock) {
      const folderData = folderBlock.data as { items?: FolderItem[] };
      const updatedFolderData = {
        ...folderBlock.data,
        items: (folderData.items || []).filter((i: FolderItem) => i.id !== item.id),
      } as BlockData;
      await BlockService.update(folderId, { data: updatedFolderData });
      updatedBlocks = blocks.map(b => b.id === folderId ? { ...b, data: updatedFolderData } : b);
    }

    onBlocksChange([...updatedBlocks, newBlock]);
  }, [board.id, blocks, maxZIndex, onBlocksChange, screenToCanvas]);

  // Handle canvas drop for folder items dragged out, blocks dropped on folders, and image file drops
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    // Check for image file drops from filesystem
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0 && onAddImageBlock) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        imageFiles.forEach((file, idx) => {
          const reader = new FileReader();
          reader.onload = () => {
            onAddImageBlock(canvasPos.x + idx * 30, canvasPos.y + idx * 30, reader.result as string, file.name);
          };
          reader.readAsDataURL(file);
        });
        setDraggedBlockId(null);
        updateDragOverFolderId(null);
        return;
      }
    }

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');

      if (dragData.source === 'block' && dragData.blockId && dragOverFolderId) {
        // Block dropped onto a folder — convert to folder item
        if (dragData.blockId !== dragOverFolderId) {
          handleDropOnFolder(dragOverFolderId, dragData.blockId);
        }
      } else if (dragData.source === 'folderItem' && dragData.folderItem && dragData.folderId) {
        // Folder item dragged out onto the canvas
        handleFolderItemDragOut(dragData.folderId, dragData.folderItem, e.clientX, e.clientY);
      }
    } catch (err) {
      console.error('Canvas drop error:', err);
    }

    setDraggedBlockId(null);
    updateDragOverFolderId(null);
  }, [handleFolderItemDragOut, handleDropOnFolder, dragOverFolderId, updateDragOverFolderId, onAddImageBlock, screenToCanvas]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Use 'copy' for file drops, 'move' for internal drags
    const hasFiles = e.dataTransfer.types.includes('Files');
    e.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move';

    // Hit-test folder blocks to show drop target feedback
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const hoveredFolder = blocks.find(
      (b) =>
        b.type === 'folder' &&
        canvasPos.x >= b.x &&
        canvasPos.x <= b.x + b.w &&
        canvasPos.y >= b.y &&
        canvasPos.y <= b.y + b.h
    );
    const newFolderId = hoveredFolder?.id || null;
    if (newFolderId !== dragOverFolderId) {
      updateDragOverFolderId(newFolderId);
    }
  }, [blocks, screenToCanvas, dragOverFolderId, updateDragOverFolderId]);

  const handleConvertToTask = useCallback(async (item: InboxItem) => {
    const kanbanBlock = blocks.find(b => b.type === 'kanban');
    if (!kanbanBlock) {
      alert('No Kanban block found. Please create one first.');
      return;
    }
    const kanbanData = kanbanBlock.data as { columns: any[]; cards: any[] };
    const firstColumn = kanbanData.columns.sort((a, b) => a.order - b.order)[0];
    if (!firstColumn) {
      alert('No columns found in Kanban block.');
      return;
    }
    const now = new Date().toISOString();
    await handleBlockDataUpdate(kanbanBlock.id, {
      cards: [...kanbanData.cards, {
        id: crypto.randomUUID(),
        columnId: firstColumn.id,
        title: item.title,
        descriptionMarkdown: item.bodyMarkdown,
        priority: 'P2',
        labels: ['from-inbox'],
        createdAt: now,
        updatedAt: now,
      }]
    });
  }, [blocks, handleBlockDataUpdate]);

  const handleConvertToDoc = useCallback(async (item: InboxItem) => {
    const centerPos = screenToCanvas(
      (canvasRef.current?.clientWidth || 0) / 2,
      (canvasRef.current?.clientHeight || 0) / 2
    );
    const newBlock = await BlockService.create({
      id: crypto.randomUUID(),
      boardId: board.id,
      type: 'doc',
      x: centerPos.x - 200,
      y: centerPos.y - 250,
      w: 400,
      h: 500,
      z: maxZIndex + 1,
      data: { title: item.title, contentMarkdown: item.bodyMarkdown, tags: ['from-inbox'] },
    });
    setMaxZIndex(maxZIndex + 1);
    onBlocksChange([...blocks, newBlock]);
  }, [board.id, blocks, maxZIndex, onBlocksChange, screenToCanvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === transformRef.current) {
      setSelectedBlockId(null);
      if (isConnecting) handleCancelConnection();
    }
  }, [isConnecting, handleCancelConnection]);

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    handleBringToFront(blockId);
  }, [handleBringToFront]);

  const handleCardMoveBetweenBlocks = useCallback(async (fromBlockId: string, toBlockId: string, card: any) => {
    const fromBlock = blocks.find(b => b.id === fromBlockId);
    const toBlock = blocks.find(b => b.id === toBlockId);
    if (!fromBlock || !toBlock) return;

    if (fromBlock.type === 'kanban') {
      const fromData = fromBlock.data as { cards: any[] };
      await handleBlockDataUpdate(fromBlockId, { cards: fromData.cards.filter(c => c.id !== card.id) });
    } else if (fromBlock.type === 'table') {
      const fromData = fromBlock.data as { rows: any[] };
      await handleBlockDataUpdate(fromBlockId, { rows: fromData.rows.filter(r => r.id !== card.id) });
    }

    if (toBlock.type === 'kanban') {
      const toData = toBlock.data as { columns: any[], cards: any[] };
      const firstColumn = toData.columns.sort((a, b) => a.order - b.order)[0];
      if (firstColumn) {
        await handleBlockDataUpdate(toBlockId, {
          cards: [...toData.cards, { ...card, columnId: firstColumn.id, updatedAt: new Date().toISOString() }]
        });
      }
    } else if (toBlock.type === 'table') {
      const toData = toBlock.data as { columns: any[], rows: any[] };
      const newRow: { id: string; cells: Record<string, any> } = { id: card.id, cells: {} };
      toData.columns.forEach((col: any) => {
        newRow.cells[col.id] = col.type === 'checkbox' ? false : (card.title || '');
      });
      await handleBlockDataUpdate(toBlockId, { rows: [...toData.rows, newRow] });
    }
  }, [blocks, handleBlockDataUpdate]);

  const renderBlockContent = (block: Block) => {
    switch (block.type) {
      case 'doc':
        return <DocBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} />;
      case 'kanban':
        return (
          <KanbanBlock
            data={block.data as any}
            onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)}
            connectedBlocks={connections.filter(c => c.fromBlockId === block.id || c.toBlockId === block.id).map(c => c.fromBlockId === block.id ? c.toBlockId : c.fromBlockId)}
            onCardMoveToBlock={(card, targetBlockId) => handleCardMoveBetweenBlocks(block.id, targetBlockId, card)}
            allBlocks={blocks}
          />
        );
      case 'inbox':
        return <InboxBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} onConvertToTask={handleConvertToTask} onConvertToDoc={handleConvertToDoc} />;
      case 'checklist':
        return <ChecklistBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} />;
      case 'table':
        return (
          <TableBlock
            data={block.data as any}
            onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)}
            connectedBlocks={connections.filter(c => c.fromBlockId === block.id || c.toBlockId === block.id).map(c => c.fromBlockId === block.id ? c.toBlockId : c.fromBlockId)}
            onCardMoveToBlock={(card, targetBlockId) => handleCardMoveBetweenBlocks(block.id, targetBlockId, card)}
            allBlocks={blocks}
          />
        );
      case 'text':
        return <TextBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} />;
      case 'image':
        return <ImageBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} />;
      case 'heading':
        return <HeadingBlock data={block.data as any} onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)} isSelected={selectedBlockId === block.id} />;
      case 'folder':
        return (
          <FolderBlock
            data={{ ...(block.data as any), id: block.id }}
            onUpdate={(updates) => handleBlockDataUpdate(block.id, updates)}
            isDropTarget={dragOverFolderId === block.id}
            onDragOver={() => draggedBlockId && updateDragOverFolderId(block.id)}
            onDragLeave={() => updateDragOverFolderId(null)}
            onDropBlock={(droppedBlockId) => handleDropOnFolder(block.id, droppedBlockId)}
            onItemDragOut={(item, x, y) => handleFolderItemDragOut(block.id, item, x, y)}
          />
        );
      default:
        return <div className="p-4 text-gray-500">Unknown block type</div>;
    }
  };

  const handleTitleChange = (blockId: string, newTitle: string) => {
    handleBlockDataUpdate(blockId, { title: newTitle });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <div
        ref={canvasRef}
        className={`absolute inset-0 overflow-hidden ${isPanning ? 'cursor-grabbing' : isConnecting ? 'cursor-crosshair' : draggedBlockId ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          touchAction: 'none',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
      >
        <div
          ref={transformRef}
          className="absolute inset-0"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}
        >
          <svg className="absolute" style={{ width: '100%', height: '100%', left: 0, top: 0, overflow: 'visible' }}>
            <defs>
              {(['notify', 'explains', 'displays', 'links'] as ConnectionType[]).map((type) => (
                <marker key={type} id={`arrowhead-${type}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={getConnectionColor(type)} />
                </marker>
              ))}
            </defs>
            {connections.map((conn) => {
              const fromBlock = blocks.find(b => b.id === conn.fromBlockId);
              const toBlock = blocks.find(b => b.id === conn.toBlockId);
              if (!fromBlock || !toBlock) return null;
              const { from: fromSide, to: toSide } = getConnectionSide(fromBlock, toBlock);
              const fromPoint = getSideCenter(fromBlock, fromSide);
              const toPoint = getSideCenter(toBlock, toSide);
              const path = getBezierPath(fromPoint, toPoint, fromSide, toSide);
              const color = getConnectionColor(conn.type);
              const midX = (fromPoint.x + toPoint.x) / 2;
              const midY = (fromPoint.y + toPoint.y) / 2;
              
              return (
                <g key={conn.id}>
                  <path d={path} stroke="transparent" strokeWidth="20" fill="none" style={{ cursor: 'pointer' }} onDoubleClick={() => handleConnectionDoubleClick(conn)} />
                  <path d={path} stroke={color} strokeWidth="2" fill="none" markerEnd={`url(#arrowhead-${conn.type})`} className="hover:stroke-[3px] transition-all" style={{ pointerEvents: 'none' }} />
                  {(conn.label || getConnectionLabel(conn.type)) && (
                    <g>
                      <rect x={midX - 32} y={midY - 11} width="64" height="22" rx="4" fill="white" stroke={color} strokeWidth="1" />
                      <text x={midX} y={midY + 4} fontSize="10" fill={color} fontWeight="500" textAnchor="middle">
                        {conn.label || getConnectionLabel(conn.type)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {blocks.map((block) => (
            <BlockWrapper
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => handleBlockSelect(block.id)}
              onUpdate={isViewOnly ? () => {} : (updates) => handleBlockUpdate(block.id, updates)}
              onDuplicate={isViewOnly ? () => {} : () => handleBlockDuplicate(block.id)}
              onDelete={isViewOnly ? () => {} : () => handleBlockDelete(block.id)}
              onBringToFront={() => handleBringToFront(block.id)}
              title={getBlockTitle(block)}
              onTitleChange={isViewOnly ? undefined : (title) => handleTitleChange(block.id, title)}
              zoom={zoom}
              isConnecting={isConnecting}
              connectionStart={connectionStart}
              onStartConnection={() => handleStartConnection(block.id)}
              agents={agents}
              onToggleAgentAccess={isViewOnly ? undefined : (agentId) => toggleAgentAccess(block.id, agentId)}
              onDragStart={isViewOnly ? undefined : () => handleBlockDragStart(block.id)}
              onDragEnd={isViewOnly ? undefined : (screenX, screenY) => handleBlockDragEnd(block.id, screenX, screenY)}
              onDragMove={isViewOnly ? undefined : handleBlockDragMove}
              headerActions={block.type === 'folder' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    const folderData = block.data as any;
                    const newMode = (folderData.viewMode || 'grid') === 'grid' ? 'list' : 'grid';
                    handleBlockDataUpdate(block.id, { viewMode: newMode });
                  }}
                >
                  {((block.data as any).viewMode || 'grid') === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </Button>
              ) : undefined}
              onDoubleTap={() => handleBlockDoubleTap(block.id)}
            >
              {renderBlockContent(block)}
            </BlockWrapper>
          ))}

          {/* Remote collaborator cursors */}
          <CollaboratorCursors
            cursors={Array.from(remoteCursors.entries()).map(([userId, data]) => ({
              userId,
              email: data.email,
              color: data.color,
              x: data.x,
              y: data.y,
            }))}
            selections={Array.from(remoteSelections.entries()).map(([userId, data]) => ({
              userId,
              color: data.color,
              blockId: data.blockId,
            }))}
            blocks={blocks}
          />
        </div>
      </div>

      {!isMobile && (
        <>
          <div className="canvas-controls absolute bottom-4 right-4 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-2 z-50">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="text-center text-xs font-semibold text-gray-700 py-1">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100" onClick={handleResetZoom} title="Reset view">
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          <div className="canvas-controls absolute top-4 right-4 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-2 z-50">
            <Button variant={isConnecting ? "default" : "ghost"} size="sm" className="gap-2" onClick={() => isConnecting ? handleCancelConnection() : setIsConnecting(true)}>
              {isConnecting ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {isConnecting ? 'Cancel' : 'Connect'}
            </Button>
            {isConnecting && <div className="text-xs text-gray-500 text-center px-2">Click two blocks</div>}
            {connections.length > 0 && !isConnecting && <div className="text-xs text-gray-500 text-center border-t pt-2 px-2">{connections.length} connection{connections.length !== 1 ? 's' : ''}</div>}
          </div>

          <div className="canvas-controls absolute top-4 left-4 flex flex-col gap-2 z-50">
            <Button variant="ghost" size="sm" className="gap-2 bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200" onClick={() => setIsAgentDialogOpen(true)}>
              <Users className="w-4 h-4" />
              Agents ({agents.length})
            </Button>
          </div>

          {connections.length > 0 && (
            <div className="canvas-controls absolute top-16 left-4 flex flex-col gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 z-50">
              <div className="text-xs font-semibold text-gray-500 mb-1">Connection Types</div>
              {(['notify', 'explains', 'displays', 'links'] as ConnectionType[]).map((type) => {
                const count = connections.filter(c => c.type === type).length;
                if (count === 0) return null;
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getConnectionColor(type) }} />
                    <span className="text-gray-600 capitalize">{getConnectionLabel(type)}</span>
                    <span className="text-gray-400">({count})</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="canvas-controls absolute bottom-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-2.5 text-xs text-gray-500 z-50">
            <Move className="w-4 h-4" />
            <span>Drag to pan · Pinch to zoom · Ctrl+Scroll to zoom</span>
          </div>
        </>
      )}

      {/* Mobile full-screen block view */}
      {fullScreenBlock && (
        <FullScreenBlockView
          key={fullScreenBlock.id}
          block={fullScreenBlock}
          onUpdate={handleBlockDataUpdate}
          onClose={closeFullScreen}
          connections={connections}
          blocks={blocks}
          handleCardMoveBetweenBlocks={handleCardMoveBetweenBlocks}
          handleConvertToTask={handleConvertToTask}
          handleConvertToDoc={handleConvertToDoc}
          selectedBlockId={selectedBlockId}
          dragOverFolderId={dragOverFolderId}
          draggedBlockId={draggedBlockId}
          updateDragOverFolderId={updateDragOverFolderId}
          handleDropOnFolder={handleDropOnFolder}
          handleFolderItemDragOut={handleFolderItemDragOut}
        />
      )}

      <Dialog open={!!editingConnection} onOpenChange={() => setEditingConnection(null)}>
        <DialogContent className="max-w-md" onPointerDownOutside={() => setEditingConnection(null)}>
          <DialogHeader><DialogTitle>Connection Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="conn-type">Connection Type</Label>
              <Select value={connectionType} onValueChange={(v) => setConnectionType(v as ConnectionType)}>
                <SelectTrigger id="conn-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">Notify (Inbox → Text/Doc)</SelectItem>
                  <SelectItem value="explains">Explains (Text/Doc → Kanban)</SelectItem>
                  <SelectItem value="displays">Displays (Checklist → Kanban)</SelectItem>
                  <SelectItem value="links">Generic Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="conn-label">Custom Label (optional)</Label>
              <Input id="conn-label" value={connectionLabel} onChange={(e) => setConnectionLabel(e.target.value)} placeholder={getConnectionLabel(connectionType)} />
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="destructive" onClick={handleDeleteConnection}>Delete Connection</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingConnection(null)}>Cancel</Button>
                <Button onClick={handleSaveConnection}>Save</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className="max-w-lg" onPointerDownOutside={() => setIsAgentDialogOpen(false)}>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Folder className="w-5 h-5" />Agent Management</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="New agent name..." onKeyDown={(e) => { if (e.key === 'Enter') handleAddAgent(); }} />
              <input type="color" value={newAgentColor} onChange={(e) => setNewAgentColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <Button onClick={handleAddAgent}>Add</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No agents configured.</p>}
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: agent.color }}>
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-gray-500">{blocks.filter(b => b.agentAccess?.includes(agent.id)).length} blocks</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleRemoveAgent(agent.id)}>Remove</Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
