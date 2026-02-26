// ============================================
// Toolbar Component - Add blocks and board actions
// Mobile responsive with compact layout
// ============================================

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  Plus,
  FileText,
  Kanban,
  Inbox,
  CheckSquare,
  Table,
  StickyNote,
  Folder,
  Download,
  Upload,
  Settings,
  Trash2,
  Edit3,
  MoreHorizontal,
} from 'lucide-react';
import type { BlockType } from '@/types';

interface ToolbarProps {
  boardName: string;
  onAddBlock: (type: BlockType) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onRenameBoard: (name: string) => void;
  onDeleteBoard: () => void;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'doc', label: 'Document', icon: <FileText className="w-4 h-4" />, description: 'Markdown document' },
  { type: 'kanban', label: 'Kanban', icon: <Kanban className="w-4 h-4" />, description: 'Task board' },
  { type: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, description: 'Capture ideas' },
  { type: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" />, description: 'Todo items' },
  { type: 'table', label: 'Table', icon: <Table className="w-4 h-4" />, description: 'Data table' },
  { type: 'text', label: 'Text Note', icon: <StickyNote className="w-4 h-4" />, description: 'Quick note' },
  { type: 'folder', label: 'Folder', icon: <Folder className="w-4 h-4" />, description: 'Store blocks' },
];

export function Toolbar({
  boardName,
  onAddBlock,
  onExport,
  onImport,
  onRenameBoard,
  onDeleteBoard,
}: ToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(boardName);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onRenameBoard(editName.trim());
    }
    setIsEditingName(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleAddBlock = (type: BlockType) => {
    onAddBlock(type);
    setIsAddBlockOpen(false);
  };

  // Mobile Add Block Sheet
  const MobileAddBlockSheet = (
    <Sheet open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1 md:gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Block</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Add Block</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {BLOCK_TYPES.map((blockType) => (
            <button
              key={blockType.type}
              onClick={() => handleAddBlock(blockType.type)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="text-gray-600">{blockType.icon}</div>
              <div className="font-medium text-sm">{blockType.label}</div>
              <div className="text-xs text-gray-400">{blockType.description}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  // Desktop Add Block Dropdown
  const DesktopAddBlockDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        {BLOCK_TYPES.map((blockType) => (
          <DropdownMenuItem
            key={blockType.type}
            onClick={() => onAddBlock(blockType.type)}
            className="flex items-start gap-3 py-2"
          >
            <div className="mt-0.5 text-gray-500">{blockType.icon}</div>
            <div>
              <div className="font-medium text-sm">{blockType.label}</div>
              <div className="text-xs text-gray-500">{blockType.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-4 flex-shrink-0">
      {/* Left: Board Name */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {isEditingName ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') {
                setEditName(boardName);
                setIsEditingName(false);
              }
            }}
            className="h-8 w-full max-w-[150px] md:max-w-[200px]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-base md:text-lg font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1 md:gap-2 truncate"
          >
            <span className="truncate max-w-[120px] md:max-w-[200px]">{boardName}</span>
            <Edit3 className="w-3 h-3 md:w-4 md:h-4 opacity-50 flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Center: Add Block */}
      <div className="flex-shrink-0">
        {/* Mobile: Sheet */}
        <div className="md:hidden">{MobileAddBlockSheet}</div>
        {/* Desktop: Dropdown */}
        <div className="hidden md:block">{DesktopAddBlockDropdown}</div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Export - hidden on small mobile */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExport} 
          className="gap-1 md:gap-2 hidden sm:flex"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Export</span>
        </Button>

        {/* Import - hidden on small mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1 md:gap-2 hidden sm:flex"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">Import</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Mobile: More actions menu */}
        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Actions</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={onExport}>
                  <Download className="w-4 h-4" />
                  Export Board
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Import Board
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2" 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this board?')) {
                      onDeleteBoard();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Board
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Settings */}
        <div className="hidden sm:block">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Board Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Board Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this board?')) {
                        onDeleteBoard();
                        setIsSettingsOpen(false);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board
                  </Button>
                </div>
                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      onRenameBoard(editName);
                      setIsSettingsOpen(false);
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
