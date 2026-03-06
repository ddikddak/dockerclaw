// ============================================
// Board Map Settings - View/edit board and block metadata
// Used by AI agents to understand board structure
// ============================================

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Kanban,
  Inbox,
  CheckSquare,
  Table,
  StickyNote,
  Heading,
  Folder,
  ImageIcon,
  Plus,
  X,
  Target,
} from 'lucide-react';
import type { Block, BlockType, BlockPurpose, Board } from '@/types';
import type {
  DocBlockData,
  KanbanBlockData,
  InboxBlockData,
  ChecklistBlockData,
  TableBlockData,
  TextBlockData,
  HeadingBlockData,
  FolderBlockData,
  ImageBlockData,
} from '@/types';

interface BoardMapSettingsProps {
  boardSettings?: Board['settings'];
  onUpdateBoardSettings: (updates: Partial<NonNullable<Board['settings']>>) => Promise<void>;
  blocks: Block[];
  onBlockMetaUpdate: (blockId: string, updates: { description?: string; purpose?: BlockPurpose; semanticTags?: string[] }) => void;
}

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

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  doc: 'Document',
  kanban: 'Kanban',
  inbox: 'Inbox',
  checklist: 'Checklist',
  table: 'Table',
  text: 'Note',
  heading: 'Heading',
  folder: 'Folder',
  image: 'Image',
};

const PURPOSE_OPTIONS: { value: BlockPurpose; label: string }[] = [
  { value: 'input', label: 'Input' },
  { value: 'process', label: 'Process' },
  { value: 'output', label: 'Output' },
  { value: 'reference', label: 'Reference' },
  { value: 'dashboard', label: 'Dashboard' },
];

function getBlockName(block: Block): string {
  switch (block.type) {
    case 'doc': return (block.data as DocBlockData)?.title || 'Untitled Document';
    case 'kanban': return `Kanban (${(block.data as KanbanBlockData)?.columns?.length || 0} cols)`;
    case 'inbox': return `Inbox (${(block.data as InboxBlockData)?.items?.length || 0})`;
    case 'checklist': return (block.data as ChecklistBlockData)?.title || 'Checklist';
    case 'table': return `Table (${(block.data as TableBlockData)?.rows?.length || 0} rows)`;
    case 'text': {
      const d = block.data as TextBlockData;
      return (d?.content?.slice(0, 30) || 'Text Note') + ((d?.content?.length || 0) > 30 ? '...' : '');
    }
    case 'heading': return (block.data as HeadingBlockData)?.content || 'Heading';
    case 'folder': return (block.data as FolderBlockData)?.title || 'Folder';
    case 'image': return (block.data as ImageBlockData)?.fileName || 'Image';
    default: return block.type;
  }
}

export function BoardMapSettings({
  boardSettings,
  onUpdateBoardSettings,
  blocks,
  onBlockMetaUpdate,
}: BoardMapSettingsProps) {
  const [boardDescription, setBoardDescription] = useState(boardSettings?.description || '');
  const [newObjective, setNewObjective] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const objectives = boardSettings?.objectives || [];

  const handleSaveBoardDescription = useCallback(() => {
    onUpdateBoardSettings({ description: boardDescription });
  }, [boardDescription, onUpdateBoardSettings]);

  const handleAddObjective = useCallback(() => {
    if (!newObjective.trim()) return;
    const updated = [...objectives, newObjective.trim()];
    onUpdateBoardSettings({ objectives: updated });
    setNewObjective('');
  }, [newObjective, objectives, onUpdateBoardSettings]);

  const handleRemoveObjective = useCallback((index: number) => {
    const updated = objectives.filter((_, i) => i !== index);
    onUpdateBoardSettings({ objectives: updated });
  }, [objectives, onUpdateBoardSettings]);

  const handleAddTag = useCallback((blockId: string, currentTags: string[]) => {
    if (!tagInput.trim()) return;
    const newTags = [...currentTags, tagInput.trim()];
    onBlockMetaUpdate(blockId, { semanticTags: newTags });
    setTagInput('');
  }, [tagInput, onBlockMetaUpdate]);

  const handleRemoveTag = useCallback((blockId: string, currentTags: string[], index: number) => {
    const newTags = currentTags.filter((_, i) => i !== index);
    onBlockMetaUpdate(blockId, { semanticTags: newTags });
  }, [onBlockMetaUpdate]);

  return (
    <div className="space-y-6">
      {/* Board Description */}
      <div>
        <label className="text-sm font-medium text-gray-700">Board Description</label>
        <p className="text-xs text-gray-500 mb-2">Help AI agents understand what this board is for</p>
        <Textarea
          value={boardDescription}
          onChange={(e) => setBoardDescription(e.target.value)}
          onBlur={handleSaveBoardDescription}
          placeholder="Describe the purpose of this board..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      {/* Board Objectives */}
      <div>
        <label className="text-sm font-medium text-gray-700">Objectives</label>
        <p className="text-xs text-gray-500 mb-2">High-level goals for this board</p>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <Target className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-sm flex-1">{obj}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemoveObjective(i)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddObjective(); }}
              placeholder="Add objective..."
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleAddObjective} className="h-8">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Block Metadata Table */}
      <div>
        <label className="text-sm font-medium text-gray-700">Block Metadata</label>
        <p className="text-xs text-gray-500 mb-2">
          Descriptions and roles help AI agents navigate and understand each block
        </p>

        {blocks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No blocks on this board yet</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => {
              const isEditing = editingBlockId === block.id;
              const tags = block.semanticTags || [];

              return (
                <div
                  key={block.id}
                  className="border border-gray-200 rounded-lg p-3 space-y-2"
                >
                  {/* Block header */}
                  <div className="flex items-center gap-2">
                    <div className="text-gray-500 flex-shrink-0">
                      {BLOCK_TYPE_ICONS[block.type]}
                    </div>
                    <span className="text-xs font-medium text-gray-400 uppercase">
                      {BLOCK_TYPE_LABELS[block.type]}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate flex-1">
                      {getBlockName(block)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setEditingBlockId(isEditing ? null : block.id)}
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </Button>
                  </div>

                  {/* Purpose badge */}
                  {block.purpose && !isEditing && (
                    <Badge variant="secondary" className="text-xs">
                      {block.purpose}
                    </Badge>
                  )}

                  {/* Description (read-only or edit) */}
                  {isEditing ? (
                    <div className="space-y-2 pl-6">
                      <div>
                        <label className="text-xs text-gray-500">Description</label>
                        <Input
                          defaultValue={block.description || ''}
                          onBlur={(e) => onBlockMetaUpdate(block.id, { description: e.target.value || undefined })}
                          placeholder="What is this block for?"
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Purpose</label>
                        <Select
                          value={block.purpose || ''}
                          onValueChange={(value) => onBlockMetaUpdate(block.id, { purpose: (value || undefined) as BlockPurpose | undefined })}
                        >
                          <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue placeholder="Select purpose..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PURPOSE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tags</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs gap-1">
                              {tag}
                              <button onClick={() => handleRemoveTag(block.id, tags, i)}>
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editingBlockId === block.id ? tagInput : ''}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(block.id, tags); }}
                            placeholder="Add tag..."
                            className="h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddTag(block.id, tags)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {block.description && (
                        <p className="text-xs text-gray-500 pl-6">{block.description}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-6">
                          {tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!block.description && !block.purpose && tags.length === 0 && (
                        <p className="text-xs text-gray-400 italic pl-6">No metadata set</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
