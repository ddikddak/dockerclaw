import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { registerAgentSchema } from '../lib/validation';
import { validateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/register', async (req, res: Response) => {
  try {
    const result = registerAgentSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, webhook_url } = result.data;
    const api_key = `dk_${uuidv4().replace(/-/g, '')}`;

    const agent = await prisma.agent.create({
      data: {
        name,
        email,
        api_key,
        webhook_url: webhook_url || null,
      },
    });

    res.status(201).json({
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        webhook_url: agent.webhook_url,
        created_at: agent.created_at,
      },
      api_key,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/events', validateApiKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.agent || req.agent.id !== id) {
      res.status(403).json({ error: 'Not authorized to access this agent\'s events' });
      return;
    }

    const events = await prisma.event.findMany({
      where: {
        agent_id: id,
        status: 'pending',
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (events.length > 0) {
      const eventIds = events.map(e => e.id);
      await prisma.event.updateMany({
        where: {
          id: {
            in: eventIds,
          },
        },
        data: {
          status: 'delivered',
        },
      });
    }

    res.json({ events });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
