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
  user?: {
    id: string;
    email: string;
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
    // Any error during API key validation is an authentication failure
    // Return 401 for all auth errors, never 500
    res.status(401).json({ error: 'Invalid API key' });
  }
}

// Middleware per autenticar usuaris humans via JWT (Supabase)
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Per ara, extraiem l'ID de l'usuari del token JWT
    // En producció, verificaríem la signatura amb la clau de Supabase
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      if (payload.sub) {
        const userEmail = payload.email || payload.preferred_username || 'unknown';
        const userId = payload.sub;
        
        req.user = {
          id: userId,
          email: userEmail,
        };
        
        // Buscar o crear un agent per aquest usuari
        // Això permet que els usuaris humans facin servir els endpoints d'agent
        let agent = await prisma.agent.findUnique({
          where: { email: userEmail },
        });
        
        if (!agent) {
          // Crear un agent per aquest usuari humà
          const crypto = await import('crypto');
          agent = await prisma.agent.create({
            data: {
              name: userEmail.split('@')[0],
              email: userEmail,
              api_key: crypto.randomUUID(),
            },
          });
          console.log(`Created new agent for user: ${userEmail}`);
        }
        
        req.agent = agent;
        next();
        return;
      }
    }
    
    res.status(401).json({ error: 'Invalid authentication token' });
  } catch (error) {
    console.error('User auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
