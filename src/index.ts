import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import agentsRouter from './routes/agents';
import templatesRouter from './routes/templates';
import cardsRouter from './routes/cards';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agents', agentsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/cards', cardsRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'DockerClaw API',
    version: '1.0.0',
    description: 'Agent-to-Human Communication Platform',
    endpoints: {
      health: '/health',
      agents: '/api/agents',
      templates: '/api/templates',
      cards: '/api/cards',
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 DockerClaw API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
