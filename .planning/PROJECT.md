---
name: DockerClaw
description: Dashboard web per controlar equips d'agents OpenClaw (development focus)
created: 2026-02-19
status: active
---

# DockerClaw

## Core Value
Interfície web ràpida i elegant per visualitzar i controlar agents OpenClaw. Sense fricció, sense auth complexe.

## Arquitectura

```
┌─────────────────┐         ┌─────────────────────────────┐
│   Vercel        │  ←──API──→│   VPS (Ubuntu)              │
│   (Frontend)    │         │   - Workspace OpenClaw      │
│   Next.js       │         │   - API local (express)     │
└─────────────────┘         │   - ~/.openclaw/            │
                            │   - ~/projects/             │
                            └─────────────────────────────┘
```

**Fluxe:** Frontend fa fetch a API local → API llegeix workspace → Retorna JSON → Frontend renderitza.

## Requisits

### Fase 1 - MVP (Dashboard Bàsic)
- REQ-001: Veure estat del workspace (què estic fent jo, El Vell)
- REQ-002: Llistar agents (Nestor, Albert) i el seu estat
- REQ-003: Veure projectes actius
- REQ-004: Veure tasques en progrés (del GSD)

### Fase 2 - Control
- REQ-005: Board Kanban (Ready → In Progress → Review → Done)
- REQ-006: Crear/Editar tasques
- REQ-007: Assignar agents a tasques
- REQ-008: Veure logs/històric

### Fase 3 - Polish
- REQ-009: UI macOS-style, clean i ràpida
- REQ-010: Real-time updates (SSE/WebSocket)
- REQ-011: Mobile responsive

### Out of Scope (futur)
- REQ-012: Auth (per ara, disabled)
- REQ-013: Multi-usuari
- REQ-014: Persistència a DB (només visualització workspace)

## Decisions
- DEC-001: Frontend Next.js + Tailwind + shadcn/ui (ràpid i macós)
- DEC-002: No auth per ara (simplificar)
- DEC-003: API local Express.js que llegeixi `~/.openclaw/` i `~/projects/`
- DEC-004: Deploy a Vercel (frontend), VPS (API)
- DEC-005: Stack minimal, iterar ràpid

## Stack
- **Frontend:** Next.js 14, Tailwind, shadcn/ui
- **Backend:** Express.js (API local a VPS)
- **Connexió:** HTTP API (Vercel → VPS via tunnel o IP pública)
- **DB:** Cap (només lectura del filesystem)

## GitHub
- **Repo:** (pendent de crear)
