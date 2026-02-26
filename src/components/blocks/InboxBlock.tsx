// ============================================
// Inbox Block - Modern feed with inline actions
// ============================================

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Archive, CheckSquare, FileText, Bot, User, MoreVertical, Plus } from 'lucide-react';
import type { InboxBlockData, InboxItem } from '@/types';

interface InboxBlockProps {
  data: InboxBlockData;
  onUpdate: (data: Partial<InboxBlockData>) => void;
  onConvertToTask?: (item: InboxItem) => void;
  onConvertToDoc?: (item: InboxItem) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
}

export function InboxBlock({ data, onUpdate, onConvertToTask, onConvertToDoc }: InboxBlockProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemBody, setNewItemBody] = useState('');

  const handleAddItem = useCallback(() => {
    if (!newItemTitle.trim()) return;

    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      title: newItemTitle.trim(),
      bodyMarkdown: newItemBody.trim(),
      source: 'user',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    onUpdate({ items: [newItem, ...data.items] });
    setNewItemTitle('');
    setNewItemBody('');
    setIsAddingItem(false);
  }, [newItemTitle, newItemBody, data.items, onUpdate]);

  const handleArchiveItem = useCallback(
    (itemId: string) => {
      const updatedItems = data.items.map((item) =>
        item.id === itemId ? { ...item, status: 'archived' as const } : item
      );
      onUpdate({ items: updatedItems });
    },
    [data.items, onUpdate]
  );

  const handleConvertToTask = useCallback(
    (item: InboxItem) => {
      if (onConvertToTask) {
        onConvertToTask(item);
        handleArchiveItem(item.id);
      }
    },
    [onConvertToTask, handleArchiveItem]
  );

  const handleConvertToDoc = useCallback(
    (item: InboxItem) => {
      if (onConvertToDoc) {
        onConvertToDoc(item);
        handleArchiveItem(item.id);
      }
    },
    [onConvertToDoc, handleArchiveItem]
  );

  const openItems = data.items.filter((i) => i.status === 'open');
  const archivedItems = data.items.filter((i) => i.status === 'archived');
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs font-medium bg-blue-100 text-blue-700">
            {openItems.length} open
          </Badge>
          {archivedItems.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {archivedItems.length} archived
            </button>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAddingItem(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {openItems.map((item) => (
          <InboxItemCard
            key={item.id}
            item={item}
            onArchive={() => handleArchiveItem(item.id)}
            onConvertToTask={() => handleConvertToTask(item)}
            onConvertToDoc={() => handleConvertToDoc(item)}
            canConvert={!!onConvertToTask || !!onConvertToDoc}
          />
        ))}

        {showArchived &&
          archivedItems.map((item) => (
            <InboxItemCard
              key={item.id}
              item={item}
              onArchive={() => {}}
              onConvertToTask={() => {}}
              onConvertToDoc={() => {}}
              canConvert={false}
              isArchived
            />
          ))}

        {openItems.length === 0 && !showArchived && (
          <div className="text-center py-12 text-gray-400">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm">No items in inbox</p>
            <p className="text-xs mt-1">Click Add to capture an idea</p>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Inbox</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="What's on your mind?"
              autoFocus
            />
            <Textarea
              value={newItemBody}
              onChange={(e) => setNewItemBody(e.target.value)}
              placeholder="Add details (optional)..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem}>Add Item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InboxItemCardProps {
  item: InboxItem;
  onArchive: () => void;
  onConvertToTask: () => void;
  onConvertToDoc: () => void;
  canConvert: boolean;
  isArchived?: boolean;
}

function InboxItemCard({
  item,
  onArchive,
  onConvertToTask,
  onConvertToDoc,
  canConvert,
  isArchived,
}: InboxItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`
        p-3.5 rounded-xl border transition-all
        ${isArchived 
          ? 'bg-gray-50 border-gray-100 opacity-60' 
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Source Icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${item.source === 'agent' ? 'bg-purple-100' : 'bg-blue-100'}
        `}>
          {item.source === 'agent' ? (
            <Bot className="w-4 h-4 text-purple-600" />
          ) : (
            <User className="w-4 h-4 text-blue-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left w-full group"
          >
            <span className={`font-medium text-sm ${isArchived ? 'text-gray-500' : 'text-gray-800'} group-hover:text-blue-600 transition-colors`}>
              {item.title}
            </span>
          </button>

          {expanded && item.bodyMarkdown && (
            <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {item.bodyMarkdown}
            </div>
          )}

          <div className="mt-1.5 text-xs text-gray-400">
            {new Date(item.createdAt).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Actions */}
        {!isArchived && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canConvert && (
                <>
                  <DropdownMenuItem onClick={onConvertToTask}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Convert to Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onConvertToDoc}>
                    <FileText className="w-4 h-4 mr-2" />
                    Convert to Doc
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
