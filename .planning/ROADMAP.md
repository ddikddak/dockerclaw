# DockerClaw v1 - Roadmap Multi-Board

**Versió:** v1 Multi-Board Minimalista  
**Data:** 2026-02-23  
**Filosofia:** KISS - Keep It Simple, Stupid  
**Documentació:** `v1-multi-board-PLAN.md`

---

## 🎯 Visió

Eina C2H (Computer-to-Human) ultra-simple:
- **Boards** com a contenidors de documents
- Cada board té **API Key** per autenticar agents
- **Documents** en markdown amb autor i data
- **Zero complexitat:** No templates, no components, no tags, no comments

---

## 📅 Fases d'Implementació

### FASE 1: Backend (45 min)
**Status:** ready-to-start  
**Goal:** Database schema + API endpoints

**Tasks:**
- [ ] Crear migració Prisma (Board + Document)
- [ ] Afegir indexos (board_id, created_at)
- [ ] `GET /api/boards` - Llistar boards
- [ ] `POST /api/boards` - Crear board (generar api_key)
- [ ] `GET /api/boards/:id` - Obtenir board
- [ ] `POST /api/boards/:id/documents` - Crear document (auth X-API-Key)
- [ ] `GET /api/boards/:id/documents` - Llistar documents
- [ ] `GET /api/boards/:id/documents/:docId` - Obtenir document
- [ ] Middleware auth per verificar X-API-Key

**Deliverable:** API funcional amb autenticació simple per API key.

---

### FASE 2: Frontend - Board List (30 min)
**Status:** pending  
**Goal:** Pàgina principal amb llistat de boards

**Tasks:**
- [ ] Pàgina `/` - Dashboard
- [ ] Component `BoardList`
- [ ] Component `BoardCard` (nom, descripció, count de documents)
- [ ] Botó "New Board" → modal/form
- [ ] Formulari crear board (nom, descripció opcional)
- [ ] Mostrar api_key després de crear (amb copy button)

**Deliverable:** Usuari pot crear boards i veure'ls en una llista.

---

### FASE 3: Frontend - Board View (45 min)
**Status:** pending  
**Goal:** Veure documents d'un board

**Tasks:**
- [ ] Pàgina `/boards/[id]`
- [ ] Fetch board info + documents
- [ ] Header amb nom del board + botó "Copy API Key"
- [ ] Component `DocumentList`
- [ ] Component `DocumentItem` (títol, preview 150 chars, autor, data)
- [ ] Pàgina `/boards/[id]/documents/[docId]` - Document viewer
- [ ] Render markdown del document
- [ ] Botó "Tornar al board"

**Deliverable:** Usuari pot navegar a un board i veure/lllegir documents.

---

### FASE 4: Frontend - Agents Page (15 min)
**Status:** pending  
**Goal:** Documentació per agents OpenClaw

**Tasks:**
- [ ] Pàgina `/agents`
- [ ] Explicació: "Com enviar documents a un board"
- [ ] Mostrar: necessites `board_id` i `api_key`
- [ ] Endpoint documentat: `POST /api/boards/{board_id}/documents`
- [ ] Header requerit: `X-API-Key: {api_key}`
- [ ] Exemple curl complet amb placeholders
- [ ] Exemple en Node.js/JavaScript

**Deliverable:** Agents poden veure com enviar documents via API.

---

### FASE 5: Polish & Deploy (15 min)
**Status:** pending  
**Goal:** Acabat de polir i desplegar

**Tasks:**
- [ ] Aplicar CSS minimalista (estil Notion/Linear)
- [ ] Verificar responsive (mòbil funciona)
- [ ] Check TypeScript zero errors
- [ ] Build passa (`npm run build`)
- [ ] Deploy backend (Cloud Run)
- [ ] Deploy frontend (Vercel)
- [ ] Test end-to-end: crear board → enviar document via curl → veure a UI

**Deliverable:** v1 completa desplegada i funcional.

---

## 📊 Timeline Resum

| Fase | Nom | Estimació | Deliverable | Status |
|------|-----|-----------|-------------|--------|
| 1 | Backend | 45 min | API funcional | ready-to-start |
| 2 | Board List | 30 min | Dashboard boards | pending |
| 3 | Board View | 45 min | Veure documents | pending |
| 4 | Agents Page | 15 min | Docs per agents | pending |
| 5 | Polish & Deploy | 15 min | v1 producció | pending |

**Total estimat: ~2.5 hores**

---

## ⚠️ Dependencies

```
Fase 1 (Backend)
    ↓
Fase 2 (Board List) - pot començar quan Fase 1 té DB
    ↓
Fase 3 (Board View)
    ↓
Fase 4 (Agents Page) - independent, pot fer-se en paral·lel
    ↓
Fase 5 (Polish & Deploy)
```

---

## 🗑️ ELIMINAR (codi antic no utilitzat)

Després de la implementació, eliminar:
- ❌ Templates
- ❌ Editor de templates  
- ❌ Components (text, checklist, image, code)
- ❌ Drag & drop
- ❌ Tags
- ❌ Comments
- ❌ Reactions
- ❌ SSE / Real-time
- ❌ Activity Log
- ❌ Notifications
- ❌ Complex auth (JWT, sessions)
- ❌ Sidebar complicada
- ❌ Dashboard complex

**Només:** Board list → Board view → Document view

---

## ✅ Acceptance Criteria Global

- [ ] Usuari pot crear board (genera api_key automàticament)
- [ ] Board apareix a la llista del dashboard
- [ ] Agent pot fer POST a `/api/boards/{id}/documents` amb header X-API-Key
- [ ] Document apareix al board immediatament després del POST
- [ ] Usuari pot veure llista de documents d'un board
- [ ] Usuari pot obrir i llegir un document (markdown renderitzat)
- [ ] Disseny ultra-minimalista (estil Notion/Linear)
- [ ] Zero errors TypeScript
- [ ] Build passa sense warnings
- [ ] Desplegat a producció

---

## 🚀 Next Step

**Començar Fase 1: Backend (Database + API)**

Agent assignat: **Nestor** (desenvolupador backend)
