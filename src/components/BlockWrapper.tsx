// ============================================
// Draggable & Resizable Block Wrapper
// Blocks scale with zoom - everything is proportional
// ============================================

import { useState, useCallback, useRef } from 'react';
import { 
  GripVertical, 
  Copy, 
  Trash2, 
  Lock, 
  Unlock,
  MoreVertical,
  Settings2,
  Link2,
  Maximize2,
  Bot,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Block, Agent } from '@/types';

interface BlockWrapperProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  children: React.ReactNode;
  title?: string;
  onTitleChange?: (title: string) => void;
  headerActions?: React.ReactNode;
  zoom?: number;
  isConnecting?: boolean;
  connectionStart?: string | null;
  onStartConnection?: () => void;
  agents?: Agent[];
  onToggleAgentAccess?: (agentId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function BlockWrapper({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onBringToFront,
  children,
  title,
  onTitleChange,
  headerActions,
  zoom = 1,
  isConnecting = false,
  connectionStart,
  onStartConnection,
  agents = [],
  onToggleAgentAccess,
  onDragStart,
  onDragEnd,
}: BlockWrapperProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; blockW: number; blockH: number } | null>(null);

  const isConnectionTarget = isConnecting && connectionStart && connectionStart !== block.id;
  const isConnectionSource = isConnecting && connectionStart === block.id;
  
  // Get agents that have access to this block
  const blockAgentAccess = block.agentAccess || [];
  const hasAgentAccess = blockAgentAccess.length > 0;

  const handleTitleSubmit = useCallback(() => {
    if (onTitleChange && editTitle.trim()) {
      onTitleChange(editTitle.trim());
    }
    setIsEditingTitle(false);
  }, [editTitle, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSubmit();
      } else if (e.key === 'Escape') {
        setEditTitle(title || '');
        setIsEditingTitle(false);
      }
    },
    [handleTitleSubmit, title]
  );

  const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (block.locked || isConnecting) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      blockX: block.x,
      blockY: block.y,
    };
    
    setIsDragging(true);
    onSelect();
    
    const handleMove = (moveE: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      
      const moveClientX = 'touches' in moveE ? moveE.touches[0].clientX : moveE.clientX;
      const moveClientY = 'touches' in moveE ? moveE.touches[0].clientY : moveE.clientY;
      
      // Account for zoom in drag calculation
      const dx = (moveClientX - dragRef.current.startX) / zoom;
      const dy = (moveClientY - dragRef.current.startY) / zoom;
      
      onUpdate({
        x: dragRef.current.blockX + dx,
        y: dragRef.current.blockY + dy,
      });
    };
    
    const handleUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    
    e.preventDefault();
    e.stopPropagation();
  }, [block.locked, isConnecting, block.x, block.y, zoom, onSelect, onUpdate]);

  // HTML5 Drag handlers for cross-component drag and drop
  const handleHtmlDragStart = (e: React.DragEvent) => {
    if (block.locked || isConnecting) {
      e.preventDefault();
      return;
    }
    onDragStart?.();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      source: 'block',
      blockId: block.id,
      blockType: block.type,
    }));
  };

  const handleHtmlDragEnd = () => {
    onDragEnd?.();
  };

  const startResize = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (block.locked || isConnecting) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      blockW: block.w,
      blockH: block.h,
    };
    
    setIsResizing(true);
    
    const handleMove = (moveE: MouseEvent | TouchEvent) => {
      if (!resizeRef.current) return;
      
      const moveClientX = 'touches' in moveE ? moveE.touches[0].clientX : moveE.clientX;
      const moveClientY = 'touches' in moveE ? moveE.touches[0].clientY : moveE.clientY;
      
      // Account for zoom in resize calculation
      const dx = (moveClientX - resizeRef.current.startX) / zoom;
      const dy = (moveClientY - resizeRef.current.startY) / zoom;
      
      onUpdate({
        w: Math.max(200, resizeRef.current.blockW + dx),
        h: Math.max(150, resizeRef.current.blockH + dy),
      });
    };
    
    const handleUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    
    e.preventDefault();
    e.stopPropagation();
  }, [block.locked, isConnecting, block.w, block.h, zoom, onUpdate]);

  // Mobile menu content
  const MobileMenuContent = (
    <div className="space-y-2 py-4">
      {onStartConnection && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            onStartConnection();
            setIsMenuOpen(false);
          }}
        >
          <Link2 className="w-4 h-4" />
          Connect to...
        </Button>
      )}
      
      {/* Agent Access - Mobile */}
      {agents.length > 0 && onToggleAgentAccess && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 pt-2">
            Agent Access
          </div>
          {agents.map(agent => (
            <Button
              key={agent.id}
              variant="outline"
              className={`w-full justify-start gap-2 ${blockAgentAccess.includes(agent.id) ? 'bg-blue-50 border-blue-200' : ''}`}
              onClick={() => {
                onToggleAgentAccess(agent.id);
              }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              {agent.name}
              {blockAgentAccess.includes(agent.id) && <Check className="w-3 h-3 ml-auto" />}
            </Button>
          ))}
          <div className="border-t my-2" />
        </>
      )}
      
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => {
          onBringToFront();
          setIsMenuOpen(false);
        }}
      >
        <Settings2 className="w-4 h-4" />
        Bring to Front
      </Button>
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => {
          onUpdate({ locked: !block.locked });
          setIsMenuOpen(false);
        }}
      >
        {block.locked ? (
          <>
            <Unlock className="w-4 h-4" />
            Unlock
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Lock
          </>
        )}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => {
          onDuplicate();
          setIsMenuOpen(false);
        }}
      >
        <Copy className="w-4 h-4" />
        Duplicate
      </Button>
      <Button
        variant="destructive"
        className="w-full justify-start gap-2"
        onClick={() => {
          onDelete();
          setIsMenuOpen(false);
        }}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>
    </div>
  );

  return (
    <div
      draggable={!block.locked && !isConnecting}
      onDragStart={handleHtmlDragStart}
      onDragEnd={handleHtmlDragEnd}
      className={`
        absolute rounded-xl overflow-hidden transition-shadow duration-200
        ${isSelected 
          ? 'ring-2 ring-blue-500 shadow-2xl' 
          : 'shadow-lg hover:shadow-xl'
        }
        ${block.locked ? 'opacity-90' : ''}
        ${isConnectionTarget ? 'ring-2 ring-green-400 ring-dashed cursor-pointer' : ''}
        ${isConnectionSource ? 'ring-2 ring-blue-400' : ''}
        ${isConnecting && !isConnectionTarget && !isConnectionSource ? 'opacity-50' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      style={{
        // Position and size are in world coordinates - they scale with zoom
        left: block.x,
        top: block.y,
        width: block.w,
        height: block.h,
        zIndex: isSelected ? (block.z || 1) + 1000 : (block.z || 1),
        background: 'white',
        border: isSelected ? 'none' : '1px solid #e5e7eb',
        willChange: isDragging || isResizing ? 'transform' : 'auto',
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.block-header')) {
          startDrag(e);
        }
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('.block-header')) {
          startDrag(e);
        }
      }}
    >
      {/* Connection indicator */}
      {isConnectionSource && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-pulse z-10" />
      )}
      {isConnectionTarget && (
        <div 
          className="absolute inset-0 bg-green-50/50 cursor-pointer z-0"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection?.();
          }}
        />
      )}

      {/* Header */}
      <div
        className={`
          block-header flex items-center gap-2 px-3 py-2.5 
          border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white
          ${block.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        `}
      >
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-50" />

        {/* Agent Color Indicators - Modern UI */}
        {hasAgentAccess && (
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {blockAgentAccess.slice(0, 2).map((agentId) => {
                const agent = agents.find(a => a.id === agentId);
                if (!agent) return null;
                return (
                  <Tooltip key={agentId}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-3 h-3 rounded-full border border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: agent.color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{agent.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {blockAgentAccess.length > 2 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-3 h-3 rounded-full bg-gray-300 border border-white shadow-sm flex items-center justify-center text-[6px] font-bold text-gray-600 cursor-pointer hover:scale-110 transition-transform">
                      +{blockAgentAccess.length - 2}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-1">
                      {blockAgentAccess.slice(2).map(agentId => {
                        const agent = agents.find(a => a.id === agentId);
                        return agent ? <p key={agentId}>{agent.name}</p> : null;
                      })}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditingTitle && onTitleChange ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="w-full px-2 py-1 text-sm font-medium bg-white border border-blue-400 rounded-md outline-none shadow-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                if (onTitleChange && !block.locked) {
                  setIsEditingTitle(true);
                  setEditTitle(title || '');
                }
              }}
              className={`
                w-full text-left text-sm font-semibold text-gray-800 truncate
                ${onTitleChange && !block.locked ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'}
              `}
            >
              {title || 'Untitled'}
            </button>
          )}
        </div>

        {/* Header Actions */}
        {headerActions && <div className="flex items-center gap-1">{headerActions}</div>}

        {/* Lock Indicator */}
        {block.locked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}

        {/* Connect Button */}
        {onStartConnection && !isConnecting && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection();
            }}
          >
            <Link2 className="w-4 h-4 text-gray-500" />
          </Button>
        )}

        {/* Desktop Menu */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-gray-200">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {onStartConnection && (
                <>
                  <DropdownMenuItem onClick={onStartConnection}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect to...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Agent Access Submenu */}
              {agents.length > 0 && onToggleAgentAccess && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Bot className="w-4 h-4 mr-2" />
                      Agent Access
                      {hasAgentAccess && (
                        <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          {blockAgentAccess.length}
                        </span>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      {agents.map(agent => (
                        <DropdownMenuItem
                          key={agent.id}
                          onClick={() => onToggleAgentAccess(agent.id)}
                          className={blockAgentAccess.includes(agent.id) ? 'bg-blue-50' : ''}
                        >
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: agent.color }}
                          />
                          {agent.name}
                          {blockAgentAccess.includes(agent.id) && (
                            <Check className="w-3 h-3 ml-auto" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={onBringToFront}>
                <Settings2 className="w-4 h-4 mr-2" />
                Bring to Front
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdate({ locked: !block.locked })}>
                {block.locked ? (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Lock
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Menu */}
        <div className="sm:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Block Actions</SheetTitle>
              </SheetHeader>
              {MobileMenuContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-48px)] overflow-auto">
        {children}
      </div>

      {/* Resize handle */}
      {!block.locked && !isConnecting && (
        <div
          className={`
            absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize
            flex items-end justify-end p-1
            opacity-0 hover:opacity-100 transition-opacity
            ${isResizing || isSelected ? 'opacity-100' : ''}
          `}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
            borderRadius: '0 0 8px 0',
          }}
          onMouseDown={startResize}
          onTouchStart={startResize}
        >
          <Maximize2 className="w-3 h-3 text-white" style={{ transform: 'rotate(90deg)' }} />
        </div>
      )}
    </div>
  );
}
