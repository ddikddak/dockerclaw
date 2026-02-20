import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { sendWebhook } from '../lib/webhook';

const router = Router();

// GET /api/cards/:id/reactions - Listar reactions d'una card amb count
router.get('/:id/reactions', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Verificar que la card existeix
    const card = await prisma.card.findUnique({
      where: { id },
    });
    
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    
    // Obtenir totes les reactions
    const reactions = await prisma.reaction.findMany({
      where: { card_id: id },
      orderBy: { created_at: 'asc' },
    });
    
    // Agrupar per emoji amb count
    const grouped = reactions.reduce<Record<string, { emoji: string; count: number; userReacted: boolean; reactions: typeof reactions }>>((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
          reactions: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].reactions.push(reaction);
      
      // Verificar si l'usuari actual ha reaccionat
      const userId = req.user?.id;
      if (userId && reaction.author_id === userId) {
        acc[reaction.emoji].userReacted = true;
      }
      
      return acc;
    }, {} as Record<string, { emoji: string; count: number; userReacted: boolean; reactions: typeof reactions }>);
    
    res.json({ 
      reactions,
      grouped: Object.values(grouped),
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cards/:id/reactions - Afegir/eliminar reaction (toggle)
router.post('/:id/reactions', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { emoji, author_type = 'human', author_id, author_name } = req.body;
    
    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }
    
    // Validar emojis permesos
    const allowedEmojis = ['👍', '❤️', '🎉', '🚀', '👀', '✅'];
    if (!allowedEmojis.includes(emoji)) {
      res.status(400).json({ error: 'Invalid emoji. Allowed: ' + allowedEmojis.join(', ') });
      return;
    }
    
    // Verificar que la card existeix
    const card = await prisma.card.findUnique({
      where: { id },
      include: { agent: true },
    });
    
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    
    // Obtenir info de l'usuari autenticat
    const finalAuthorId = author_id || req.user?.id || 'anonymous';
    const finalAuthorName = author_name || req.user?.email || 'Anonymous';
    const finalAuthorType = author_type === 'agent' ? 'agent' : 'human';
    
    // Verificar si ja existeix una reacció igual
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        card_id: id,
        author_id: finalAuthorId,
        emoji: emoji,
      },
    });
    
    if (existingReaction) {
      // Eliminar reacció existent (toggle off)
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
      
      res.json({ 
        success: true, 
        action: 'removed',
        message: 'Reaction removed',
      });
    } else {
      // Crear nova reacció
      const reaction = await prisma.reaction.create({
        data: {
          card_id: id,
          author_type: finalAuthorType,
          author_id: finalAuthorId,
          emoji: emoji,
        },
      });
      
      // Enviar webhook a l'agent
      if (card.agent?.webhook_url) {
        await sendWebhook(card.agent.webhook_url, {
          event: 'component_action',
          action: 'add_reaction',
          card_id: id,
          data: {
            emoji: reaction.emoji,
            author_type: finalAuthorType,
            author_id: finalAuthorId,
            author_name: finalAuthorName,
            reaction_id: reaction.id,
            created_at: reaction.created_at,
          },
        });
      }
      
      res.status(201).json({ 
        success: true, 
        action: 'added',
        reaction,
      });
    }
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
