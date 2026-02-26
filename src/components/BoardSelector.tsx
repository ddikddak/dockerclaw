// ============================================
// Board Selector - List and create boards
// Mobile responsive with drawer on small screens
// ============================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, Layout, Clock, Trash2 } from 'lucide-react';
import type { Board } from '@/types';
import { AuthButton } from '@/components/AuthButton';

interface BoardSelectorProps {
  boards: Board[];
  currentBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => void;
  onDeleteBoard: (boardId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileMode?: boolean;
}

export function BoardSelector({
  boards,
  currentBoardId,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  isOpen,
  onOpenChange,
  mobileMode = false,
}: BoardSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const handleCreate = () => {
    if (newBoardName.trim()) {
      onCreateBoard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
    }
  };

  const BoardListContent = (
    <>
      {/* Header */}
      <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">My Boards</h2>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {boards.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No boards yet.
            <br />
            Create one to get started.
          </div>
        ) : (
          boards.map((board) => (
            <div
              key={board.id}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer
                transition-colors
                ${
                  currentBoardId === board.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }
              `}
              onClick={() => {
                onSelectBoard(board.id);
                if (mobileMode && onOpenChange) {
                  onOpenChange(false);
                }
              }}
            >
              <Layout className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{board.name}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(board.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {currentBoardId === board.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this board?')) {
                      onDeleteBoard(board.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer - Auth */}
      <div className="p-3 border-t border-gray-200">
        <AuthButton />
      </div>
    </>
  );

  // Mobile: Render as Sheet (drawer)
  if (mobileMode) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-gray-200">
            <SheetTitle className="text-left">My Boards</SheetTitle>
          </SheetHeader>
          {BoardListContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render as sidebar
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full hidden md:flex">
      {BoardListContent}
    </div>
  );
}
