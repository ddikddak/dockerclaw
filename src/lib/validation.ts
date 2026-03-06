// ============================================
// Validation - Zod schemas for runtime type safety
// ============================================

import { z } from 'zod';
import type { BlockType, BlockData } from '@/types';

// ============================================
// Base Schemas
// ============================================

export const idSchema = z.string().uuid();

export const timestampSchema = z.string().datetime();

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const sizeSchema = z.object({
  w: z.number().positive(),
  h: z.number().positive(),
});

// ============================================
// Block Data Schemas
// ============================================

export const docBlockSchema = z.object({
  type: z.literal('doc'),
  title: z.string().default('New Document'),
  contentMarkdown: z.string().default('# New Document\n\nStart writing here...'),
  tags: z.array(z.string()).default([]),
});

export const kanbanColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
});

export const kanbanCardSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  title: z.string(),
  descriptionMarkdown: z.string().default(''),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  labels: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const kanbanBlockSchema = z.object({
  type: z.literal('kanban'),
  columns: z.array(kanbanColumnSchema).default([
    { id: 'col-1', name: 'Todo', order: 0 },
    { id: 'col-2', name: 'Doing', order: 1 },
    { id: 'col-3', name: 'Done', order: 2 },
  ]),
  cards: z.array(kanbanCardSchema).default([]),
  properties: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['select', 'text', 'date']),
    options: z.array(z.string()).optional(),
  })).optional(),
});

export const inboxItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  bodyMarkdown: z.string(),
  source: z.enum(['user', 'agent']).default('user'),
  status: z.enum(['open', 'archived']).default('open'),
  createdAt: z.string().datetime(),
  archivedAt: z.string().datetime().optional(),
});

export const inboxBlockSchema = z.object({
  type: z.literal('inbox'),
  items: z.array(inboxItemSchema).default([]),
});

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  order: z.number().int(),
});

export const checklistBlockSchema = z.object({
  type: z.literal('checklist'),
  title: z.string().default('Checklist'),
  items: z.array(checklistItemSchema).default([]),
});

export const tableColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'date', 'checkbox']).default('text'),
});

export const tableRowSchema = z.object({
  id: z.string(),
  cells: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const tableBlockSchema = z.object({
  type: z.literal('table'),
  columns: z.array(tableColumnSchema).default([]),
  rows: z.array(tableRowSchema).default([]),
});

export const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().default(''),
  fontSize: z.number().default(14),
  color: z.string().default('#1f2937'),
});

export const imageBlockSchema = z.object({
  type: z.literal('image'),
  base64: z.string().default(''),
  caption: z.string().default(''),
  fileName: z.string().default(''),
});

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  content: z.string().default(''),
  level: z.enum(['h1', 'h2', 'h3']).default('h1'),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  color: z.string().default('#1f2937'),
  align: z.enum(['left', 'center', 'right']).default('left'),
});

export const folderItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  preview: z.string(),
  createdAt: z.string().datetime(),
});

export const folderBlockSchema = z.object({
  type: z.literal('folder'),
  title: z.string().default('New Folder'),
  items: z.array(folderItemSchema).default([]),
  viewMode: z.enum(['grid', 'list']).default('grid'),
});

// ============================================
// Union Schema for all block types
// ============================================

export const blockDataSchema = z.discriminatedUnion('type', [
  docBlockSchema,
  kanbanBlockSchema,
  inboxBlockSchema,
  checklistBlockSchema,
  tableBlockSchema,
  textBlockSchema,
  imageBlockSchema,
  headingBlockSchema,
  folderBlockSchema,
]);

// ============================================
// Block Schema
// ============================================

export const blockSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  type: z.enum(['doc', 'kanban', 'inbox', 'checklist', 'table', 'text', 'image', 'heading', 'folder']),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  z: z.number().int().default(0),
  locked: z.boolean().default(false),
  agentAccess: z.array(z.string()).default([]),
  description: z.string().optional(),
  purpose: z.enum(['input', 'process', 'output', 'reference', 'dashboard']).optional(),
  semanticTags: z.array(z.string()).default([]),
  data: z.record(z.string(), z.unknown()),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deletedAt: timestampSchema.optional(),
});

// ============================================
// Connection Schema
// ============================================

export const connectionTypeSchema = z.enum(['notify', 'explains', 'displays', 'links']);

export const connectionSchema = z.object({
  id: idSchema,
  fromBlockId: idSchema,
  toBlockId: idSchema,
  fromType: z.enum(['doc', 'kanban', 'inbox', 'checklist', 'table', 'text', 'image', 'heading', 'folder']),
  toType: z.enum(['doc', 'kanban', 'inbox', 'checklist', 'table', 'text', 'image', 'heading', 'folder']),
  type: connectionTypeSchema,
  label: z.string().optional(),
  createdAt: timestampSchema,
});

// ============================================
// Board Schema
// ============================================

export const boardSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  canvas: z.record(z.string(), z.unknown()).optional(),
  settings: z.object({
    agents: z.array(z.unknown()).optional(),
    connections: z.array(z.unknown()).optional(),
  }).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// ============================================
// Validation Functions
// ============================================

export function validateBlockData(type: BlockType, data: unknown): { success: true; data: BlockData } | { success: false; errors: string[] } {
  try {
    let schema: z.ZodType<unknown>;
    
    switch (type) {
      case 'doc':
        schema = docBlockSchema;
        break;
      case 'kanban':
        schema = kanbanBlockSchema;
        break;
      case 'inbox':
        schema = inboxBlockSchema;
        break;
      case 'checklist':
        schema = checklistBlockSchema;
        break;
      case 'table':
        schema = tableBlockSchema;
        break;
      case 'text':
        schema = textBlockSchema;
        break;
      case 'image':
        schema = imageBlockSchema;
        break;
      case 'heading':
        schema = headingBlockSchema;
        break;
      case 'folder':
        schema = folderBlockSchema;
        break;
      default:
        return { success: false, errors: [`Unknown block type: ${type}`] };
    }
    
    const validated = schema.parse(data);
    return { success: true, data: validated as BlockData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`) };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

export function validateBlock(block: unknown): { success: true; data: unknown } | { success: false; errors: string[] } {
  try {
    const validated = blockSchema.parse(block);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`) };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

export function validateConnection(connection: unknown): { success: true; data: unknown } | { success: false; errors: string[] } {
  try {
    const validated = connectionSchema.parse(connection);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`) };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// ============================================
// Safe Parsers (don't throw)
// ============================================

export function safeParseBlockData(type: BlockType, data: unknown): BlockData | null {
  const result = validateBlockData(type, data);
  return result.success ? result.data : null;
}

export function sanitizeBlockData(type: BlockType, data: unknown): BlockData {
  const result = validateBlockData(type, data);
  if (result.success) {
    return result.data;
  }
  
  // Return default data if validation fails
  console.warn(`Block data validation failed for ${type}, using defaults`, result.errors);
  
  switch (type) {
    case 'doc':
      return { title: 'New Document', contentMarkdown: '', tags: [] };
    case 'kanban':
      return { columns: [], cards: [] };
    case 'inbox':
      return { items: [] };
    case 'checklist':
      return { title: 'Checklist', items: [] };
    case 'table':
      return { columns: [], rows: [] };
    case 'text':
      return { content: '' };
    case 'image':
      return { base64: '', caption: '', fileName: '' };
    case 'heading':
      return { content: '', level: 'h1' };
    case 'folder':
      return { title: 'Folder', items: [], viewMode: 'grid' };
    default:
      return {} as BlockData;
  }
}
