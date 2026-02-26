// ============================================
// Folder Block - Contains minimized blocks
// ============================================

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Folder,
  FileText,
  StickyNote,
  Kanban,
  CheckSquare,
  Table,
  Inbox,
  MoreHorizontal,
  Trash2,
  Edit3,
  ExternalLink,
  GripVertical,
  X
} from 'lucide-react';
import type { FolderBlockData, FolderItem, FolderItemType } from '@/types';

interface FolderBlockProps {
  data: FolderBlockData;
  onUpdate: (data: Partial<FolderBlockData>) => void;
  isDropTarget?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDropBlock?: (blockId: string) => void;
  onItemDragOut?: (item: FolderItem, x: number, y: number) => void;
}

const ITEM_TYPE_ICONS: Record<FolderItemType, React.ReactNode> = {
  doc: <FileText className="w-5 h-5" />,
  text: <StickyNote className="w-5 h-5" />,
  kanban: <Kanban className="w-5 h-5" />,
  checklist: <CheckSquare className="w-5 h-5" />,
  table: <Table className="w-5 h-5" />,
  inbox: <Inbox className="w-5 h-5" />,
};

const ITEM_TYPE_COLORS: Record<FolderItemType, string> = {
  doc: 'bg-blue-100 text-blue-700 border-blue-200',
  text: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  kanban: 'bg-green-100 text-green-700 border-green-200',
  checklist: 'bg-purple-100 text-purple-700 border-purple-200',
  table: 'bg-gray-100 text-gray-700 border-gray-200',
  inbox: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function FolderBlock({ 
  data, 
  onUpdate, 
  isDropTarget = false,
  onDragOver,
  onDragLeave,
  onDropBlock,
  onItemDragOut 
}: FolderBlockProps) {
  const viewMode = 'grid';
  const [editingItem, setEditingItem] = useState<FolderItem | null>(null);
  const [openedItem, setOpenedItem] = useState<FolderItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<FolderItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const safeData = data || {};
  const items = safeData.items || [];
  const title = safeData.title || 'Folder';
  const currentViewMode = safeData.viewMode || viewMode;

  const handleUpdateItem = useCallback((updatedItem: FolderItem) => {
    const now = new Date().toISOString();
    onUpdate({
      items: items.map(item => 
        item.id === updatedItem.id 
          ? { ...updatedItem, updatedAt: now }
          : item
      ),
      title,
      viewMode: currentViewMode,
    });
    setEditingItem(null);
  }, [items, title, currentViewMode, onUpdate]);

  const handleDeleteItem = useCallback((itemId: string) => {
    onUpdate({
      items: items.filter(item => item.id !== itemId),
      title,
      viewMode: currentViewMode,
    });
    setEditingItem(null);
  }, [items, title, currentViewMode, onUpdate]);

  const handleOpenItem = useCallback((item: FolderItem) => {
    setOpenedItem(item);
  }, []);

  const handleCloseOpenedItem = useCallback(() => {
    if (openedItem) {
      handleUpdateItem(openedItem);
    }
    setOpenedItem(null);
  }, [openedItem, handleUpdateItem]);

  const handleItemDragStart = (e: React.DragEvent, item: FolderItem) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      source: 'folderItem',
      folderItem: item,
      folderId: data.id,
    }));
  };

  const handleItemDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    // If dropped outside the folder, notify parent to create a block
    if (onItemDragOut && e.dataTransfer.dropEffect === 'none') {
      // This will be handled by the canvas drop handler
    }
  };

  // Handle external block drop
  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDraggingOver) {
      setIsDraggingOver(true);
      onDragOver?.();
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    // Only trigger if actually leaving the element
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
      onDragLeave?.();
    }
  };

  const handleFolderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    onDragLeave?.();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      
      if (dragData.source === 'block' && dragData.blockId && onDropBlock) {
        onDropBlock(dragData.blockId);
      } else if (dragData.source === 'folderItem' && dragData.folderItem && onItemDragOut) {
        // Get drop position
        onItemDragOut(dragData.folderItem, e.clientX, e.clientY);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 transition-all duration-200 ${
        isDropTarget || isDraggingOver ? 'ring-4 ring-amber-400 ring-dashed bg-amber-100' : ''
      }`}
      onDragOver={handleFolderDragOver}
      onDragLeave={handleFolderDragLeave}
      onDrop={handleFolderDrop}
    >
      {/* Items Area */}
      <div className={`flex-1 overflow-hidden p-3 ${items.length === 0 ? 'flex items-center justify-center' : ''}`}>
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Empty folder</p>
            <p className="text-xs mt-1">Drag blocks here to store them</p>
          </div>
        )}
        
        {currentViewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <TooltipProvider key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, item)}
                      onDragEnd={handleItemDragEnd}
                      onDoubleClick={() => handleOpenItem(item)}
                      className={`
                        group relative aspect-square bg-white rounded-lg border-2 
                        border-amber-200 hover:border-amber-400
                        flex flex-col items-center justify-center p-2
                        cursor-grab active:cursor-grabbing transition-all
                        hover:shadow-md
                        ${draggedItem?.id === item.id ? 'opacity-50' : ''}
                      `}
                    >
                      <div className={`p-2 rounded-lg ${ITEM_TYPE_COLORS[item.type]}`}>
                        {ITEM_TYPE_ICONS[item.type]}
                      </div>
                      <span className="text-[10px] text-center mt-1 text-gray-600 line-clamp-2">
                        {item.title}
                      </span>
                      
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenItem(item)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingItem(item)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{item.title}</p>
                    <p className="text-[10px] text-gray-400">Double-click to open</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onDragEnd={handleItemDragEnd}
                onDoubleClick={() => handleOpenItem(item)}
                className={`
                  group flex items-center gap-2 p-2 bg-white rounded-lg border 
                  border-amber-200 hover:border-amber-400 cursor-grab active:cursor-grabbing
                  transition-all hover:shadow-sm
                  ${draggedItem?.id === item.id ? 'opacity-50' : ''}
                `}
              >
                <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                <div className={`p-1.5 rounded ${ITEM_TYPE_COLORS[item.type]}`}>
                  {ITEM_TYPE_ICONS[item.type]}
                </div>
                <span className="text-sm text-gray-700 flex-1 truncate">{item.title}</span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenItem(item)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingItem(item)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-sm" onPointerDownOutside={() => setEditingItem(null)}>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('title') as HTMLInputElement;
              if (input.value.trim()) {
                handleUpdateItem({ ...editingItem, title: input.value.trim() });
              }
            }} className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                <Input name="title" defaultValue={editingItem.title} placeholder="Item name..." autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Open Item Dialog */}
      <Dialog open={!!openedItem} onOpenChange={(open) => { if (!open) handleCloseOpenedItem(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" onPointerDownOutside={handleCloseOpenedItem}>
          {openedItem && (
            <OpenedItemView item={openedItem} onUpdate={setOpenedItem} onClose={handleCloseOpenedItem} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Opened Item View
interface OpenedItemViewProps {
  item: FolderItem;
  onUpdate: (item: FolderItem) => void;
  onClose: () => void;
}

function OpenedItemView({ item, onUpdate, onClose }: OpenedItemViewProps) {
  const [localItem, setLocalItem] = useState(item);

  const handleSave = () => {
    onUpdate(localItem);
    onClose();
  };

  const renderContent = () => {
    switch (localItem.type) {
      case 'doc':
        const docData = localItem.data as { title?: string; contentMarkdown?: string };
        return (
          <div className="space-y-4">
            <Input
              value={docData.title || localItem.title}
              onChange={(e) => setLocalItem({
                ...localItem,
                title: e.target.value,
                data: { ...docData, title: e.target.value }
              })}
              placeholder="Document title..."
              className="text-lg font-semibold"
            />
            <textarea
              value={docData.contentMarkdown || ''}
              onChange={(e) => setLocalItem({
                ...localItem,
                data: { ...docData, contentMarkdown: e.target.value },
              })}
              placeholder="Write your document here..."
              className="w-full h-96 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
      
      case 'text':
        const textData = localItem.data as { content?: string };
        return (
          <textarea
            value={textData.content || ''}
            onChange={(e) => setLocalItem({
              ...localItem,
              data: { content: e.target.value },
            })}
            placeholder="Write your note here..."
            className="w-full h-96 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
          />
        );
      
      case 'checklist':
        const checklistData = localItem.data as { items?: { id: string; text: string; checked: boolean; order: number }[] };
        const checklistItems = checklistData.items || [];
        return (
          <div className="space-y-2">
            <Input
              placeholder="Add new item..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    setLocalItem({
                      ...localItem,
                      data: {
                        items: [...checklistItems, {
                          id: crypto.randomUUID(),
                          text: input.value.trim(),
                          checked: false,
                          order: checklistItems.length
                        }]
                      }
                    });
                    input.value = '';
                  }
                }
              }}
            />
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {checklistItems.map((checkItem, idx) => (
                <div key={checkItem.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={checkItem.checked}
                    onChange={(e) => {
                      const newItems = [...checklistItems];
                      newItems[idx] = { ...checkItem, checked: e.target.checked };
                      setLocalItem({ ...localItem, data: { items: newItems } });
                    }}
                    className="w-4 h-4"
                  />
                  <span className={`flex-1 ${checkItem.checked ? 'line-through text-gray-400' : ''}`}>
                    {checkItem.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500"
                    onClick={() => setLocalItem({
                      ...localItem,
                      data: { items: checklistItems.filter((_, i) => i !== idx) }
                    })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>This item type doesn't have an editor yet.</p>
            <p className="text-sm mt-2">Drag it out to the canvas to use it as a full block.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className={ITEM_TYPE_COLORS[localItem.type]}>
            {ITEM_TYPE_ICONS[localItem.type]}
          </div>
          <DialogTitle>{localItem.title}</DialogTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save & Close</Button>
        </div>
      </DialogHeader>
      <div className="flex-1 overflow-auto py-4">{renderContent()}</div>
    </div>
  );
}
