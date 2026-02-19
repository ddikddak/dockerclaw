import { z } from 'zod';

export const registerAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  webhook_url: z.string().url('Invalid webhook URL').optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  schema: z.any().refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Schema must be a valid object',
  }),
});

export const createCardSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  data: z.any().refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Data must be a valid object',
  }),
});

export const apiKeyHeaderSchema = z.object({
  'x-api-key': z.string().min(1, 'API key is required'),
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
