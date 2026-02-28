// ============================================
// Toolbar Component - Single unified topbar
// Mobile responsive with compact layout
// ============================================

import { useState } from 'react';
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
  ImageIcon,
  Settings,
  Trash2,
  Edit3,
  MoreHorizontal,
  Users,
  Heading,
  Crosshair,
  Menu,
} from 'lucide-react';
import type { Block, BlockType, BoardPermission, Agent, Board } from '@/types';
import type { PresenceUser } from '@/services/collaboration';
import { ShareDialog } from '@/components/ShareDialog';
import { AgentApiSettings } from '@/components/AgentApiSettings';

interface ToolbarProps {
  boardName: string;
  boardId: string;
  permission: BoardPermission;
  onAddBlock: (type: BlockType) => void;
  onRenameBoard: (name: string) => void;
  onDeleteBoard: () => void;
  onlineUsers?: PresenceUser[];
  agents?: Agent[];
  onOpenAgentDialog?: () => void;
  blocks?: Block[];
  onFocusBlock?: (blockId: string) => void;
  onOpenSidebar?: () => void;
  boardSettings?: Board['settings'];
  onUpdateBoardSettings?: (updates: Partial<NonNullable<Board['settings']>>) => Promise<void>;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'doc', label: 'Document', icon: <FileText className="w-4 h-4" />, description: 'Markdown document' },
  { type: 'kanban', label: 'Kanban', icon: <Kanban className="w-4 h-4" />, description: 'Task board' },
  { type: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, description: 'Capture ideas' },
  { type: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-4 h-4" />, description: 'Todo items' },
  { type: 'table', label: 'Table', icon: <Table className="w-4 h-4" />, description: 'Data table' },
  { type: 'text', label: 'Text Note', icon: <StickyNote className="w-4 h-4" />, description: 'Quick note' },
  { type: 'heading', label: 'Heading', icon: <Heading className="w-4 h-4" />, description: 'Label or title' },
  { type: 'folder', label: 'Folder', icon: <Folder className="w-4 h-4" />, description: 'Store blocks' },
  { type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" />, description: 'Upload image' },
];

export function Toolbar({
  boardName,
  boardId,
  permission,
  onAddBlock,
  onRenameBoard,
  onDeleteBoard,
  onlineUsers = [],
  agents = [],
  onOpenAgentDialog,
  blocks = [],
  onFocusBlock,
  onOpenSidebar,
  boardSettings,
  onUpdateBoardSettings,
}: ToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(boardName);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onRenameBoard(editName.trim());
    }
    setIsEditingName(false);
  };

  const handleAddBlock = (type: BlockType) => {
    onAddBlock(type);
    setIsAddBlockOpen(false);
  };

  // Block name helper for navigator
  const getBlockName = (block: Block): string => {
    const data = block.data as any;
    switch (block.type) {
      case 'doc': return data?.title || 'Untitled Document';
      case 'kanban': return `Kanban (${data?.columns?.length || 0} cols)`;
      case 'inbox': return `Inbox (${data?.items?.length || 0})`;
      case 'checklist': return data?.title || `Checklist (${data?.items?.length || 0})`;
      case 'table': return `Table (${data?.rows?.length || 0} rows)`;
      case 'text': return (data?.content?.slice(0, 30) || 'Text Note') + (data?.content?.length > 30 ? '...' : '');
      case 'heading': return data?.content || 'Heading';
      case 'folder': return data?.name || 'Folder';
      case 'image': return data?.fileName || 'Image';
      default: return block.type;
    }
  };

  const BLOCK_TYPE_ICONS: Record<BlockType, React.ReactNode> = {
    doc: <FileText className="w-4 h-4" />,
    kanban: <Kanban className="w-4 h-4" />,
    inbox: <Inbox className="w-4 h-4" />,
    checklist: <CheckSquare className="w-4 h-4" />,
    table: <Table className="w-4 h-4" />,
    text: <StickyNote className="w-4 h-4" />,
    heading: <Heading className="w-4 h-4" />,
    folder: <Folder className="w-4 h-4" />,
    image: <ImageIcon className="w-4 h-4" />,
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
      {/* Left: Hamburger (mobile) + Board Name */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {/* Mobile hamburger menu */}
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden flex-shrink-0"
            onClick={onOpenSidebar}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

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
      <div className="flex-shrink-0 mx-2 md:mx-6">
        {/* Mobile: Sheet */}
        <div className="md:hidden">{MobileAddBlockSheet}</div>
        {/* Desktop: Dropdown */}
        <div className="hidden md:block">{DesktopAddBlockDropdown}</div>
      </div>

      {/* Block Navigator */}
      {blocks.length > 0 && onFocusBlock && (
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:gap-2">
                <Crosshair className="w-4 h-4" />
                <span className="hidden sm:inline">Go to</span>
                <span className="text-xs text-gray-400 hidden md:inline">({blocks.length})</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64 max-h-80 overflow-y-auto">
              {blocks.map((block) => (
                <DropdownMenuItem
                  key={block.id}
                  onClick={() => onFocusBlock(block.id)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="text-gray-500 flex-shrink-0">{BLOCK_TYPE_ICONS[block.type]}</div>
                  <span className="truncate text-sm">{getBlockName(block)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            {onlineUsers.slice(0, 5).map((u) => (
              <div
                key={u.userId}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                style={{ backgroundColor: u.color }}
                title={u.email}
              >
                {u.email[0]?.toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <span className="text-xs text-gray-500">+{onlineUsers.length - 5}</span>
            )}
          </div>
        )}

        {/* Share button */}
        <div className="hidden sm:block">
          <ShareDialog
            boardId={boardId}
            isOwner={permission === 'owner'}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Mobile: Agents button */}
        {onOpenAgentDialog && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={onOpenAgentDialog}
            title={`Agents (${agents.length})`}
          >
            <Users className="w-5 h-5" />
          </Button>
        )}

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
                <ShareDialog
                  boardId={boardId}
                  isOwner={permission === 'owner'}
                  onlineUsers={onlineUsers}
                />
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
            <DialogContent className="max-h-[85vh] overflow-y-auto">
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
                {onUpdateBoardSettings && (
                  <AgentApiSettings
                    boardId={boardId}
                    boardSettings={boardSettings}
                    onUpdateBoardSettings={onUpdateBoardSettings}
                  />
                )}
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
