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

### Frontend (Next.js 15 + React 19 + TypeScript)
```
dockerclaw-web/frontend/
├── package.json              # Frontend dependencies
├── next.config.ts            # Next.js config
├── src/
│   ├── app/
│   │   ├── api/sse/route.ts  # SSE API route
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── Canvas.tsx        # Figma-like infinite canvas
│   │   ├── Grid.tsx          # Dot grid background
│   │   ├── ZoomControls.tsx  # Zoom in/out buttons
│   │   ├── Board.tsx         # Kanban board container
│   │   ├── Column.tsx        # Kanban column
│   │   ├── Card.tsx          # Draggable card
│   │   ├── DndProvider.tsx   # @dnd-kit context
│   │   ├── Providers.tsx     # App providers wrapper
│   │   ├── ui/               # shadcn/ui components
│   │   └── card/             # Card content components
│   │       ├── TextComponent.tsx
│   │       ├── CodeComponent.tsx
│   │       └── ChecklistComponent.tsx
│   ├── hooks/
│   │   └── useSSE.ts         # SSE real-time hook
│   └── lib/
│       ├── api.ts            # API client
│       ├── store.ts          # Zustand stores
│       ├── query-client.ts   # TanStack Query client
│       ├── supabase.ts       # Supabase client
│       └── utils.ts          # Utilities
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

## Frontend Stack

### Tech Stack
- **Framework**: Next.js 15.1 + React 19
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Drag-Drop**: @dnd-kit/core + sortable
- **State**: Zustand
- **Data Fetching**: TanStack Query v5
- **Database**: Supabase (PostgreSQL)

### Components Principals

#### Canvas (`components/Canvas.tsx`)
- Fons gris (#F5F5F5) amb grid de puntets
- Zoom amb Ctrl+Scroll (0.1x - 3x)
- Pan amb Space+Drag o middle mouse
- Animacions fluides amb Framer Motion

#### Board (`components/Board.tsx`)
- 3 columnes: Todo, In Progress, Done
- Integració amb @dnd-kit
- SSE per updates temps real
- Polling fallback amb TanStack Query

#### Card (`components/Card.tsx`)
- Draggable amb @dnd-kit/sortable
- 3 tipus de contingut: text, code, checklist
- Preview segons tipus

#### ZoomControls (`components/ZoomControls.tsx`)
- Botons +/- per zoom
- Indicador de percentatge
- Reset zoom button

### Keyboard Shortcuts
- **Space + Drag**: Pan canvas
- **Ctrl + Scroll**: Zoom in/out
- **Middle mouse**: Pan canvas

## Històric de Canvis

### 2025-02-19 - Phase 02 Frontend Foundation
- Setup Next.js 15 + React 19 + Tailwind v4 + shadcn/ui
- Configuració Supabase client
- Implementació Canvas Figma-like amb zoom/pan/grid
- Kanban drag-drop amb @dnd-kit
- Card components (Text, Code, Checklist)
- SSE hook per updates temps real
- UI polish (zoom controls, tooltips, animations)
- Build configurat per Vercel

### 2025-02-19 - Phase 01 API Templates
- Setup projecte Node.js + Express + TypeScript
- Configuració Prisma ORM amb PostgreSQL
- Schema de base de dades (Agent, Template, Card, Event)
- Implementació endpoints core
- Middleware d'autenticació amb API Key
- Validació amb Zod

## Patterns i Decisions

### Frontend Patterns
- **Zustand stores separats**: CanvasStore (UI state) i BoardStore (data)
- **Optimistic updates**: UI s'actualitza abans de la resposta API
- **SSR-safe**: Hooks com useSSE comproven `typeof window`
- **Component composition**: Cards renderitzen diferents components segons tipus

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
4. **EventSource SSR**: useSSE comprova `typeof window` per evitar errors SSR
5. **API URL**: Depèn de `NEXT_PUBLIC_API_URL` configurat correctament

## Tasks Pendents
- [ ] Tests unitaris i d'integració
- [ ] Implementar webhooks per notificar agents
- [ ] Afegir paginació a llistats
- [ ] Rate limiting
- [ ] Logs estructurats
- [ ] WebSocket alternativa a SSE
- [ ] Edició inline de cards
- [ ] Filtres i cerca de cards
