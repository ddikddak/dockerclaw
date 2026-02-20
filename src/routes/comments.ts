import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { sendWebhook } from '../lib/webhook';

const router = Router();

// GET /api/cards/:id/comments - Listar comentaris d'una card
router.get('/:id/comments', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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
    
    const comments = await prisma.comment.findMany({
      where: { card_id: id },
      orderBy: { created_at: 'desc' },
    });
    
    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cards/:id/comments - Crear nou comentari
router.post('/:id/comments', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { content, author_type = 'human', author_id, author_name } = req.body;
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ error: 'Content is required' });
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
    
    // Obtenir info de l'usuari autenticat si no es proporciona
    const finalAuthorId = author_id || req.user?.id || 'anonymous';
    const finalAuthorName = author_name || req.user?.email || 'Anonymous';
    const finalAuthorType = author_type === 'agent' ? 'agent' : 'human';
    
    const comment = await prisma.comment.create({
      data: {
        card_id: id,
        author_type: finalAuthorType,
        author_id: finalAuthorId,
        author_name: finalAuthorName,
        content: content.trim(),
      },
    });
    
    // Enviar webhook a l'agent
    if (card.agent?.webhook_url) {
      await sendWebhook(card.agent.webhook_url, {
        event: 'component_action',
        action: 'add_comment',
        card_id: id,
        data: {
          content: comment.content,
          author_type: finalAuthorType,
          author_id: finalAuthorId,
          author_name: finalAuthorName,
          comment_id: comment.id,
          created_at: comment.created_at,
        },
      });
    }
    
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cards/:cardId/comments/:commentId - Eliminar comentari
router.delete('/:cardId/comments/:commentId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    // Verificar que l'usuari pot eliminar el comentari (propi o admin)
    const userId = req.user?.id;
    if (comment.author_id !== userId && comment.author_type !== 'human') {
      // TODO: Verificar si l'usuari és admin del workspace
    }
    
    await prisma.comment.delete({
      where: { id: commentId },
    });
    
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
