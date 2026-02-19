---
milestone: 1
status: in-progress
---

# Roadmap - DockerClaw (C2H)

## Fase 1 — Core Platform
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
- REQ-IDs: REQ-002

### 04-frontend-boards
- Status: pending
- Tasks:
  - [ ] Setup Next.js + shadcn/ui
  - [ ] Vista Board (Kanban columns)
  - [ ] Card component (render components)
- REQ-IDs: REQ-004, REQ-005

## Fase 2 — Actions & Webhooks (CRÍTIC)
**Goal:** Tancar el feedback loop Agent ↔ Human

### 05-actions
- Status: pending
- Tasks:
  - [ ] Sistema d'accions de Template (approve, reject)
  - [ ] Sistema d'accions de Component (edit_text, toggle_check)
  - [ ] Webhook dispatcher (enviar a agents)
  - [ ] Configuració webhook per agent
- REQ-IDs: REQ-006, REQ-007, REQ-008

## Fase 3 — Rich Components
**Goal:** Components visuals

### 06-rich-components
- [ ] Component `image` (upload + display)
- [ ] Component `code` amb syntax highlight
- [ ] Component `text` amb rich editor (TipTap)
- [ ] Component `data` (JSON viewer)
- REQ-IDs: REQ-009, REQ-010, REQ-011, REQ-012

## Fase 4 — Interactive
**Goal:** Més interactivitat

### 07-interactive
- [ ] Comments (acció add_comment)
- [ ] Reaccions (emoji)
- REQ-IDs: REQ-013

## Fase 5 — Real-time & History
**Goal:** Experiència fluida

### 08-realtime
- [ ] Server-Sent Events per updates
- [ ] History/audit log de totes les accions
- REQ-IDs: REQ-014, REQ-015

### 09-notifications
- [ ] Webhooks avançats
- [ ] Email notifications (futur)
- REQ-IDs: REQ-016

## Fase 6 — Scale
**Goal:** Producció

### 10-scale
- [ ] Auth system
- [ ] Permisos i roles
- REQ-IDs: REQ-017, REQ-018

### 11-marketplace
- [ ] Template marketplace
- [ ] Template sharing
- REQ-IDs: REQ-019
