import { z } from 'zod';

// Agent schemas
export const registerAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  webhook_url: z.string().url('Invalid webhook URL').optional(),
});

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  schema: z.record(z.string(), z.any()).refine((val) => typeof val === 'object' && val !== null, {
    message: 'Schema must be a valid object',
  }),
});

// Card schemas
export const createCardSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  data: z.record(z.string(), z.any()).refine((val) => typeof val === 'object' && val !== null, {
    message: 'Data must be a valid object',
  }),
});

// Card action schemas
export const cardActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete', 'archive', 'move']),
  payload: z.record(z.string(), z.any()).default({}),
});

// Component action schemas
export const componentActionSchema = z.object({
  action: z.enum(['edit_text', 'edit_code', 'toggle_check', 'add_comment']),
  payload: z.record(z.string(), z.any()).default({}),
});

// API Key header schema
export const apiKeyHeaderSchema = z.object({
  'x-api-key': z.string().min(1, 'API key is required'),
});

// Types
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type CardActionInput = z.infer<typeof cardActionSchema>;
export type ComponentActionInput = z.infer<typeof componentActionSchema>;
