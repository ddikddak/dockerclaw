import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { createCardSchema } from '../lib/validation';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = createCardSchema.safeParse(req.body);
    
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

    const { template_id, data } = result.data;

    const template = await prisma.template.findFirst({
      where: {
        id: template_id,
        agent_id: req.agent.id,
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found or not owned by this agent' });
      return;
    }

    const card = await prisma.card.create({
      data: {
        template_id,
        agent_id: req.agent.id,
        data: data as any,
        status: 'pending',
      },
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const cards = await prisma.card.findMany({
      where: {
        agent_id: req.agent.id,
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({ cards });
  } catch (error) {
    console.error('List cards error:', error);
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

    const card = await prisma.card.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
      include: {
        template: true,
      },
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    res.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
