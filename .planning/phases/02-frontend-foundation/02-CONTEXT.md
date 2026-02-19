---
phase: 02-frontend-foundation
discussed: 2026-02-19
questions: 5
---

# 02-Frontend Foundation - Context

## Decisions Preses (5 Preguntes)

### Pregunta 1: Stack
**Elecció:** Next.js 15 + React 19 + Tailwind v4 + shadcn/ui

**Rationale:** 
- Recomanat per recerca 2025 (sub-agent)
- Turbopack = 10x més ràpid dev
- React 19 = 2x més ràpid re-renders
- Ecosistema més madur

### Pregunta 2: Scope/Features
**Elecció:** Board drag-and-drop, desktop-first, estil taula/Figma

**Rationale:**
- Canvas infinit tipus Figma
- Drag-drop de cards entre columnes
- Desktop-first (no mobile inicialment)

### Pregunta 3: UX/UI
**Elecció:** Figma-like

**Característiques:**
- Fons gris
- Cards blanques amb ombra suau
- Minimalista, clean
- Zoom infinit (wheel zoom)
- Grid/fons de puntets (com Figma)

### Pregunta 4: Integracions
**Elecció:** Tot a Vercel

**Arquitectura:**
```
Vercel
├── Frontend: Next.js 15 (App Router)
├── API Routes: /api/*
└── Database: Supabase (PostgreSQL)
```

**Comunicació:**
- Agent → POST a `/api/cards`
- Frontend → Polling/SSE a `/api/cards`
- Human → POST a `/api/cards/:id/actions`
- Agent → GET a `/api/agents/:id/events`

### Pregunta 5: Riscos/Temps
**Elecció:** Opció C - Fet bé (2-3 dies)

**Nivell de qualitat:**
- Zoom infinit (com Figma)
- Animacions fluides (framer-motion)
- Real-time SSE (Server-Sent Events)
- Performance optimizada
- Kanban professional

## Característiques a Implementar

### Must Have (Fase 02)
- [ ] Canvas infinit amb zoom (wheel + buttons)
- [ ] Grid de fons (puntets com Figma)
- [ ] Columnes drag-and-drop (react-beautiful-dnd o @dnd-kit)
- [ ] Cards amb components: text, code, checklist
- [ ] SSE per updates temps real
- [ ] Connexió a API Express existent

### Tech Stack Detallat
```
Next.js 15.1+ (App Router)
React 19
Tailwind CSS v4
shadcn/ui (components)
Framer Motion (animacions)
@dnd-kit/core (drag-drop)
TanStack Query v5 (server state)
Supabase (PostgreSQL)
```

## Decisions Tècniques

### Estat de cards
- `pending` → Nova card
- `in_progress` → Human l'està revisant
- `approved` → Human ha aprovat
- `rejected` → Human ha rebutjat

### Accions humans
- `approve` → Aprovar card
- `reject` → Rebutjar card
- `move` → Moure entre columnes
- `edit` → Editar contingut (futur)

## Notes

**Backend ja funciona:** Nestor va completar Fase 01 (Express + Prisma + PostgreSQL)
**URL Backend:** A integrar (polling a API existent)
**Deploy target:** Vercel
