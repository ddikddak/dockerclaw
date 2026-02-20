# Nestor Memory — dockerclaw

## Mapa del Codi

### Backend API (Next.js API Routes)
```
dockerclaw-web/frontend/src/app/api/
├── agents/
│   ├── register/route.ts      # POST /api/agents/register
│   └── [id]/
│       └── events/route.ts    # GET /api/agents/:id/events (polling)
├── cards/
│   ├── route.ts               # GET/POST /api/cards
│   └── [id]/
│       ├── actions/route.ts   # POST /api/cards/:id/actions (card-level)
│       └── components/
│           └── [componentId]/
│               └── actions/route.ts  # POST component-level actions
├── templates/
│   └── route.ts               # GET/POST /api/templates
└── upload/
    └── route.ts               # POST /api/upload (images to Supabase Storage)
```

### Frontend Components
```
dockerclaw-web/frontend/src/components/
├── Canvas.tsx                 # Figma-like infinite canvas
├── Board.tsx                  # Kanban board
├── Column.tsx                 # Kanban column (with mutations)
├── Card.tsx                   # Card with action buttons
└── card/
    ├── index.ts               # Barrel exports
    ├── TextComponent.tsx      # Editable text (in-place editing)
    ├── CodeComponent.tsx      # Editable code with PrismJS syntax highlight
    ├── ChecklistComponent.tsx # Toggle checkboxes
    ├── ImageComponent.tsx     # Upload, preview, lightbox
    ├── RichTextComponent.tsx  # TipTap WYSIWYG editor
    └── DataComponent.tsx      # JSON tree viewer
```

### Library Files
```
dockerclaw-web/frontend/src/lib/
├── api.ts                     # API client with all methods
├── auth.ts                    # API key validation
├── supabase.ts                # Supabase client
└── validation.ts              # Zod schemas
```

## API Endpoints (Next.js API Routes)

| Endpoint | Method | Auth | Descripció |
|----------|--------|------|------------|
| `/api/agents/register` | POST | No | Registrar nou agent |
| `/api/agents/:id/events` | GET | X-API-Key | Polling d'accions |
| `/api/templates` | GET | X-API-Key | Llistar templates |
| `/api/templates` | POST | X-API-Key | Crear template |
| `/api/cards` | GET | X-API-Key | Llistar cards |
| `/api/cards` | POST | X-API-Key | Crear card |
| `/api/cards/:id/actions` | POST | X-API-Key | Card actions (approve, reject, delete, archive, move) |
| `/api/upload` | POST | No | Upload images to Supabase Storage |

## Components Suportats

| Type | Component | Features |
|------|-----------|----------|
| `text` | TextComponent | In-place editing, multiline |
| `code` | CodeComponent | PrismJS syntax highlight, copy button, language detection |
| `checklist` | ChecklistComponent | Toggle checkboxes, progress bar |
| `image` | ImageComponent | Drag-drop upload, preview, lightbox, Supabase Storage |
| `rich_text` | RichTextComponent | TipTap WYSIWYG editor (bold, italic, headings, lists, links) |
| `data` | DataComponent | react-json-view-lite tree view, copy JSON |

### Taules
- **agents**: id, name, email, api_key, webhook_url, created_at
- **templates**: id, agent_id, name, schema, created_at
- **cards**: id, template_id, agent_id, data, status, created_at
- **events**: id, agent_id, type, payload, status, created_at
- **actions**: id, card_id, agent_id, type, action, payload, status, created_at

### SQL Migration (Actions Table)
```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id),
  agent_id UUID REFERENCES agents(id),
  type TEXT CHECK (type IN ('card_action', 'component_action')),
  action TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'processed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Accions Implementades

### Card-Level Actions
- `approve` → status: 'approved'
- `reject` → status: 'rejected'
- `delete` → status: 'deleted'
- `archive` → status: 'archived'
- `move` → canviar columna/status

### Component-Level Actions
- `edit_text` → update card.data.text
- `edit_code` → update card.data.code
- `toggle_check` → toggle checklist item
- `upload_image` → upload image to Supabase Storage
- `add_comment` → afegir comentari

## Frontend Features

### In-Place Editing
- **Text**: Doble clic per editar, Ctrl+Enter per guardar, Esc per cancel·lar
- **Code**: Doble clic per editar, Ctrl+S per guardar, Esc per cancel·lar
- **Rich Text**: Doble clic per editar, toolbar amb bold/italic/headings/lists/links, Ctrl+Enter per guardar
- **Image**: Drag-drop upload, click per lightbox, click icona per canviar

### Action Buttons
- ✅ Approve (green)
- ❌ Reject (red)
- 🗑️ Delete (gray)
- 📋 Archive (gray)

### Toggle Checkboxes
- Click directe per toggle
- Optimistic update (UI first)
- Progress bar visual

### Syntax Highlight
- PrismJS amb tema 'tomorrow'
- Suport: TypeScript, JavaScript, JSX, TSX, Python, Bash, JSON, CSS, SQL, YAML, Markdown
- Copy to clipboard button

### JSON Viewer
- react-json-view-lite amb tree view col·lapsable
- Copy JSON button

## Històric de Canvis

### 2026-02-20 - Phase 04 Rich Components
- Instal·lades dependències: @tiptap/react, prismjs, react-json-view-lite
- Creat ImageComponent amb upload drag-drop, preview, i lightbox
- Actualitzat CodeComponent amb PrismJS syntax highlight i copy button
- Creat RichTextComponent amb TipTap editor WYSIWYG
- Creat DataComponent amb react-json-view-lite per JSON
- Creat endpoint /api/upload per pujar imatges a Supabase Storage
- Actualitzat Card.tsx per suportar nous tipus (image, rich_text, data)
- Actualitzat Column.tsx amb mutations per tots els components
- Afegit sonner per notificacions toast

### 2025-02-20 - Phase 03 Actions & Webhooks
- Migrated Express backend to Next.js API Routes
- Created Actions table in Supabase
- Implemented card-level actions (approve, reject, delete, archive, move)
- Implemented component-level actions (edit_text, edit_code, toggle_check)
- Added polling endpoint for agents: GET /api/agents/:id/events
- Frontend: In-place editing for text and code
- Frontend: Action buttons (approve, reject, delete, archive)
- Frontend: Toggle checkboxes with optimistic updates
- Updated API client with all new methods

### 2025-02-19 - Phase 02 Frontend Foundation
- Setup Next.js 15 + React 19 + Tailwind v4 + shadcn/ui
- Configuració Supabase client
- Implementació Canvas Figma-like amb zoom/pan/grid
- Kanban drag-drop amb @dnd-kit
- Card components (Text, Code, Checklist)

### 2025-02-19 - Phase 01 API Templates
- Setup projecte Node.js + Express + TypeScript
- Configuració Prisma ORM amb PostgreSQL
- Schema de base de dades (Agent, Template, Card, Event)
- Implementació endpoints core
- Middleware d'autenticació amb API Key
- Validació amb Zod

## Patterns i Decisions

### API Routes Pattern
- Validació d'API key via `getApiKeyFromRequest` i `validateApiKey`
- Zod per validació d'entrades
- Supabase per queries a base de dades
- Respostes amb `NextResponse.json()`

### Frontend Patterns
- Components amb `editable` prop per activar edició
- `onSave` i `onToggle` callbacks per comunicar canvis
- Optimistic updates per millor UX
- Framer Motion per animacions

### Seguretat
- API keys al header `X-API-Key`
- Validació que agent només accedeix als seus recursos
- Sanitització d'inputs amb Zod

## Àrees de Risc

1. **Supabase RLS**: Assegurar que Row Level Security estigui configurat correctament
2. **API Key exposure**: Mai exposar al client, usar server-side calls
3. **Polling frequency**: Agents han de fer polling raonable (cada 5-10s)
4. **Race conditions**: Edició simultània de la mateixa card

## Tasks Pendents
- [ ] Configurar RLS policies a Supabase
- [ ] Implementar rate limiting
- [ ] WebSocket alternativa a polling
- [ ] Tests d'integració
