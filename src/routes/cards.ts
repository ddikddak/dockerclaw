import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { createCardSchema, updateCardSchema } from '../lib/validation';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper function to generate tag color based on hash
function getTagColor(tag: string): string {
  const colors = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-lime-100 text-lime-800 border-lime-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-rose-100 text-rose-800 border-rose-200',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Helper to normalize tags
function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 0 && tag.length <= 30)
    .slice(0, 10); // Max 10 tags
}

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

    const { template_id, data, tags } = result.data;

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

    const normalizedTags = normalizeTags(tags);

    const card = await prisma.card.create({
      data: {
        template_id,
        agent_id: req.agent.id,
        data: data as any,
        status: 'pending',
        tags: normalizedTags,
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

    const { tags, search } = req.query;

    // Build where clause
    const where: any = {
      agent_id: req.agent.id,
    };

    // Filter by tags if provided
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = {
        hasEvery: tagArray,
      };
    }

    // Search by title or content
    if (search && typeof search === 'string') {
      where.OR = [
        {
          data: {
            path: ['title'],
            string_contains: search,
          },
        },
        {
          data: {
            path: ['content'],
            string_contains: search,
          },
        },
      ];
    }

    const cards = await prisma.card.findMany({
      where,
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

// Get all unique tags for the current agent
router.get('/tags/list', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const cards = await prisma.card.findMany({
      where: {
        agent_id: req.agent.id,
        tags: {
          isEmpty: false,
        },
      },
      select: {
        tags: true,
      },
    });

    // Extract unique tags
    const allTags = new Set<string>();
    cards.forEach(card => {
      card.tags.forEach(tag => allTags.add(tag));
    });

    res.json({ tags: Array.from(allTags).sort() });
  } catch (error) {
    console.error('List tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update card tags
router.patch('/:id/tags', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { tags } = req.body;

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'Tags must be an array' });
      return;
    }

    const normalizedTags = normalizeTags(tags);

    const card = await prisma.card.updateMany({
      where: {
        id,
        agent_id: req.agent.id,
      },
      data: {
        tags: normalizedTags,
      },
    });

    if (card.count === 0) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // Return updated card
    const updatedCard = await prisma.card.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
      include: {
        template: true,
      },
    });

    res.json(updatedCard);
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update card (including tags)
router.patch('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.agent) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = updateCardSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, tags, status } = result.data;

    const updateData: any = {};
    if (data !== undefined) updateData.data = data;
    if (tags !== undefined) updateData.tags = normalizeTags(tags);
    if (status !== undefined) updateData.status = status;

    const card = await prisma.card.updateMany({
      where: {
        id,
        agent_id: req.agent.id,
      },
      data: updateData,
    });

    if (card.count === 0) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // Return updated card
    const updatedCard = await prisma.card.findFirst({
      where: {
        id,
        agent_id: req.agent.id,
      },
      include: {
        template: true,
      },
    });

    res.json(updatedCard);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
