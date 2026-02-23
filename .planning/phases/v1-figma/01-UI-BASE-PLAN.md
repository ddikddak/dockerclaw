# Fase 1: UI Base + Arquitectura - PLAN

**Data:** 2026-02-22  
**Goal:** Layout amb sidebar + llista visual estil Figma  
**Estimació:** 1-2 dies

---

## Task 1: Revisar i netejar codi antic
**Files:** Tota la codebase frontend  
**Desc:** Revisar/suprimir codi de kanban que no s'usarà a v1

- [ ] Revisar components de kanban (Column, Board kanban)
- [ ] Identificar què es pot reutilitzar vs eliminar
- [ ] Preparar estructura de carpetes nova

**Criteri d'èxit:** Codi antic identificat, estructura preparada.

---

## Task 2: Component Sidebar
**Files:** `frontend/src/components/Sidebar.tsx`  
**Desc:** Sidebar col·lapsable amb navegació principal

- [ ] Logo DockerClaw
- [ ] Links: Dashboard, Templates, API Docs, Settings
- [ ] User menu (logout)
- [ ] Botó col·lapsar/expandir
- [ ] Responsive: transformar en drawer a mòbil

**Criteri d'èxit:** Sidebar funcional amb transicions suaus.

---

## Task 3: Component MainLayout
**Files:** `frontend/src/components/MainLayout.tsx`  
**Desc:** Layout base que inclou Sidebar + content area

- [ ] Estructura: Sidebar + Main Content
- [ ] Responsive breakpoints
- [ ] Padding i marges consistents
- [ ] Suport per breadcrumbs (futur)

**Criteri d'èxit:** Layout responsive que funciona a desktop i mòbil.

---

## Task 4: Component CardList
**Files:** `frontend/src/components/CardList.tsx`  
**Desc:** Llista de cards estil Figma files (grid/llista)

- [ ] Vista grid (default) amb thumbnails
- [ ] Vista llista (opcional toggle)
- [ ] Empty state quan no hi ha cards
- [ ] Loading skeleton

**Disseny inspiració Figma:**
- Thumbnail/preview de la card
- Títol destacat
- Tags (petits, colorits)
- Data de creació
- Template usat (badge)

**Criteri d'èxit:** Llista mostra cards amb preview visual.

---

## Task 5: Component CardItem
**Files:** `frontend/src/components/CardItem.tsx`  
**Desc:** Item individual de card a la llista

- [ ] Preview/thumbnail (primera imatge o text)
- [ ] Títol de la card
- [ ] Tags (max 3 visibles)
- [ ] Data de creació (format relatiu: "2h ago")
- [ ] Template badge
- [ ] Hover effects (elevació, shadow)
- [ ] Click per anar a detall

**Criteri d'èxit:** CardItem visualment atractiu i informatiu.

---

## Task 6: Components UI Base
**Files:** `frontend/src/components/ui/*`  
**Desc:** Components base necessaris

- [ ] `EmptyState` - Il·lustració + text + CTA
- [ ] `SearchBar` - Input de cerca amb icona
- [ ] `TagBadge` - Badge de tag petit i colorit
- [ ] `SkeletonCard` - Loading state per CardItem

**Criteri d'èxit:** Tots els components UI base funcionen.

---

## Task 7: Animacions Base
**Files:** CSS/Tailwind configs, components  
**Desc:** Animacions suaus a tot arreu

- [ ] Transicions de pàgina (fade, 200ms)
- [ ] Hover effects a cards (elevació, scale lleuger)
- [ ] Loading skeletons amb pulse animation
- [ ] Sidebar col·lapse/expand (slide, 300ms ease-out)

**Criteri d'èxit:** UI té animacions polishades.

---

## Task 8: Rutes i Navegació
**Files:** `frontend/src/app/`  
**Desc:** Configurar rutes de la v1

- [ ] `/` - Dashboard (llistat de cards)
- [ ] `/templates` - Llistat de templates
- [ ] `/templates/new` - Crear template (placeholder)
- [ ] `/templates/[id]/edit` - Editar template (placeholder)
- [ ] `/cards/new` - Crear card (placeholder)
- [ ] `/cards/[id]` - Vista card (placeholder)
- [ ] `/docs/api` - Documentació API (placeholder)

**Criteri d'èxit:** Navegació entre pàgines funciona amb sidebar.

---

## Success Criteria

- [ ] Sidebar col·lapsable funcional
- [ ] Layout responsive (desktop + mòbil)
- [ ] Llista de cards mostra dades correctament
- [ ] Animacions suaus implementades
- [ ] Navegació entre pàgines funciona
- [ ] Build passa sense errors

---

## Notes

- **No implementar funcionalitat completa encara** - només UI i placeholders
- **Reutilitzar** components existents quan sigui possible (Card, Modal, etc.)
- **Tailwind + shadcn/ui** ja estan configurats
- **Icones:** usar Lucide React (ja instal·lat)

---

## Deliverable
Navegació funcional amb sidebar, layout responsive, i llista visual de cards estil Figma.
