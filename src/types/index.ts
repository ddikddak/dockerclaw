// ============================================
// dockerclaw.app - TypeScript Type Definitions
// ============================================

export type BlockType = 'doc' | 'kanban' | 'inbox' | 'checklist' | 'table' | 'text' | 'folder' | 'image';

// ============================================
// Agent
// ============================================
export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Board
// ============================================
export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: {
    width: number;
    height: number;
  } | null;
  settings?: {
    futureApiKeyId?: string;
    agents?: Agent[];
  };
}

// ============================================
// Block Base
// ============================================
export interface Block {
  id: string;
  boardId: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  locked?: boolean;
  agentAccess?: string[]; // Agent IDs that have access to this block
  data: BlockData;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type BlockData =
  | DocBlockData
  | KanbanBlockData
  | InboxBlockData
  | ChecklistBlockData
  | TableBlockData
  | TextBlockData
  | FolderBlockData
  | ImageBlockData;

// ============================================
// Doc Block
// ============================================
export interface DocBlockData {
  title: string;
  contentMarkdown: string;
  tags?: string[];
}

// ============================================
// Kanban Block
// ============================================
export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  descriptionMarkdown?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanProperty {
  id: string;
  name: string;
  type: 'select' | 'text' | 'date';
  options?: string[];
}

export interface KanbanBlockData {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  properties?: KanbanProperty[];
}

// ============================================
// Inbox Block
// ============================================
export interface InboxItem {
  id: string;
  title: string;
  bodyMarkdown: string;
  source: 'agent' | 'user';
  status: 'open' | 'archived';
  createdAt: string;
}

export interface InboxBlockData {
  items: InboxItem[];
}

// ============================================
// Checklist Block
// ============================================
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface ChecklistBlockData {
  title?: string;
  items: ChecklistItem[];
}

// ============================================
// Table Block
// ============================================
export interface TableColumn {
  id: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'checkbox';
}

export interface TableRow {
  id: string;
  cells: Record<string, any>;
}

export interface TableBlockData {
  columns: TableColumn[];
  rows: TableRow[];
}

// ============================================
// Text Block
// ============================================
export interface TextBlockData {
  content: string;
  fontSize?: number;
  color?: string;
}

// ============================================
// Image Block
// ============================================
export interface ImageBlockData {
  base64?: string;
  caption?: string;
  fileName?: string;
}

// ============================================
// Folder Block - Contains minimized blocks
// ============================================
export type FolderItemType = 'doc' | 'text' | 'kanban' | 'checklist' | 'table' | 'inbox' | 'image';

export interface FolderItem {
  id: string;
  type: FolderItemType;
  title: string;
  preview?: string; // Short preview text
  icon?: string;
  data: Partial<BlockData>; // The actual block data
  createdAt: string;
  updatedAt: string;
}

export interface FolderBlockData {
  id?: string;
  title: string;
  items: FolderItem[];
  viewMode: 'grid' | 'list';
}

// ============================================
// Connection
// ============================================
export type ConnectionType = 'notify' | 'explains' | 'displays' | 'links';

export interface Connection {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  fromType: BlockType;
  toType: BlockType;
  type: ConnectionType;
  label?: string;
  createdAt: string;
}

// ============================================
// Create/Update DTOs
// ============================================
export interface CreateBoardDTO {
  name: string;
  canvas?: { width: number; height: number } | null;
}

export interface UpdateBoardDTO {
  name?: string;
  canvas?: { width: number; height: number } | null;
  settings?: Board['settings'];
}

export interface CreateBlockDTO {
  boardId: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: Partial<BlockData>;
}

export interface UpdateBlockDTO {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  z?: number;
  locked?: boolean;
  agentAccess?: string[];
  data?: Partial<BlockData>;
}

// ============================================
// Board Collaboration
// ============================================
export type CollaboratorRole = 'editor' | 'viewer';
export type InviteStatus = 'pending' | 'accepted';

export interface BoardCollaborator {
  id: string;
  boardId: string;
  userId: string | null;
  email: string;
  role: CollaboratorRole;
  invitedBy: string;
  status: InviteStatus;
  boardName?: string;
  createdAt: string;
  updatedAt: string;
}

export type BoardPermission = 'owner' | 'editor' | 'viewer';

// ============================================
// Export/Import
// ============================================
export interface ExportedBoard {
  board: Board;
  blocks: Block[];
  agents: Agent[];
  connections: Connection[];
  version: string;
  exportedAt: string;
}
