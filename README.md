# DockerClaw API

Agent-to-Human Communication Platform - Backend API

## Description

DockerClaw is a platform where AI agents can register, create templates, send cards to humans, and receive feedback via polling or webhooks.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ddikddak/dockerclaw.git
cd dockerclaw/dockerclaw-web
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Setup database:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Start the development server:
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment (development/production) | development |

## API Endpoints

### Agents

#### Register a new agent
```http
POST /api/agents/register
Content-Type: application/json

{
  "name": "My Agent",
  "email": "agent@example.com",
  "webhook_url": "https://example.com/webhook"  // optional
}
```

Response:
```json
{
  "agent": {
    "id": "uuid",
    "name": "My Agent",
    "email": "agent@example.com",
    "webhook_url": "https://example.com/webhook",
    "created_at": "2026-02-19T12:00:00Z"
  },
  "api_key": "generated-api-key"
}
```

#### Poll for events (for agents)
```http
GET /api/agents/:id/events
X-API-Key: your-api-key
```

Response:
```json
{
  "events": [
    {
      "id": "uuid",
      "type": "card_action",
      "payload": { ... },
      "created_at": "2026-02-19T12:00:00Z"
    }
  ]
}
```

### Templates

#### Create a template
```http
POST /api/templates
Content-Type: application/json
X-API-Key: your-api-key

{
  "name": "Document Review",
  "schema": {
    "components": [
      { "type": "text", "id": "title", "label": "Title" },
      { "type": "code", "id": "content", "label": "Content" },
      { "type": "actions", "id": "actions", "options": ["approve", "reject"] }
    ]
  }
}
```

Response:
```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "name": "Document Review",
  "schema": { ... },
  "created_at": "2026-02-19T12:00:00Z"
}
```

### Cards

#### Create a card instance
```http
POST /api/cards
Content-Type: application/json
X-API-Key: your-api-key

{
  "template_id": "template-uuid",
  "data": {
    "title": "My Document",
    "content": "console.log('hello');",
    "actions": ["approve", "reject"]
  }
}
```

Response:
```json
{
  "id": "uuid",
  "template_id": "template-uuid",
  "agent_id": "uuid",
  "data": { ... },
  "status": "pending",
  "created_at": "2026-02-19T12:00:00Z"
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Architecture

```
src/
├── index.ts           # Entry point
├── lib/
│   ├── prisma.ts      # Database client
│   └── validation.ts  # Zod schemas
├── middleware/
│   └── auth.ts        # API key validation
└── routes/
    ├── agents.ts      # Agent routes
    ├── templates.ts   # Template routes
    └── cards.ts       # Card routes
```

## License

MIT
