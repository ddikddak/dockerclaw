---
name: DockerClaw
description: Plataforma de comunicació Agent-to-Human amb templates, boards i components
alias: claw2human | C2H
created: 2026-02-19
status: active
---

# DockerClaw (C2H) — Agent-to-Human Communication Platform

## Core Value
Pont de comunicació estructurada entre agents AI i humans. Templates reutilitzables, boards visualitzables, feedback loop integrat.

## Conceptes Clau

### 1. Templates (Creats per Agents)
Estructura reutilizable definida per l'agent:
- **Schema:** Quins components té (text, code, image, checklist, actions)
- **Config:** Títol, descripció, qui pot usar-lo
- **Versioning:** Evolució del template

### 2. Boards (On els Humans Veuen)
- **Tauler visual** on arriben les "cards" omplertes
- **Columnes:** Tipus Kanban (Pendent, En Revisió, Aprovat, etc.)
- **Filtres:** Per template, per agent, per data, per status

### 3. Components (Building Blocks)
Conjunt limitat de components per començar:

| Component | Descripció | Exemple d'ús |
|-----------|-----------|--------------|
| `text` | Markdown/RichText | Documents, explicacions |
| `code` | Codi amb syntax highlight | Snippets, reviews |
| `image` | Imatges/Screenshots | UI mockups, captures |
| `checklist` | Llista de checkpoints | TODOs, verificacions |
| `actions` | Botons d'acció | Approve, Reject, Comment |
| `data` | JSON estructurat | Mètriques, configs |
| `link` | URLs amb preview | Referències externes |

### 4. Cards (Instàncies de Templates)
Un cop un agent omple un template → es crea una **card** que va a un **board**.

## Casos d'Ús (Priories)

1. **Document Review** — Agent escriu doc → Human revisa i aprova
2. **Code Review** — Agent envia PR summary → Human review amb botons
3. **Bug Report** — Agent detecta bug → Human prioritza i assigna
4. **Daily Standup** — Agent resumeix feina → Human veu progress
5. **To-Do List** — Agent crea tasks → Human completa i marqua

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKERCLAW PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  AGENTS     │───→│  TEMPLATES  │───→│   CARDS     │     │
│  │  (API)      │    │  (Schema)   │    │ (Instàncies)│     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │            │
│                                                ▼            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    BOARDS (UI)                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │Columna 1│  │Columna 2│  │Columna 3│  ...        │   │
│  │  │[Cards]  │  │[Cards]  │  │[Cards]  │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  HUMANS ←──interactuen──→ CARDS ←──feedback──→ AGENTS      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Requisits

### MVP - Fase 1 (Core Platform)
- REQ-001: API per agents crear templates (JSON schema)
- REQ-002: Components bàsics: text, code, checklist, actions
- REQ-003: API per agents crear cards (omplir templates)
- REQ-004: Boards amb columnes (Kanban style)
- REQ-005: UI web per humans veure i interactuar amb cards

### Fase 2 (Rich Components)
- REQ-006: Component `image` (upload + display)
- REQ-007: Component `data` (JSON viewer)
- REQ-008: Rich text editor per component `text`
- REQ-009: Syntax highlighting per `code`

### Fase 3 (Advanced)
- REQ-010: Real-time updates (WebSocket/SSE)
- REQ-011: Comments a cards
- REQ-012: History/audit log
- REQ-013: Notifications (email/webhook)

### Fase 4 (Scale)
- REQ-014: Multi-user / Auth
- REQ-015: Permisos (qui pot veure/què)
- REQ-016: Template marketplace

## Stack

**Backend:**
- Node.js + Express (API per agents)
- PostgreSQL (templates, cards, boards)
- Prisma ORM

**Frontend:**
- Next.js 14 + Tailwind
- shadcn/ui components
- TipTap editor (rich text)

**Real-time:**
- Server-Sent Events (inicial)
- WebSocket (futur)

## Decisions
- DEC-001: Començar amb components limitats (text, code, checklist, actions)
- DEC-002: No auth al principi (simplificar)
- DEC-003: Kanban boards per defecte (UI familiar)
- DEC-004: API REST simple per agents (POST/GET)
- DEC-005: Iterar ràpid, components addicionals a Fase 2

## API Endpoints (Draft)

```
# Templates
POST   /api/templates              # Crear template
GET    /api/templates              # Llistar templates
GET    /api/templates/:id          # Veure template

# Cards
POST   /api/cards                  # Crear card (omplir template)
GET    /api/cards                  # Llistar cards (per board)
PATCH  /api/cards/:id              # Update card status
POST   /api/cards/:id/actions      # Human action (approve, etc.)

# Boards
GET    /api/boards                 # Llistar boards
GET    /api/boards/:id             # Veure board amb cards

# Events (feedback to agents)
GET    /api/events                 # Poll events
POST   /api/webhooks/configure     # Webhook per events
```
