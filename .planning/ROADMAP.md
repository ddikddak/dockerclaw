---
milestone: 1
status: in-progress
---

# Roadmap - DockerClaw (C2H)

## Fase 1 — Core Platform (MVP)
**Goal:** Agents poden crear templates, omplir cards, humans veuen boards

### 01-api-templates
- Status: ready
- Tasks:
  - [ ] Setup Node.js + Express + PostgreSQL
  - [ ] Model Template (schema JSONB)
  - [ ] Endpoints: POST/GET templates
  - [ ] Validació de schema de components
- REQ-IDs: REQ-001

### 02-api-cards
- Status: pending
- Tasks:
  - [ ] Model Card (instància de template)
  - [ ] Endpoint crear card (omplir template)
  - [ ] Endpoint llistar cards per board
  - [ ] Validació de dades vs template schema
- REQ-IDs: REQ-003

### 03-components-basic
- Status: pending
- Tasks:
  - [ ] Component `text` (markdown)
  - [ ] Component `code` (text pla inicial)
  - [ ] Component `checklist` (array de items)
  - [ ] Component `actions` (botons: approve, reject)
- REQ-IDs: REQ-002, REQ-004

### 04-frontend-boards
- Status: pending
- Tasks:
  - [ ] Setup Next.js + shadcn/ui
  - [ ] Vista Board (Kanban columns)
  - [ ] Card component (render components)
  - [ ] Accions humans (click botons → API)
- REQ-IDs: REQ-005

## Fase 2 — Rich Components
**Goal:** Components visuals i rics

### 05-components-rich
- [ ] Component `image` (upload + display)
- [ ] Component `code` amb syntax highlight
- [ ] Component `text` amb rich editor (TipTap)
- [ ] Component `data` (JSON viewer)
- REQ-IDs: REQ-006, REQ-007, REQ-008, REQ-009

## Fase 3 — Real-time & Polish
**Goal:** Experiència fluida

### 06-realtime
- [ ] Server-Sent Events per updates
- [ ] Comments a cards
- [ ] History/audit log
- REQ-IDs: REQ-010, REQ-011, REQ-012

### 07-notifications
- [ ] Webhooks per agents
- [ ] Email notifications (futur)
- REQ-IDs: REQ-013

## Fase 4 — Scale
**Goal:** Multi-user i producció

### 08-auth
- [ ] Auth system
- [ ] Permisos i roles
- REQ-IDs: REQ-014, REQ-015

### 09-marketplace
- [ ] Template marketplace
- [ ] Template sharing
- REQ-IDs: REQ-016
