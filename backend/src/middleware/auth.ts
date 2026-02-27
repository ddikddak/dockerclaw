import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';

export interface AuthenticatedRequest extends Request {
  board?: {
    id: string;
    name: string;
    apiKey: string;
  };
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  try {
    const board = await prisma.board.findUnique({
      where: { apiKey },
      select: { id: true, name: true, apiKey: true }
    });

    if (!board) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    req.board = board;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
