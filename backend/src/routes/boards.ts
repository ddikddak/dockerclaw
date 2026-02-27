import { Router } from 'express';
import { prisma } from '../server';
import { authenticateApiKey } from '../middleware/auth';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional()
});

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  author: z.string().min(1).max(100)
});

// Generate API key
function generateApiKey(): string {
  return `dc_${crypto.randomBytes(32).toString('hex')}`;
}

// GET /api/boards - List all boards
router.get('/', async (req, res) => {
  try {
    const boards = await prisma.board.findMany({
      include: {
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      boards: boards.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        document_count: b._count.documents,
        created_at: b.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// POST /api/boards - Create a new board
router.post('/', async (req, res) => {
  try {
    const data = createBoardSchema.parse(req.body);
    const apiKey = generateApiKey();

    const board = await prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        apiKey
      }
    });

    res.status(201).json({
      id: board.id,
      name: board.name,
      description: board.description,
      api_key: board.apiKey,
      created_at: board.createdAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// GET /api/boards/:id - Get board details
router.get('/:id', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { documents: true }
        }
      }
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json({
      id: board.id,
      name: board.name,
      description: board.description,
      api_key: board.apiKey,
      document_count: board._count.documents,
      created_at: board.createdAt
    });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// POST /api/boards/:id/documents - Create document (requires API key)
router.post('/:id/documents', authenticateApiKey, async (req, res) => {
  try {
    // Verify the API key matches the board
    if (req.board!.id !== req.params.id) {
      res.status(403).json({ error: 'API key does not match board' });
      return;
    }

    const data = createDocumentSchema.parse(req.body);

    const document = await prisma.document.create({
      data: {
        boardId: req.params.id,
        title: data.title,
        content: data.content,
        author: data.author
      }
    });

    res.status(201).json({
      id: document.id,
      board_id: document.boardId,
      title: document.title,
      author: document.author,
      created_at: document.createdAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// GET /api/boards/:id/documents - List documents
router.get('/:id/documents', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id }
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { boardId: req.params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        author: true,
        createdAt: true,
        content: true
      }
    });

    res.json({
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        author: d.author,
        created_at: d.createdAt,
        preview: d.content.slice(0, 150) + (d.content.length > 150 ? '...' : '')
      }))
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/boards/:id/documents/:docId - Get single document
router.get('/:id/documents/:docId', async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.docId,
        boardId: req.params.id
      }
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({
      id: document.id,
      board_id: document.boardId,
      title: document.title,
      content: document.content,
      author: document.author,
      created_at: document.createdAt,
      updated_at: document.updatedAt
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

export default router;
