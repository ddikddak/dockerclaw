---
milestone: 1
status: in-progress
---

# Roadmap - DockerClaw

## Fases (MVP Focus)

### 01-frontend-setup
- Status: ready
- Goal: Setup Next.js + Tailwind + shadcn/ui + deploy Vercel
- Success Criteria: 
  - Repo GitHub creat
  - Next.js corre localment
  - Deployat a Vercel (hello world)
- REQ-IDs: Setup

### 02-api-local
- Status: pending
- Goal: API Express.js local que llegeixi workspace
- Success Criteria:
  - Endpoint `/api/status` retorna info del workspace
  - Llegeix `.planning/STATE.md`
  - Llegeix `~/projects/`
- REQ-IDs: REQ-001

### 03-dashboard-ui
- Status: pending
- Goal: UI Dashboard bàsic
- Success Criteria:
  - Mostra estat workspace
  - Llistar agents
  - Llistar projectes
  - Connecta amb API local
- REQ-IDs: REQ-001, REQ-002, REQ-003

### 04-kanban
- Status: pending
- Goal: Board Kanban functional
- Success Criteria:
  - Columnes: Ready, In Progress, Review, Done
  - Veure tasques GSD
  - UI macOS-style
- REQ-IDs: REQ-005

### 05-control
- Status: pending
- Goal: Crear/Editar tasques, assignar agents
- Success Criteria:
  - Formulari nova tasca
  - Assignar a Nestor/Albert
  - Actualitzar GSD files
- REQ-IDs: REQ-006, REQ-007

### 06-polish
- Status: pending
- Goal: Real-time, responsive, polish
- Success Criteria:
  - SSE per updates
  - Mobile usable
  - UI clean
- REQ-IDs: REQ-009, REQ-010, REQ-011
