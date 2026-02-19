# Nestor Memory — dockerclaw

## Mapa del Codi

### Backend API (Node.js + Express + TypeScript)
```
dockerclaw-web/
├── package.json              # Dependencies i scripts
├── tsconfig.json             # TypeScript config
├── .env.example              # Variables d'entorn
├── README.md                 # Documentació API
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/
│       └── 20250219190000_init/  # Initial migration
│           └── migration.sql
└── src/
    ├── index.ts              # Entry point Express
    ├── lib/
    │   ├── prisma.ts         # Prisma client singleton
    │   └── validation.ts     # Zod schemas
    ├── middleware/
    │   └── auth.ts           # API key validation
    └── routes/
        ├── agents.ts         # POST /register, GET /:id/events
        ├── templates.ts      # POST /, GET /, GET /:id
        └── cards.ts          # POST /, GET /, GET /:id
```

### Models de Base de Dades (Prisma)
- **Agent**: id, name, email, api_key, webhook_url, created_at
- **Template**: id, agent_id, name, schema (JSON), created_at
- **Card**: id, template_id, agent_id, data (JSON), status, created_at
- **Event**: id, agent_id, type, payload (JSON), status, created_at

### API Endpoints Implementats

| Endpoint | Mètode | Auth | Descripció |
|----------|--------|------|------------|
| `/api/agents/register` | POST | No | Registrar nou agent |
| `/api/agents/:id/events` | GET | X-API-Key | Polling d'events |
| `/api/templates` | POST | X-API-Key | Crear template |
| `/api/templates` | GET | X-API-Key | Llistar templates |
| `/api/templates/:id` | GET | X-API-Key | Veure template |
| `/api/cards` | POST | X-API-Key | Crear card |
| `/api/cards` | GET | X-API-Key | Llistar cards |
| `/api/cards/:id` | GET | X-API-Key | Veure card |
| `/health` | GET | No | Health check |

### Stack Tècnic
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Lenguatge**: TypeScript 5.x
- **ORM**: Prisma 6.x
- **Database**: PostgreSQL 14+
- **Validació**: Zod
- **Auth**: API Key (header X-API-Key)

## Històric de Canvis

### 2025-02-19 - Phase 01 API Templates
- Setup projecte Node.js + Express + TypeScript
- Configuració Prisma ORM amb PostgreSQL
- Schema de base de dades (Agent, Template, Card, Event)
- Implementació endpoints core:
  - POST /api/agents/register
  - POST /api/templates
  - POST /api/cards
  - GET /api/agents/:id/events
- Middleware d'autenticació amb API Key
- Validació amb Zod
- Migracions inicials preparades

## Patterns i Decisions

### Validació
- Zod per validació d'entrades
- Validació d'API key via middleware `validateApiKey`
- Tipus `AuthenticatedRequest` extén Request amb agent

### Base de Dades
- Prisma client com a singleton a `lib/prisma.ts`
- UUIDs per tots els IDs
- JSON per schema de templates i data de cards
- Status per events i cards (pending, delivered)

### Seguretat
- API keys úniques per agent (format: `dk_${uuid}`)
- Validació que agent només accedeix als seus recursos
- Headers CORS configurats

## Àrees de Risc

1. **Tipus JSON de Prisma**: Es fa cast a `any` per evitar errors de tipus
2. **Params d'Express**: Cal cast manual a `{ id: string }` per evitar `string | string[]`
3. **Migrations**: Requereixen PostgreSQL configurat amb DATABASE_URL

## Tasks Pendents
- [ ] Tests unitaris i d'integració
- [ ] Implementar webhooks per notificar agents
- [ ] Afegir paginació a llistats
- [ ] Rate limiting
- [ ] Logs estructurats
