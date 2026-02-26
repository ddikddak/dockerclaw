// ============================================
// Checklist Block - Modern inline editing
// ============================================

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import type { ChecklistBlockData, ChecklistItem } from '@/types';

interface ChecklistBlockProps {
  data: ChecklistBlockData;
  onUpdate: (data: Partial<ChecklistBlockData>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
}

export function ChecklistBlock({ data, onUpdate }: ChecklistBlockProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ChecklistItem | null>(null);

  const handleToggleItem = useCallback(
    (itemId: string) => {
      const updatedItems = data.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      onUpdate({ items: updatedItems });
    },
    [data.items, onUpdate]
  );

  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      checked: false,
      order: data.items.length,
    };

    onUpdate({ items: [...data.items, newItem] });
    setNewItemText('');
    setIsAdding(false);
  }, [newItemText, data.items, onUpdate]);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      onUpdate({ items: data.items.filter((i) => i.id !== itemId) });
    },
    [data.items, onUpdate]
  );

  const handleUpdateItemText = useCallback(
    (itemId: string, text: string) => {
      const updatedItems = data.items.map((item) =>
        item.id === itemId ? { ...item, text } : item
      );
      onUpdate({ items: updatedItems });
    },
    [data.items, onUpdate]
  );

  // Drag and drop for reordering
  const handleDragStart = (item: ChecklistItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const currentIndex = data.items.findIndex(i => i.id === draggedItem.id);
    if (currentIndex === targetIndex) return;

    const newItems = [...data.items];
    newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    
    // Update order
    const reorderedItems = newItems.map((item, idx) => ({ ...item, order: idx }));
    onUpdate({ items: reorderedItems });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Sort by order
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const checkedCount = sortedItems.filter((i) => i.checked).length;
  const progress = sortedItems.length > 0 ? (checkedCount / sortedItems.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span className="font-medium">{checkedCount} of {sortedItems.length} completed</span>
          <span className="text-blue-600 font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedItems.map((item, index) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            index={index}
            onToggle={() => handleToggleItem(item.id)}
            onDelete={() => handleDeleteItem(item.id)}
            onUpdateText={(text) => handleUpdateItemText(item.id, text)}
            onDragStart={() => handleDragStart(item)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          />
        ))}

        {sortedItems.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No items yet. Add one below.
          </div>
        )}
      </div>

      {/* Add Item */}
      <div className="p-3 border-t border-gray-100">
        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="New item..."
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewItemText('');
                }
              }}
            />
            <Button size="sm" onClick={handleAddItem}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewItemText('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>
    </div>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateText: (text: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  onUpdateText,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ChecklistItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdateText(editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`
        flex items-center gap-2 p-2.5 rounded-lg group
        ${item.checked ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}
        cursor-grab active:cursor-grabbing
      `}
    >
      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />

      <Checkbox 
        checked={item.checked} 
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
      />

      {isEditing ? (
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setEditText(item.text);
              setIsEditing(false);
            }
          }}
          className="flex-1 h-8 text-sm"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={`
            flex-1 text-left text-sm
            ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}
          `}
        >
          {item.text}
        </button>
      )}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
