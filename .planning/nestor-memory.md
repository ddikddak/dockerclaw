# Nestor Memory — DockerClaw v1

## Mapa del Codi

### Estructura Frontend
```
frontend/src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Dashboard amb infinite canvas
│   ├── settings/keys/page.tsx
│   └── layout.tsx
├── components/
│   ├── Canvas.tsx           # (deprecated - usar canvas/)
│   ├── Card.tsx             # Card complet (per vista detall)
│   ├── layout/
│   │   ├── Sidebar.tsx      # Sidebar amb links i user menu
│   │   └── MainLayout.tsx   # Layout base sidebar + content
│   ├── canvas/
│   │   ├── InfiniteCanvas.tsx  # Canvas infinit amb zoom/pan
│   │   └── CanvasCard.tsx      # Card draggable al canvas
│   ├── ActivityTimeline.tsx
│   ├── Notifications.tsx
│   ├── ui/                  # shadcn/ui components
│   └── card/                # Card subcomponents
├── lib/
│   ├── api.ts               # API client (Supabase)
│   ├── store.ts             # Zustand store (canvas + board)
│   └── supabase.ts          # Supabase client
└── hooks/
    └── useSSE.ts            # SSE hook
```

### Estructura Backend
```
backend/src/
├── routes/
│   ├── keys.ts              # API keys management
│   └── ...                  # Altres rutes
├── middleware/
│   └── auth.ts              # Auth middleware
└── index.ts                 # App entry
```

### Database (Supabase)
- **Card**: id, template_id, agent_id, data, status, x, y, created_at, updated_at
- **Template**: id, name, schema, created_at
- **Comment**: id, card_id, content, author_*, created_at
- **Reaction**: id, card_id, emoji, author_*
- **ApiKey**: id, name, keyHash, isActive

## Fases v1 — Plan de Treball

### FASE 1: UI Base + Canvas Miro (Hores 1-4)
**Objectiu:** Layout amb sidebar + canvas infinit estil Miro

**Fitxers creats/modificats:**
- ✅ `src/components/layout/Sidebar.tsx` (nou)
- ✅ `src/components/layout/MainLayout.tsx` (nou)
- ✅ `src/components/canvas/InfiniteCanvas.tsx` (nou)
- ✅ `src/components/canvas/CanvasCard.tsx` (nou)
- ✅ `src/app/page.tsx` (modificar)
- ✅ `src/lib/store.ts` (ja tenia canvas state)
- ✅ `migrations/001_add_card_coordinates.sql` (migration)
- ✅ Eliminats: `Column.tsx`, `DndProvider.tsx`

**Acceptance Criteria:**
- [x] Sidebar visible amb tots els links
- [x] Canvas amb grid visible
- [x] Zoom funciona (Ctrl+scroll)
- [x] Pan funciona (drag)
- [x] Cards es mostren a la seva posició x,y
- [x] Cards es poden arrossegar per moure-les
- [x] Posició persisteix a Supabase

---

### FASE 2: Sistema de Tags (Hores 5-6)
**Objectiu:** Tags per organitzar cards

**Fitxers:**
- Migration: `tags` array a Card
- `src/components/TagInput.tsx` (nou)
- `src/components/TagFilter.tsx` (nou)
- Modificar `Card.tsx` per mostrar tags
- RLS policies per user_id

---

### FASE 3: Editor de Templates (Hores 7-12)
**Objectiu:** Crear templates amb components

**Fitxers:**
- `src/app/templates/page.tsx` (llistat)
- `src/app/templates/new/page.tsx` (editor)
- `src/components/template/TemplateEditor.tsx`
- `src/components/template/ComponentBuilder.tsx`
- `src/components/template/ComponentPreview.tsx`

**Components de template:**
- text (short/long)
- checklist
- image
- code

---

### FASE 4: Cards com Documents (Hores 13-18)
**Objectiu:** Crear/veure/editar cards omplint templates

**Fitxers:**
- `src/components/card/CardForm.tsx` (formulari dinàmic)
- `src/components/card/CardDocument.tsx` (vista read-only)
- `src/app/cards/[id]/page.tsx` (vista card)
- `src/app/cards/new/page.tsx` (crear card)
- Modificar `CanvasCard.tsx` per preview

---

### FASE 5: API per Agents (Hores 19-20)
**Objectiu:** Documentació i verificació endpoints

**Fitxers:**
- `src/app/docs/api/page.tsx` (pàgina docs)
- Verificar endpoints backend funcionen
- Exemples de codi (curl, Python, Node)

---

### FASE 6: Polish (Hores 21-24)
**Objectiu:** Animacions, responsive, gestió errors

**Fitxers:**
- Animacions Framer Motion
- Responsive sidebar (drawer mòbil)
- Error boundaries
- Toast notifications
- Empty states

## Històric de Canvis

### 2026-02-22 — FASE 1 Completa: Canvas Miro
- **Fase:** 1 (UI Base)
- **Estat:** ✅ COMPLETADA
- **Canvis:** 
  - Sidebar amb links i user menu (col·lapsable)
  - Canvas infinit amb grid pattern
  - Zoom (Ctrl+scroll) i pan (middle click / space+drag)
  - Cards draggables amb posició x,y persistent
  - Migració database: columnes x, y a Card
  - Eliminats components kanban (Column, DndProvider)
- **Commit:** "feat: implement infinite canvas with sidebar and draggable cards"
- **Àrees de Risc:** Cap - tot funciona correctament

### 2026-02-22 — Inici v1: Canvas Miro
- **Fase:** 1 (UI Base)
- **Estat:** En progrés
- **Canvis:** Refactor complet de kanban a canvas infinit
- **Àrees de Risc:** Posició x,y de cards, zoom/pan performance

## Àrees de Risc (Regressions Probables)

⚠️ **Posició de cards** — Canvi de kanban columns a x,y coordinates
⚠️ **Drag & drop** — Nova llibreria o implementació custom
⚠️ **Zoom/Pan** — Performance amb moltes cards
⚠️ **Store** — Zustand store refactor

## Tasks Actives

- [x] FASE 1: UI Base + Canvas Miro (COMPLETADA)
- [ ] FASE 2: Sistema de Tags  
- [ ] FASE 3: Editor de Templates
- [ ] FASE 4: Cards com Documents
- [ ] FASE 5: API per Agents
- [ ] FASE 6: Polish

## Decisions Tècniques Preses

1. **✅ Drag & drop:** Implementació custom amb mouse events (més simple i control total)
2. **✅ Zoom/Pan:** Implementació custom amb CSS transform (scale + translate)
3. **✅ Grid:** CSS background-image amb radial-gradient
4. **✅ State:** Zustand store existent ampliat amb selectedCardId

## Decisions Tècniques Pendents

1. **Llibreria drag & drop per FASE 4:** @dnd-kit si cal més potència

## Notes per Nestor

- ELIMINAR codi kanban (Column, Board tradicional)
- MANTENIR Card.tsx però adaptar-lo a nova UI
- USAR Framer Motion per animacions suaus
- PERSISTIR x,y a Supabase (migration necessària)
- TESTAR zoom/pan amb 50+ cards (performance)
