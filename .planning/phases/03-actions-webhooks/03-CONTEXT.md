---
phase: 03-actions-webhooks
discussed: 2026-02-19
questions: 5
---

# 03-Actions & Webhooks - Context

## Decisions Preses (5 Preguntes)

### Pregunta 1: Mètode de comunicació
**Elecció:** Polling (GET) per agents

**Arquitectura:**
- Human fa acció → Next.js API Route → Update Supabase DB
- Agent fa GET /api/events per rebre updates

### Pregunta 2: Scope d'accions
**Elecció:** Complet

**Accions disponibles:**
- Card-level: `approve`, `reject`, `delete`, `archive`, `move`
- Component-level: `edit_text`, `toggle_check`, `add_comment`

### Pregunta 3: UX/UI d'accions
**Elecció:** Accions inherents als components

**Disseny:**
| Component | Acció | Interacció |
|-----------|-------|------------|
| Card | approve/reject/delete | Botons visibles |
| Checklist | toggle_check | Clic directe checkbox |
| Text | edit_text | Edició in-place |
| Code | edit_code | Edició in-place |
| Card | move | Drag-drop entre columnes |

### Pregunta 4: Backend
**Elecció:** Next.js API Routes + Supabase (tot a Vercel)

**Arquitectura:**
- Frontend: Next.js 15 (Vercel)
- API Routes: `/api/*` endpoints
- Database: Supabase (PostgreSQL)
- Agent: Polling a `/api/agents/:id/events`

### Pregunta 5: Nivell de qualitat
**Elecció:** Complet (2-3 dies)

**Inclou:**
- Totes les accions implementades
- Testing complet
- UI polish
- Documentació

## Característiques a Implementar

### Must Have (Fase 03 Completa)
- [ ] API Routes per accions:
  - POST /api/cards/:id/actions (card-level)
  - POST /api/cards/:id/components/:componentId/actions (component-level)
  - GET /api/agents/:id/events (polling endpoint)
- [ ] Update Supabase schema per accions
- [ ] Edició in-place de text i code
- [ ] Toggle checkboxes directe
- [ ] Botons approve/reject/delete visibles
- [ ] Drag-drop per moure entre columnes
- [ ] Polling hook per agents
- [ ] Documentació API per agents externs

### Tech Stack
```
Next.js 15 (API Routes)
Supabase (PostgreSQL)
Prisma ORM
Zod (validació)
React Query (server state)
```

## Decisions Tècniques

### Estat de cards (workflow)
```
pending → in_progress → approved/rejected
   ↑         ↓              ↓
   └─────────┴──────────────┘
        (delete/archive)
```

### Schema d'accions a Supabase
```typescript
interface Action {
  id: string;
  card_id: string;
  agent_id: string;
  type: 'card_action' | 'component_action';
  action: string; // 'approve', 'reject', 'edit_text', etc.
  payload: JSON;
  created_at: timestamp;
  status: 'pending' | 'processed';
}
```

## Notes

**Backend ja funciona:** Fase 01 (Express) però migrem a Next.js API Routes
**Frontend ja funciona:** Fase 02 (Canvas Figma-like + Kanban)
**Ara toca:** Tancar el loop amb accions i polling
