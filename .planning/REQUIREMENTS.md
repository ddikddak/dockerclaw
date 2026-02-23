# REQUIREMENTS.md - DockerClaw v1

**Replanificat:** 2026-02-22  
**Versió:** v1 (UI estil Figma)

---

## Requisits v1

| ID | Descripció | Status | Fase | Verified |
|----|-----------|--------|------|----------|
| **FASE 1: UI Base** |||||
| REQ-V1-001 | Sidebar col·lapsable amb navegació | active | 01-UI-Base | ⬜ |
| REQ-V1-002 | Layout responsive (desktop + mòbil) | active | 01-UI-Base | ⬜ |
| REQ-V1-003 | Llista visual de cards estil Figma | active | 01-UI-Base | ⬜ |
| REQ-V1-004 | CardItem amb preview/thumbnail | active | 01-UI-Base | ⬜ |
| REQ-V1-005 | Animacions i transicions suaus | active | 01-UI-Base | ⬜ |
| **FASE 2: Tags + RLS** |||||
| REQ-V1-006 | Sistema de tags per organitzar cards | pending | 02-Tags | ⬜ |
| REQ-V1-007 | Multi-tenancy amb RLS (user_id) | pending | 02-Tags | ⬜ |
| REQ-V1-008 | Filtres per tags | pending | 02-Tags | ⬜ |
| **FASE 3: Templates** |||||
| REQ-V1-009 | Pàgina llistat de templates | pending | 03-Templates | ⬜ |
| REQ-V1-010 | Editor de templates amb components | pending | 03-Templates | ⬜ |
| REQ-V1-011 | Component Builder (drag & drop) | pending | 03-Templates | ⬜ |
| REQ-V1-012 | Preview en temps real del template | pending | 03-Templates | ⬜ |
| **FASE 4: Cards** |||||
| REQ-V1-013 | Crear card des de template | pending | 04-Cards | ⬜ |
| REQ-V1-014 | Formulari dinàmic segons components | pending | 04-Cards | ⬜ |
| REQ-V1-015 | Vista de card com a document | pending | 04-Cards | ⬜ |
| REQ-V1-016 | Edició de cards | pending | 04-Cards | ⬜ |
| REQ-V1-017 | Cerca i filtres al dashboard | pending | 04-Cards | ⬜ |
| **FASE 5: API Agents** |||||
| REQ-V1-018 | API key autenticació per agents | pending | 05-API | ⬜ |
| REQ-V1-019 | Endpoint crear card via API | pending | 05-API | ⬜ |
| REQ-V1-020 | Documentació API a `/docs/api` | pending | 05-API | ⬜ |
| REQ-V1-021 | Exemples de codi (curl, Python, Node) | pending | 05-API | ⬜ |
| **FASE 6: Polish** |||||
| REQ-V1-022 | Empty states amigables | pending | 06-Polish | ⬜ |
| REQ-V1-023 | Toast notifications | pending | 06-Polish | ⬜ |
| REQ-V1-024 | Gestió d'errors graceful | pending | 06-Polish | ⬜ |
| REQ-V1-025 | Responsive complet (mòbil) | pending | 06-Polish | ⬜ |

---

## Requisits Heretats (Ja Implementats)

Aquests requisits de fases anteriors ja funcionen i es mantenen:

| ID | Descripció | Status |
|----|-----------|--------|
| REQ-LEG-001 | Component `text` (markdown) | ✅ Complete |
| REQ-LEG-002 | Component `code` amb syntax highlight | ✅ Complete |
| REQ-LEG-003 | Component `checklist` | ✅ Complete |
| REQ-LEG-004 | Component `image` (upload + display) | ✅ Complete |
| REQ-LEG-005 | Comments als cards | ✅ Complete |
| REQ-LEG-006 | Reactions (emoji) | ✅ Complete |
| REQ-LEG-007 | Webhook system | ✅ Complete |

---

## Requisits Archivats (No v1)

Aquests requisits queden FORA de la v1 (possiblement v2):

| ID | Descripció | Raó |
|----|-----------|-----|
| REQ-ARC-001 | Real-time updates (SSE) | Prioritat baixa per v1 |
| REQ-ARC-002 | History/audit log | Prioritat baixa per v1 |
| REQ-ARC-003 | Notifications in-app | Prioritat baixa per v1 |
| REQ-ARC-004 | Kanban board amb columnes | Reemplaçat per llista Figma |
| REQ-ARC-005 | Status workflow (pending/done) | Reemplaçat per tags |
| REQ-ARC-006 | Assignació d'usuaris | Fora d'abast v1 |
| REQ-ARC-007 | Template marketplace | Fora d'abast v1 |

---

## Traçabilitat

- **Document de disseny:** v1-figma-plan.md
- **Detalls de fases:** v1-fases-detall.md
- **Plan actual:** phases/v1-figma/01-UI-BASE-PLAN.md
