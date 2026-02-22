import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { createTemplateSchema } from '../lib/validation';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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

router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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

router.get('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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

router.patch('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify template belongs to this agent
    const existing = await prisma.template.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const { name, description, components } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (components !== undefined) {
      updateData.schema = { components };
    }

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
    });

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify template belongs to this agent
    const existing = await prisma.template.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await prisma.template.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
