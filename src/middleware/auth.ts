import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  agent?: {
    id: string;
    name: string;
    email: string;
    api_key: string;
    webhook_url: string | null;
    created_at: Date;
  };
}

export async function validateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: 'API key is required in X-API-Key header' });
    return;
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { api_key: apiKey },
    });

    if (!agent) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    req.agent = agent;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    // P2001 = record not found, other Prisma validation errors
    // These are client errors (400/401), not server errors (500)
    if (
      error instanceof Error && 
      (error.name === 'PrismaClientKnownRequestError' || 
       error.name === 'PrismaClientValidationError')
    ) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
