import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { createTemplateSchema } from '../lib/validation';
import { validateApiKey, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = createTemplateSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name, schema } = result.data;

    const template = await prisma.template.create({
      data: {
        agent_id: req.agent.id,
        name,
        schema: schema as any,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const templates = await prisma.template.findMany({
      where: {
        agent_id: req.agent.id,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({ templates });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const template = await prisma.template.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
