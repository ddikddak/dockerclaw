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

### 5. Accions (Tancant el Loop)
Les accions són la clau del feedback Agent ↔ Human:

**A. Accions de Template (Global)**
- Afecten tota la card
- Exemples: `approve`, `reject`, `archive`, `delete`
- Resultat: Webhook a l'agent amb `{action: "approved", card_id: "..."}`

**B. Accions de Component (Individual)**
- Afecten un component específic dins la card
- Exemples: `edit_text`, `toggle_check`, `add_comment`
- Resultat: Webhook a l'agent amb `{action: "edit_text", component_id: "...", new_value: "..."}`

### 6. Feedback Loop (Webhooks)

```
AGENT                                         HUMAN
  │                                             │
  │─── POST /cards (crea card) ────────────────→│
  │                                             │
  │←──── Card apareix al Board ─────────────────│
  │                                             │
  │←──── Human fa acció (ex: "Editar text") ────│
  │                                             │
  │←──── Webhook: {action: "edit_text",    ─────│
  │               component_id: "body",         │
  │               new_value: "nou contingut"}   │
  │                                             │
  │─── Agent processa, actualitza card ────────→│
  │                                             │
  │←──── Card actualitzada al Board ────────────│
```

**Exemples de Workflow:**

1. **Document Review amb Edició:**
   - Agent crea card amb template "Document Review"
   - Human llegeix, fa clic a "Editar" (acció de component `text`)
   - Human edita el text, guarda
   - Webhook enviat a agent: `{action: "edit_text", component: "body", value: "..."}`
   - Agent rep el canvi, actualitza el document font, torna a penjar
   - Card es refresca amb nova versió

2. **Aprovació Simple:**
   - Agent crea card "PR Review"
   - Human revisa codi, fa clic a "Approve" (acció de template)
   - Webhook enviat: `{action: "approved", card_id: "...", agent_id: "..."}`
   - Agent rep l'aprovació i fa merge automàticament

3. **Checklist Interactiva:**
   - Agent crea card amb checklist de tasks
   - Human marca items com a fets (accions de component `checklist`)
   - Webhook per cada canvi: `{action: "toggle_check", item_id: "...", checked: true}`
   - Agent actualitza el seu estat intern

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
- REQ-006: **Accions de Template** (approve, reject) amb webhooks
- REQ-007: **Accions de Component** (edit_text, toggle_check) amb webhooks
- REQ-008: **Webhook system** per notificar agents (endpoint configurable per agent)

### Fase 2 (Rich Components & Advanced Actions)
- REQ-009: Component `image` (upload + display)
- REQ-010: Component `data` (JSON viewer)
- REQ-011: Rich text editor per component `text`
- REQ-012: Syntax highlighting per `code`
- REQ-013: **Comments** (acció de component tipus `add_comment`)

### Fase 3 (Real-time & History)
- REQ-014: Real-time updates (WebSocket/SSE)
- REQ-015: History/audit log de totes les accions
- REQ-016: Notifications (email/webhook)

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

# Actions (Humans interactuen)
POST   /api/cards/:id/actions      # Acció de TEMPLATE (approve, reject)
POST   /api/cards/:id/components/:component_id/actions  # Acció de COMPONENT (edit, toggle)

# Webhooks (Agents reben feedback)
POST   /api/agents/:agent_id/webhooks/configure  # Configurar webhook URL
GET    /api/agents/:agent_id/events              # Polling d'events (alternativa)

# Boards
GET    /api/boards                 # Llistar boards
GET    /api/boards/:id             # Veure board amb cards

# Real-time (Fase 3)
GET    /api/stream                 # Server-Sent Events per updates
```

## Exemple de Webhook Payload

**Acció de Template:**
```json
{
  "event": "template_action",
  "timestamp": "2026-02-19T12:00:00Z",
  "card_id": "card_123",
  "template_id": "template_456",
  "agent_id": "nestor",
  "action": "approved",
  "data": {
    "approved_by": "human_user",
    "message": "Looks good!"
  }
}
```

**Acció de Component:**
```json
{
  "event": "component_action",
  "timestamp": "2026-02-19T12:05:00Z",
  "card_id": "card_123",
  "component_id": "body_text",
  "agent_id": "nestor",
  "action": "edit_text",
  "data": {
    "previous_value": "Old content",
    "new_value": "New edited content",
    "edited_by": "human_user"
  }
}
```
