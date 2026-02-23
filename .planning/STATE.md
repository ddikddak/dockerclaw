---
current_phase: v1-multi-board
last_action: 2026-02-23 09:30 UTC
status: ready-to-start
---

## 🎯 DockerClaw v1 Multi-Board - Status Actual

**Data:** 2026-02-23  
**Concepte:** Múltiples boards minimalistes, cada un amb ID i API Key pròpia  
**Estimació Total:** ~2.5 hores

---

## Visió
- **Board** = Contenidor de documents (té ID + API Key)
- **Agents** = Tenen API Key d'un board específic, fan push a board_id
- **Humans** = Accedeixen a boards via `/boards/{id}`, veuen documents

## Base de Dades (2 taules)
- `Board` (id, name, description, api_key, created_at)
- `Document` (id, board_id, title, content, author, created_at, updated_at)

## API Endpoints
- `GET /api/boards` - Llistar boards
- `POST /api/boards` - Crear board (genera api_key)
- `GET /api/boards/:id` - Obtenir board
- `POST /api/boards/:id/documents` - Crear document (auth via api_key)
- `GET /api/boards/:id/documents` - Llistar documents
- `GET /api/boards/:id/documents/:docId` - Obtenir document

## UI Pages
1. **/** - Dashboard (llistat de boards)
2. **/boards/:id** - Board view (documents)
3. **/boards/:id/documents/:docId** - Document viewer
4. **/agents** - Documentació per agents
5. **/boards/new** - Crear nou board

## Design System
Ultra-minimalista, estil Notion/Linear:
- Fons: `#fafafa` (gris molt clar)
- Text: `#171717` (quasi negre) / `#737373` (secundari)
- Borders: `#e5e5e5`
- Container: `max-width: 720px`, centrat
- Molt whitespace, zero shadows excessius

---

## 📅 Fases d'Implementació

| Fase | Nom | Estimació | Status | Assignat |
|------|-----|-----------|--------|----------|
| 1 | Backend (DB + API) | 45 min | ready-to-start | - |
| 2 | Frontend - Board List | 30 min | pending | - |
| 3 | Frontend - Board View | 45 min | pending | - |
| 4 | Frontend - Agents Page | 15 min | pending | - |
| 5 | Polish & Deploy | 15 min | pending | - |

---

## ✅ Acceptance Criteria Global

- [ ] Usuari pot crear board (genera api_key)
- [ ] Board apareix a la llista
- [ ] Agent pot fer POST a `/api/boards/{id}/documents` amb api_key
- [ ] Document apareix al board immediatament
- [ ] Usuari pot veure llista de documents del board
- [ ] Usuari pot obrir i llegir document
- [ ] Disseny ultra-minimalista (estil Notion/Linear)
- [ ] Zero errors TypeScript
- [ ] Build passa

---

## 🚀 Next Step

**Començar Fase 1: Backend (Database + API)**

Veure: `v1-multi-board-PLAN.md` per especificacions completes.
