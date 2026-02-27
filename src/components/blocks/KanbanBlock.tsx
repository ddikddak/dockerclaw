// ============================================
// Kanban Block - Fully customizable with custom stages and properties
// ============================================

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, GripVertical, ArrowRightLeft, Settings2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { KanbanBlockData, KanbanCard, KanbanColumn, Block, KanbanProperty } from '@/types';

interface KanbanBlockProps {
  data: KanbanBlockData;
  onUpdate: (data: Partial<KanbanBlockData>) => void;
  connectedBlocks?: string[];
  onCardMoveToBlock?: (card: any, targetBlockId: string) => void;
  allBlocks?: Block[];
}

// Default properties for cards
const DEFAULT_PROPERTIES: KanbanProperty[] = [
  { id: 'priority', name: 'Priority', type: 'select', options: ['P0', 'P1', 'P2', 'P3'] },
  { id: 'status', name: 'Status', type: 'select', options: ['Todo', 'In Progress', 'Done'] },
  { id: 'assignee', name: 'Assignee', type: 'text' },
  { id: 'dueDate', name: 'Due Date', type: 'date' },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500 text-white',
  P1: 'bg-orange-500 text-white',
  P2: 'bg-blue-500 text-white',
  P3: 'bg-green-500 text-white',
};

export function KanbanBlock({ 
  data, 
  onUpdate, 
  connectedBlocks = [],
  onCardMoveToBlock,
  allBlocks = []
}: KanbanBlockProps) {
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [isAddingCard, setIsAddingCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Touch drag state for mobile
  // direction: null = undecided, 'drag' = horizontal card drag, 'scroll' = vertical column scroll
  const touchDragRef = useRef<{
    card: KanbanCard;
    startX: number;
    startY: number;
    direction: 'drag' | 'scroll' | null;
    active: boolean;
    ghostEl: HTMLDivElement | null;
    preventClick: boolean;
  } | null>(null);
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Ensure columns exist
  const columns = data.columns?.length > 0 ? data.columns : [
    { id: 'col-1', name: 'Todo', order: 0 },
    { id: 'col-2', name: 'In Progress', order: 1 },
    { id: 'col-3', name: 'Done', order: 2 },
  ];

  // Ensure properties exist
  const properties: KanbanProperty[] = data.properties && data.properties.length > 0 
    ? data.properties 
    : DEFAULT_PROPERTIES;

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const handleAddColumn = useCallback(() => {
    if (!newColumnName.trim()) return;
    
    const newColumn: KanbanColumn = {
      id: crypto.randomUUID(),
      name: newColumnName.trim(),
      order: columns.length,
    };
    
    onUpdate({ 
      columns: [...columns, newColumn],
      properties,
    });
    setNewColumnName('');
  }, [newColumnName, columns, properties, onUpdate]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    // Move cards from deleted column to first remaining column
    const remainingColumns = columns.filter(c => c.id !== columnId);
    if (remainingColumns.length === 0) return;
    
    const firstColumn = remainingColumns.sort((a, b) => a.order - b.order)[0];
    const updatedCards = data.cards?.map(card => 
      card.columnId === columnId ? { ...card, columnId: firstColumn.id } : card
    ) || [];
    
    onUpdate({ 
      columns: remainingColumns.map((c, i) => ({ ...c, order: i })),
      cards: updatedCards,
      properties,
    });
  }, [columns, data.cards, properties, onUpdate]);

  const handleReorderColumn = useCallback((columnId: string, direction: 'left' | 'right') => {
    const index = sortedColumns.findIndex(c => c.id === columnId);
    if (index === -1) return;
    
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedColumns.length) return;
    
    const newColumns = [...sortedColumns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
    
    onUpdate({ 
      columns: newColumns.map((c, i) => ({ ...c, order: i })),
      cards: data.cards,
      properties,
    });
  }, [sortedColumns, data.cards, properties, onUpdate]);

  const handleAddCard = useCallback(
    (columnId: string) => {
      if (!newCardTitle.trim()) return;

      const newCard: KanbanCard = {
        id: crypto.randomUUID(),
        columnId,
        title: newCardTitle.trim(),
        descriptionMarkdown: '',
        priority: 'P2',
        labels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onUpdate({ 
        cards: [...(data.cards || []), newCard],
        columns,
        properties,
      });
      setNewCardTitle('');
      setIsAddingCard(null);
    },
    [newCardTitle, data.cards, columns, properties, onUpdate]
  );

  const handleUpdateCard = useCallback(
    (updatedCard: KanbanCard) => {
      const updatedCards = (data.cards || []).map((card) =>
        card.id === updatedCard.id ? { ...updatedCard, updatedAt: new Date().toISOString() } : card
      );
      onUpdate({ 
        cards: updatedCards,
        columns,
        properties,
      });
      setEditingCard(null);
    },
    [data.cards, columns, properties, onUpdate]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      onUpdate({ 
        cards: (data.cards || []).filter((c) => c.id !== cardId),
        columns,
        properties,
      });
      setEditingCard(null);
    },
    [data.cards, columns, properties, onUpdate]
  );

  // Drag and drop handlers
  const handleDragStart = (card: KanbanCard) => {
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedCard) return;

    if (draggedCard.columnId !== columnId) {
      const updatedCards = (data.cards || []).map((card) =>
        card.id === draggedCard.id 
          ? { ...card, columnId, updatedAt: new Date().toISOString() } 
          : card
      );
      onUpdate({ 
        cards: updatedCards,
        columns,
        properties,
      });
    }
    setDraggedCard(null);
  };

  const handleCardDragEnd = () => {
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  // Touch drag handlers for mobile
  const handleCardTouchStart = useCallback((e: React.TouchEvent, card: KanbanCard) => {
    if (e.touches.length !== 1) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, input, textarea, select, a')) return;
    const touch = e.touches[0];
    touchDragRef.current = {
      card,
      startX: touch.clientX,
      startY: touch.clientY,
      direction: null,
      active: false,
      ghostEl: null,
      preventClick: false,
    };
  }, []);

  const handleCardTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchDragRef.current;
    if (!state || e.touches.length !== 1) return;

    // If we already decided this is a scroll, bail out and let native scroll work
    if (state.direction === 'scroll') return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Decide direction after 8px of movement
    if (!state.direction && (absDx + absDy) > 8) {
      if (absDx > absDy) {
        // Horizontal = card drag
        state.direction = 'drag';
      } else {
        // Vertical = column scroll — release control to browser
        state.direction = 'scroll';
        touchDragRef.current = null;
        return;
      }
    }

    // Once direction is 'drag', prevent scroll and handle drag
    if (state.direction === 'drag') {
      e.preventDefault();

      if (!state.active) {
        state.active = true;
        state.preventClick = true;
        setDraggedCard(state.card);

        const ghost = document.createElement('div');
        ghost.textContent = state.card.title;
        ghost.style.cssText = `
          position: fixed; z-index: 99999; pointer-events: none;
          background: white; border: 2px solid #3b82f6; border-radius: 8px;
          padding: 8px 12px; font-size: 13px; color: #1e293b;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15); max-width: 200px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transform: rotate(2deg);
        `;
        document.body.appendChild(ghost);
        state.ghostEl = ghost;
      }

      if (state.ghostEl) {
        state.ghostEl.style.left = `${touch.clientX - 50}px`;
        state.ghostEl.style.top = `${touch.clientY - 20}px`;
      }

      // Hide ghost momentarily to find element underneath
      if (state.ghostEl) state.ghostEl.style.display = 'none';
      const elemUnder = document.elementFromPoint(touch.clientX, touch.clientY);
      if (state.ghostEl) state.ghostEl.style.display = '';
      const columnEl = elemUnder?.closest('[data-column-id]') as HTMLElement | null;
      const colId = columnEl?.dataset.columnId || null;
      setDragOverColumn(colId);
    }
  }, []);

  const handleCardTouchEnd = useCallback(() => {
    const state = touchDragRef.current;
    if (!state) return;

    // Clean up ghost
    if (state.ghostEl) {
      state.ghostEl.remove();
      state.ghostEl = null;
    }

    if (state.active && dragOverColumn && dragOverColumn !== state.card.columnId) {
      // Move card to target column
      const updatedCards = (data.cards || []).map((card) =>
        card.id === state.card.id
          ? { ...card, columnId: dragOverColumn, updatedAt: new Date().toISOString() }
          : card
      );
      onUpdate({
        cards: updatedCards,
        columns,
        properties,
      });
    }

    // Schedule click prevention reset
    if (state.preventClick) {
      setTimeout(() => {
        if (touchDragRef.current) touchDragRef.current.preventClick = false;
      }, 50);
    }

    setDraggedCard(null);
    setDragOverColumn(null);
    touchDragRef.current = null;
  }, [dragOverColumn, data.cards, columns, properties, onUpdate]);

  const handleCardClick = useCallback((card: KanbanCard) => {
    // Prevent card edit if we just finished a touch drag
    if (touchDragRef.current?.preventClick) return;
    setEditingCard(card);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header with config button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs text-gray-500">{sortedColumns.length} columns · {(data.cards || []).length} cards</span>
        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setIsConfigOpen(true)}>
          <Settings2 className="w-3.5 h-3.5" />
          Configure
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-3 p-3 min-w-max">
          {sortedColumns.map((column, index) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              cards={(data.cards || []).filter((c) => c.columnId === column.id)}
              properties={properties}
              onAddCard={() => setIsAddingCard(column.id)}
              onEditCard={handleCardClick}
              onDeleteColumn={() => handleDeleteColumn(column.id)}
              onReorderColumn={(dir) => handleReorderColumn(column.id, dir)}
              isFirst={index === 0}
              isLast={index === sortedColumns.length - 1}
              draggedCard={draggedCard}
              dragOverColumn={dragOverColumn}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleCardDragEnd}
              onCardTouchStart={handleCardTouchStart}
              onCardTouchMove={handleCardTouchMove}
              onCardTouchEnd={handleCardTouchEnd}
            />
          ))}
        </div>
      </div>

      {/* Inline Card Editor */}
      {editingCard && (
        <CardEditor
          card={editingCard}
          columns={sortedColumns}
          properties={properties}
          connectedBlocks={connectedBlocks}
          allBlocks={allBlocks}
          onSave={handleUpdateCard}
          onDelete={() => handleDeleteCard(editingCard.id)}
          onClose={() => setEditingCard(null)}
          onMoveToBlock={onCardMoveToBlock}
        />
      )}

      {/* Quick Add Card Input */}
      {isAddingCard && (
        <div className="absolute inset-x-4 bottom-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <Input
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Enter card title..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCard(isAddingCard);
              if (e.key === 'Escape') setIsAddingCard(null);
            }}
            autoFocus
            className="mb-3"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddingCard(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleAddCard(isAddingCard)}>
              Add Card
            </Button>
          </div>
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kanban Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Columns</label>
              <div className="space-y-2">
                {sortedColumns.map((col, idx) => (
                  <div key={col.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                    <Input value={col.name} className="flex-1" readOnly />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => handleReorderColumn(col.id, 'left')}
                    >
                      ←
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={idx === sortedColumns.length - 1}
                      onClick={() => handleReorderColumn(col.id, 'right')}
                    >
                      →
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleDeleteColumn(col.id)}
                      disabled={sortedColumns.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="New column name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                  }}
                />
                <Button onClick={handleAddColumn}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Card Properties</label>
              <div className="flex flex-wrap gap-2">
                {properties.map(prop => (
                  <Badge key={prop.id} variant="secondary">{prop.name}</Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Priority, Status, Assignee, and Due Date are available on all cards.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface KanbanColumnComponentProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  properties: KanbanProperty[];
  onAddCard: () => void;
  onEditCard: (card: KanbanCard) => void;
  onDeleteColumn: () => void;
  onReorderColumn: (direction: 'left' | 'right') => void;
  isFirst: boolean;
  isLast: boolean;
  draggedCard: KanbanCard | null;
  dragOverColumn: string | null;
  onDragStart: (card: KanbanCard) => void;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragEnd: () => void;
  onCardTouchStart: (e: React.TouchEvent, card: KanbanCard) => void;
  onCardTouchMove: (e: React.TouchEvent) => void;
  onCardTouchEnd: () => void;
}

function KanbanColumnComponent({
  column,
  cards,
  onAddCard,
  onEditCard,
  draggedCard,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCardTouchStart,
  onCardTouchMove,
  onCardTouchEnd,
}: KanbanColumnComponentProps) {
  const isDragOver = dragOverColumn === column.id;

  return (
    <div
      data-column-id={column.id}
      className={`
        flex flex-col w-72 bg-gray-50/80 rounded-xl flex-shrink-0
        transition-all duration-200
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''}
      `}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="font-semibold text-sm text-gray-700">{column.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs font-medium">
            {cards.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        {cards.map((card) => (
          <div
            key={card.id}
            draggable
            onDragStart={() => onDragStart(card)}
            onDragEnd={onDragEnd}
            onClick={() => onEditCard(card)}
            onTouchStart={(e) => onCardTouchStart(e, card)}
            onTouchMove={onCardTouchMove}
            onTouchEnd={onCardTouchEnd}
            style={{ touchAction: 'pan-y' }}
            className={`
              group bg-white p-3 rounded-lg shadow-sm border border-gray-200
              cursor-grab active:cursor-grabbing
              hover:shadow-md hover:border-blue-300
              transition-all duration-150
              ${draggedCard?.id === card.id ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                <span className="text-sm font-medium text-gray-800 flex-1">{card.title}</span>
              </div>
              {card.priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[card.priority]}`}>
                  {card.priority}
                </span>
              )}
            </div>
            {card.descriptionMarkdown && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{card.descriptionMarkdown}</p>
            )}
            {card.labels && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.labels.map((label) => (
                  <span key={label} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Card Button */}
      <div className="p-2 border-t border-gray-200/60">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          onClick={onAddCard}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>
    </div>
  );
}

interface CardEditorProps {
  card: KanbanCard;
  columns: KanbanColumn[];
  properties: KanbanProperty[];
  connectedBlocks: string[];
  allBlocks: Block[];
  onSave: (card: KanbanCard) => void;
  onDelete: () => void;
  onClose: () => void;
  onMoveToBlock?: (card: any, targetBlockId: string) => void;
}

function CardEditor({ card, columns, connectedBlocks, allBlocks, onSave, onDelete, onClose, onMoveToBlock }: CardEditorProps) {
  const [editedCard, setEditedCard] = useState<KanbanCard>({ ...card });
  const [newLabel, setNewLabel] = useState('');

  const handleAddLabel = () => {
    if (newLabel.trim() && !editedCard.labels?.includes(newLabel.trim())) {
      setEditedCard({
        ...editedCard,
        labels: [...(editedCard.labels || []), newLabel.trim()],
      });
      setNewLabel('');
    }
  };

  const connectedKanbanBlocks = allBlocks.filter(b => 
    connectedBlocks.includes(b.id) && (b.type === 'kanban' || b.type === 'table')
  );

  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Edit Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Title</label>
            <Input
              value={editedCard.title}
              onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
              className="text-lg font-medium"
              placeholder="Card title"
            />
          </div>

          {/* Column & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Column</label>
              <Select
                value={editedCard.columnId}
                onValueChange={(v) => setEditedCard({ ...editedCard, columnId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Priority</label>
              <Select
                value={editedCard.priority || 'P2'}
                onValueChange={(v) => setEditedCard({ ...editedCard, priority: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - Critical</SelectItem>
                  <SelectItem value="P1">P1 - High</SelectItem>
                  <SelectItem value="P2">P2 - Medium</SelectItem>
                  <SelectItem value="P3">P3 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Description</label>
            <Textarea
              value={editedCard.descriptionMarkdown || ''}
              onChange={(e) => setEditedCard({ ...editedCard, descriptionMarkdown: e.target.value })}
              placeholder="Add a description..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Labels</label>
            <div className="flex flex-wrap gap-2">
              {editedCard.labels?.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1">
                  {label}
                  <button
                    onClick={() =>
                      setEditedCard({
                        ...editedCard,
                        labels: editedCard.labels?.filter((l) => l !== label),
                      })
                    }
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Add label..."
                  className="h-8 w-28 text-sm"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddLabel}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Move to Connected Block */}
          {connectedKanbanBlocks.length > 0 && onMoveToBlock && (
            <div className="border-t pt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Move to Connected Block
              </label>
              <div className="flex flex-wrap gap-2">
                {connectedKanbanBlocks.map((block) => (
                  <Button
                    key={block.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onMoveToBlock(editedCard, block.id);
                      onClose();
                    }}
                    className="gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    {block.type === 'kanban' ? 'Kanban' : 'Table'}: {(block.data as any).title || 'Untitled'}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(editedCard)}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
