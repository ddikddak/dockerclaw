import express from 'express'
import cors from 'cors'
import { randomBytes } from 'crypto'
import { prisma } from './lib/prisma'
import { authenticateBoard } from './lib/auth'

const app = express()
app.use(cors())
app.use(express.json())

// GET /api/boards
app.get('/api/boards', async (req, res) => {
  const boards = await prisma.board.findMany({
    include: { _count: { select: { documents: true } } },
    orderBy: { created_at: 'desc' }
  })
  res.json({
    boards: boards.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      document_count: b._count.documents,
      created_at: b.created_at
    }))
  })
})

// POST /api/boards
app.post('/api/boards', async (req, res) => {
  const { name, description } = req.body
  const api_key = `dc_${randomBytes(32).toString('hex')}`
  
  const board = await prisma.board.create({
    data: { name, description, api_key }
  })
  
  res.status(201).json({
    id: board.id,
    name: board.name,
    api_key: board.api_key,
    created_at: board.created_at
  })
})

// GET /api/boards/:id
app.get('/api/boards/:id', async (req, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { documents: true } } }
  })
  if (!board) return res.status(404).json({ error: 'Board not found' })
  
  res.json({
    id: board.id,
    name: board.name,
    description: board.description,
    document_count: board._count.documents,
    created_at: board.created_at
  })
})

// POST /api/boards/:id/documents (AGENTS - requires API Key)
app.post('/api/boards/:id/documents', async (req, res) => {
  const apiKey = req.headers['x-api-key'] as string
  if (!apiKey) return res.status(401).json({ error: 'X-API-Key header required' })
  
  const board = await authenticateBoard(apiKey)
  if (!board || board.id !== req.params.id) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  
  const { title, content, author } = req.body
  const doc = await prisma.document.create({
    data: { board_id: board.id, title, content, author }
  })
  
  res.status(201).json(doc)
})

// GET /api/boards/:id/documents
app.get('/api/boards/:id/documents', async (req, res) => {
  const documents = await prisma.document.findMany({
    where: { board_id: req.params.id },
    orderBy: { created_at: 'desc' }
  })
  
  res.json({
    documents: documents.map(d => ({
      id: d.id,
      title: d.title,
      author: d.author,
      created_at: d.created_at,
      preview: d.content.slice(0, 150) + (d.content.length > 150 ? '...' : '')
    }))
  })
})

// GET /api/boards/:id/documents/:docId
app.get('/api/boards/:id/documents/:docId', async (req, res) => {
  const doc = await prisma.document.findFirst({
    where: { id: req.params.docId, board_id: req.params.id }
  })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  
  res.json(doc)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server on ${PORT}`))
