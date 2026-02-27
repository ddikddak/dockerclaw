// ============================================
// Default Data Generators for Blocks
// ============================================

import type {
  BlockType,
  DocBlockData,
  KanbanBlockData,
  InboxBlockData,
  ChecklistBlockData,
  TableBlockData,
  TextBlockData,
  FolderBlockData,
  ImageBlockData,
  HeadingBlockData,
} from '@/types';

export const DEFAULT_BLOCK_SIZES: Record<BlockType, { w: number; h: number }> = {
  doc: { w: 400, h: 500 },
  kanban: { w: 800, h: 500 },
  inbox: { w: 400, h: 500 },
  checklist: { w: 350, h: 400 },
  table: { w: 600, h: 400 },
  text: { w: 300, h: 150 },
  folder: { w: 350, h: 450 },
  image: { w: 400, h: 350 },
  heading: { w: 400, h: 80 },
};

export function createDefaultDocData(): DocBlockData {
  return {
    title: 'New Document',
    contentMarkdown: '# New Document\n\nStart writing here...',
    tags: [],
  };
}

export function createDefaultKanbanData(): KanbanBlockData {
  const now = new Date().toISOString();
  return {
    columns: [
      { id: crypto.randomUUID(), name: 'Todo', order: 0 },
      { id: crypto.randomUUID(), name: 'Doing', order: 1 },
      { id: crypto.randomUUID(), name: 'Done', order: 2 },
    ],
    cards: [
      {
        id: crypto.randomUUID(),
        columnId: '', // Will be set to first column
        title: 'Welcome to Kanban',
        descriptionMarkdown: 'Drag cards between columns to track progress.',
        priority: 'P2',
        labels: ['getting-started'],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export function createDefaultInboxData(): InboxBlockData {
  const now = new Date().toISOString();
  return {
    items: [
      {
        id: crypto.randomUUID(),
        title: 'Welcome to Inbox',
        bodyMarkdown: 'This is your inbox for capturing ideas, tasks, and outputs from agents.\n\n- Convert items to tasks\n- Convert items to documents\n- Archive when done',
        source: 'user',
        status: 'open',
        createdAt: now,
      },
    ],
  };
}

export function createDefaultChecklistData(): ChecklistBlockData {
  return {
    title: 'Checklist',
    items: [
      { id: crypto.randomUUID(), text: 'First item', checked: false, order: 0 },
      { id: crypto.randomUUID(), text: 'Second item', checked: false, order: 1 },
    ],
  };
}

export function createDefaultTableData(): TableBlockData {
  const col1 = crypto.randomUUID();
  const col2 = crypto.randomUUID();
  const col3 = crypto.randomUUID();
  return {
    columns: [
      { id: col1, name: 'Task', type: 'text' },
      { id: col2, name: 'Status', type: 'text' },
      { id: col3, name: 'Done', type: 'checkbox' },
    ],
    rows: [
      {
        id: crypto.randomUUID(),
        cells: { [col1]: 'Example task', [col2]: 'In progress', [col3]: false },
      },
    ],
  };
}

export function createDefaultTextData(): TextBlockData {
  return {
    content: 'Double-click to edit this text note...',
    fontSize: 14,
    color: '#1f2937',
  };
}

export function createDefaultFolderData(): FolderBlockData {
  return {
    title: 'New Folder',
    items: [], // Empty folder - items must be added by dragging blocks in
    viewMode: 'grid',
  };
}

export function createDefaultHeadingData(): HeadingBlockData {
  return {
    content: '',
    level: 'h1',
    bold: false,
    italic: false,
    underline: false,
    color: '#1f2937',
    align: 'left',
  };
}

export function createDefaultImageData(): ImageBlockData {
  return {
    base64: '',
    caption: '',
    fileName: '',
  };
}

export function createDefaultBlockData(type: BlockType) {
  switch (type) {
    case 'doc':
      return createDefaultDocData();
    case 'kanban':
      return createDefaultKanbanData();
    case 'inbox':
      return createDefaultInboxData();
    case 'checklist':
      return createDefaultChecklistData();
    case 'table':
      return createDefaultTableData();
    case 'text':
      return createDefaultTextData();
    case 'folder':
      return createDefaultFolderData();
    case 'image':
      return createDefaultImageData();
    case 'heading':
      return createDefaultHeadingData();
    default:
      return {};
  }
}
