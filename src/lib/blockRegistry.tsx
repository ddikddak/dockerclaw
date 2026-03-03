// ============================================
// Block Registry - Centralized block component registration
// Type-safe factory for rendering block components
// ============================================

import type { ComponentType, ReactNode } from 'react';
import { 
  DocBlock, 
  KanbanBlock, 
  InboxBlock, 
  ChecklistBlock, 
  TableBlock, 
  TextBlock, 
  ImageBlock, 
  HeadingBlock, 
  FolderBlock 
} from '@/components/blocks';
import type { 
  BlockType, 
  BlockData, 
  DocBlockData, 
  KanbanBlockData, 
  InboxBlockData, 
  ChecklistBlockData,
  TableBlockData,
  TextBlockData,
  ImageBlockData,
  HeadingBlockData,
  FolderBlockData
} from '@/types';

// ============================================
// Block Configuration Types
// ============================================

export interface BlockConfig {
  component: ComponentType<BlockComponentProps<BlockData>>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  chromeless: boolean;
  resizable: boolean;
  label: string;
  icon?: string;
}

export interface BlockComponentProps<T extends BlockData> {
  data: T;
  onUpdate: (updates: Partial<T>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
  connectedBlocks?: string[];
  onCardMoveToBlock?: (card: { id: string; title?: string; [key: string]: unknown }, targetBlockId: string) => void;
  allBlocks?: { id: string; type: BlockType; data: BlockData }[];
  onConvertToTask?: (item: { id: string; title: string; bodyMarkdown: string }) => void;
  onConvertToDoc?: (item: { id: string; title: string; bodyMarkdown: string }) => void;
}

// ============================================
// Type-safe block data mapping
// ============================================

export type BlockDataMap = {
  doc: DocBlockData;
  kanban: KanbanBlockData;
  inbox: InboxBlockData;
  checklist: ChecklistBlockData;
  table: TableBlockData;
  text: TextBlockData;
  image: ImageBlockData;
  heading: HeadingBlockData;
  folder: FolderBlockData;
};

// ============================================
// Block Registry
// ============================================

export const blockRegistry: Record<BlockType, BlockConfig> = {
  doc: {
    component: DocBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 400, h: 500 },
    minSize: { w: 200, h: 150 },
    chromeless: false,
    resizable: true,
    label: 'Document',
  },
  kanban: {
    component: KanbanBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 600, h: 400 },
    minSize: { w: 300, h: 200 },
    chromeless: false,
    resizable: true,
    label: 'Kanban Board',
  },
  inbox: {
    component: InboxBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 350, h: 400 },
    minSize: { w: 250, h: 200 },
    chromeless: false,
    resizable: true,
    label: 'Inbox',
  },
  checklist: {
    component: ChecklistBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 350, h: 400 },
    minSize: { w: 200, h: 150 },
    chromeless: false,
    resizable: true,
    label: 'Checklist',
  },
  table: {
    component: TableBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 600, h: 400 },
    minSize: { w: 300, h: 200 },
    chromeless: false,
    resizable: true,
    label: 'Table',
  },
  text: {
    component: TextBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 300, h: 200 },
    minSize: { w: 150, h: 100 },
    chromeless: false,
    resizable: true,
    label: 'Note',
  },
  image: {
    component: ImageBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 400, h: 300 },
    minSize: { w: 100, h: 100 },
    chromeless: false,
    resizable: true,
    label: 'Image',
  },
  heading: {
    component: HeadingBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 300, h: 40 },
    minSize: { w: 100, h: 24 },
    chromeless: true,
    resizable: false,
    label: 'Heading',
  },
  folder: {
    component: FolderBlock as ComponentType<BlockComponentProps<BlockData>>,
    defaultSize: { w: 400, h: 300 },
    minSize: { w: 200, h: 150 },
    chromeless: false,
    resizable: true,
    label: 'Folder',
  },
};

// ============================================
// Type Guards
// ============================================

export function isChromelessBlock(type: BlockType): boolean {
  return blockRegistry[type]?.chromeless ?? false;
}

export function isResizableBlock(type: BlockType): boolean {
  return blockRegistry[type]?.resizable ?? true;
}

// ============================================
// Block Rendering
// ============================================

export function getBlockComponent(type: BlockType): ComponentType<BlockComponentProps<BlockData>> | null {
  return blockRegistry[type]?.component ?? null;
}

export function getBlockDefaultSize(type: BlockType): { w: number; h: number } {
  return blockRegistry[type]?.defaultSize ?? { w: 300, h: 200 };
}

export function getBlockMinSize(type: BlockType): { w: number; h: number } {
  return blockRegistry[type]?.minSize ?? { w: 100, h: 100 };
}

export function getBlockLabel(type: BlockType): string {
  return blockRegistry[type]?.label ?? type;
}

// ============================================
// Unknown Block Fallback
// ============================================

export function UnknownBlock({ type }: { type: string }): ReactNode {
  return (
    <div className="p-4 text-gray-500">
      <p className="font-semibold">Unknown block type: {type}</p>
      <p className="text-sm mt-1">This block type is not supported.</p>
    </div>
  );
}
