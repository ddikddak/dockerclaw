# DockerClaw v1 - Pla de Fases Detallat

## 🎯 Concepte Clar
- **Templates** = Blueprints (estructura amb components)
- **Cards** = Documents/Instàncies (template + dades plenes)
- **Sense status** (no kanban)
- **Sense assignació**
- **Amb TAGS** per organitzar
- **Multi-tenancy** (cada usuari veu només les seves cards)

---

## 📅 FASE 1: UI Base + Arquitectura (Dies 1-2)

### 1.1 Setup Projecte
- [ ] Revisar/suprimir codi antic de kanban
- [ ] Netejar components no necessaris
- [ ] Preparar estructura de carpetes nova

### 1.2 Layout Base (Sidebar + Main)
- [ ] Component `Sidebar` (col·lapsable)
  - Logo DockerClaw
  - Links: Dashboard, Templates, API Docs, Settings
  - User menu (logout)
- [ ] Component `MainLayout`
  - Sidebar + content area
  - Responsive (sidebar es transforma en drawer a mòbil)

### 1.3 UI Components Base
- [ ] `CardList` - Llista de cards estil Figma
- [ ] `CardItem` - Preview de card (thumbnail, títol, tags, data)
- [ ] `EmptyState` - Quan no hi ha cards
- [ ] `SearchBar` - Buscar cards
- [ ] `TagFilter` - Filtrar per tags

### 1.4 Animacions Base
- [ ] Transicions de pàgina (fade, slide)
- [ ] Hover effects a cards
- [ ] Loading skeletons

**Deliverable:** Navegació funcional amb sidebar, layout responsive.

---

## 📅 FASE 2: Sistema de Tags (Dia 2)

### 2.1 Database
- [ ] Migration: Afegir `tags` (array de strings) a taula `Card`
- [ ] Migration: Afegir `user_id` a `Card` (RLS)
- [ ] Migration: Afegir `user_id` a `Template` (RLS)

### 2.2 Backend
- [ ] Actualitzar `Card` model amb `tags` i `user_id`
- [ ] Actualitzar `Template` model amb `user_id`
- [ ] Polítiques RLS a Supabase (usuari només veu les seves coses)

### 2.3 Frontend - Tags UI
- [ ] Component `TagInput` - Crear/editar tags (estil GitHub)
- [ ] Component `TagList` - Mostrar tags a la card
- [ ] Filtres per tags a la llista

**Deliverable:** Usuari pot afegir tags a cards i filtrar per tags.

---

## 📅 FASE 3: Templates - Editor (Dies 3-4)

### 3.1 Pàgina Templates
- [ ] Ruta `/templates`
- [ ] Llistat de templates (grid view)
- [ ] Botó "New Template"

### 3.2 Editor de Templates
- [ ] Ruta `/templates/new` i `/templates/[id]/edit`
- [ ] Formulari: Nom, descripció
- [ ] **Component Builder** (el més important):
  - Llista de components del template
  - Afegir component (tipus: text, checklist, image, code)
  - Editar propietats de cada component (label, required, placeholder)
  - Reordenar components (drag & drop)
  - Eliminar component
- [ ] Preview en temps real del template
- [ ] Guardar template

### 3.3 Components de Template
Els components són els "camps" del template:

```typescript
interface TemplateComponent {
  id: string
  type: 'text' | 'checklist' | 'image' | 'code'
  label: string
  required?: boolean
  placeholder?: string
  // Opcions específiques per tipus
  multiline?: boolean        // per text
  language?: string          // per code
  maxFiles?: number          // per image
}
```

**Deliverable:** Usuari pot crear templates amb múltiples components.

---

## 📅 FASE 4: Cards - Creació i Visualització (Dies 5-6)

### 4.1 Llistat de Cards (Dashboard)
- [ ] Ruta `/` (dashboard)
- [ ] Mostrar cards en grid/llista (estil Figma files)
- [ ] Cada card mostra:
  - Preview del contingut (primera imatge o text)
  - Títol
  - Tags
  - Data de creació
  - Template usat
- [ ] Filtres: per template, per tags, per data
- [ ] Buscar per text

### 4.2 Crear Card des de Template
- [ ] Ruta `/cards/new`
- [ ] Selector de template
- [ ] Formulari dinàmic basat en components del template:
  - `text` → Input/Textarea
  - `checklist` → Llista de checkboxes
  - `image` → Upload d'imatge
  - `code` → Code editor (simple)
- [ ] Afegir tags
- [ ] Preview abans de guardar
- [ ] Guardar card

### 4.3 Vista de Card (Document)
- [ ] Ruta `/cards/[id]`
- [ ] Mostrar card com a document (no editable inicialment)
- [ ] Renderitzar tots els components amb les dades
- [ ] Botó "Edit" (per edició simple)
- [ ] Botó "Delete"
- [ ] Secció de comentaris (ja existeix)
- [ ] Reaccions (ja existeixen)

### 4.4 Edició de Card
- [ ] Mode edició a `/cards/[id]/edit`
- [ ] Formulari igual que creació
- [ ] Actualitzar dades

**Deliverable:** Usuari pot crear cards omplint templates, veure-les com a documents, i editar-les.

---

## 📅 FASE 5: API per Agents (Dia 7)

### 5.1 Autenticació d'Agents
- [ ] Sistema d'API Keys (ja existeix parcialment)
- [ ] Middleware per validar API key
- [ ] Associar API key a `user_id`

### 5.2 Endpoints API
Ja existeixen, revisar que funcionin:
- [ ] `GET /api/templates` - Llistar templates disponibles
- [ ] `POST /api/cards` - Crear card amb:
  ```json
  {
    "template_id": "uuid",
    "data": { /* dades segons template */ },
    "tags": ["bug", "urgent"]
  }
  ```
- [ ] `GET /api/cards` - Llistar cards (de l'usuari de l'API key)

### 5.3 Pàgina API Docs
- [ ] Ruta `/docs/api`
- [ ] Explicació de com funciona l'API
- [ ] Com obtenir API key
- [ ] Documentació dels endpoints
- [ ] Exemples de codi (curl, Python, Node.js)
- [ ] Swagger UI (opcional)

**Deliverable:** Agent pot crear cards via API amb documentació clara.

---

## 📅 FASE 6: Poliment i Detalls (Dia 8-9)

### 6.1 UX/UI Polish
- [ ] Animacions suaus a tot arreu
- [ ] Empty states amb il·lustracions
- [ ] Tooltips informatius
- [ ] Toast notifications per accions
- [ ] Confirm dialogs per delete

### 6.2 Responsive
- [ ] Test a mòbil
- [ ] Sidebar → drawer a mòbil
- [ ] Touch-friendly interactions

### 6.3 Performance
- [ ] Virtualitzar llistes llargues
- [ ] Lazy loading d'imatges
- [ ] Optimitzar queries Supabase

### 6.4 Gestió d'Errors
- [ ] Error boundaries
- [ ] Missatges d'error amigables
- [ ] Retry mechanisms

**Deliverable:** v1 estable, usable i polished.

---

## 🗓️ Calendari Resum

| Fase | Dies | Deliverable |
|------|------|-------------|
| 1. UI Base | 1-2 | Navegació sidebar + layout |
| 2. Tags | 2 | Sistema de tags funcional |
| 3. Templates | 3-4 | Editor de templates complet |
| 4. Cards | 5-6 | Crear/veure/editar cards |
| 5. API Agents | 7 | API funcional + docs |
| 6. Polish | 8-9 | v1 estable i polished |

**Total: 8-9 dies**

---

## ⚠️ Dependencies entre fases

```
Fase 1 (UI Base)
    ↓
Fase 2 (Tags) - pot fer-se en paral·lel amb Fase 1
    ↓
Fase 3 (Templates) - necessita Fase 1
    ↓
Fase 4 (Cards) - necessita Fase 3
    ↓
Fase 5 (API) - pot fer-se en paral·lel amb Fase 4
    ↓
Fase 6 (Polish) - necessita tot l'anterior
```

---

## 🚀 Inici

**Comencem per Fase 1?** O prefereixes ajustar alguna cosa del pla primer?