# DockerClaw v1 - Pla d'Implementació

## 🎯 Visió de la v1
Una eina d'automatització C2H (Computer-to-Human) on:
- **Humans** creen templates i gestionen cards
- **Agents** (AI/automatitzacions) creen cards via API
- **UI estil Figma** - llista de tasques visual, no kanban tradicional

---

## 📋 Funcionalitats v1

### 1. Gestió de Templates
**Pàgina:** `/templates` (nova)

Funcionalitats:
- [ ] Llistar templates existents
- [ ] Crear nou template (nom + descripció)
- [ ] Editor de components per template:
  - Afegir component `text`
  - Afegir component `checklist`
  - Afegir component `image`
  - Afegir component `code`
  - Reordenar components (drag & drop)
  - Eliminar components
- [ ] Preview del template

**Schema de Template:**
```json
{
  "id": "uuid",
  "name": "Bug Report",
  "description": "Template per reportar bugs",
  "components": [
    { "type": "text", "label": "Títol", "required": true },
    { "type": "text", "label": "Descripció", "multiline": true },
    { "type": "checklist", "label": "Passos per reproduir", "items": ["", "", ""] },
    { "type": "image", "label": "Screenshot" }
  ]
}
```

### 2. Creació Manual de Cards
**Pàgina:** `/cards/new` o modal des de `/`

Funcionalitats:
- [ ] Seleccionar template
- [ ] Formulari dinàmic segons components del template
- [ ] Omplir dades
- [ ] Preview abans de crear
- [ ] Crear card

### 3. Creació de Cards per Agents (API)
**Backend:** Endpoints ja existeixen, cal documentació

### 4. Documentació per Agents
**Pàgina:** `/docs/api` (nova)

Contingut:
- [ ] Intro: Què és DockerClaw i com funciona
- [ ] Com obtenir API key
- [ ] Endpoints disponibles:
  - `POST /api/cards` - Crear card
  - `GET /api/cards` - Llistar cards
  - `GET /api/templates` - Llistar templates
  - `POST /api/cards/:id/comments` - Afegir comentari
- [ ] Exemples de codi (curl, Python, Node.js)
- [ ] Webhooks: com rebre notificacions

### 5. UI/UX - Estil Figma
**Canvis principals:**

#### Menu Lateral
- [ ] Sidebar col·lapsable
- [ ] Seccions:
  - Dashboard (board principal)
  - Templates
  - API Docs
  - Settings

#### Board - Llista Visual (estil Figma)
- [ ] No més kanban columns
- [ ] Llista de cards amb:
  - Thumbnail/preview
  - Títol + descripció curta
  - Status (badge de color)
  - Data de creació
  - Assignat a (si aplica)
- [ ] Filtres ràpids (status, template, data)
- [ ] Buscar
- [ ] Animacions suaus:
  - Hover effects
  - Transicions entre vistes
  - Skeleton loading

#### Moviment Dinàmic
- [ ] Drag & drop per reordenar cards (prioritat)
- [ ] Swipe gestures (mòbil)
- [ ] Keyboard shortcuts:
  - `N` - Nova card
  - `T` - Nova template
  - `Cmd+K` - Command palette (buscar)

---

## 🏗️ Arquitectura de Dades

### Taules Supabase necessàries:
- [x] `Template` - ja existeix
- [x] `Card` - ja existeix
- [ ] `TemplateComponent` (nova) - o bé guardar com JSON a Template
- [ ] `ActivityLog` (nova) - per audit log

---

## 📅 Ordre d'Implementació

### Fase 1: UI Base (1-2 dies)
1. Crear layout amb sidebar
2. Refactor board a llista visual
3. Animacions i transicions

### Fase 2: Templates (2-3 dies)
1. Pàgina de llistat de templates
2. Crear/editar template
3. Editor de components

### Fase 3: Cards Millorat (1-2 dies)
1. Crear card des de template
2. Formulari dinàmic
3. Vista de detall de card

### Fase 4: API Docs (1 dia)
1. Pàgina de documentació
2. Exemples de codi
3. Swagger/OpenAPI (opcional)

### Fase 5: Poliment (1 dia)
1. Responsive
2. Animacions finals
3. Gestió d'errors

**Total estimat: 6-9 dies**

---

## 🎨 Referències UI

### Inspiració Figma:
- Llista de tasques amb thumbnails
- Sidebar minimalista
- Animacions suaus (300ms ease-out)
- Colors: grisos suaus + accent color (blau/indigo)

### Components necessaris:
- Sidebar
- CardList (en lloc de Kanban)
- CardItem (preview)
- TemplateEditor
- ComponentBuilder
- APIDocsViewer

---

## ❓ Preguntes per aclarir

1. **Estructura de templates:** Vols components predefinits o totalment personalitzables?
2. **Status de cards:** Quins status vols? (Pendent, En progrés, Fet, Arxivat)
3. **Assignació:** Les cards es poden assignar a usuaris?
4. **Prioritat:** Les cards tenen prioritat (P0, P1, P2)?
5. **Etiquetes/Tags:** Sistema de tags per organitzar?

---

## ✅ Acceptació v1

La v1 estarà completa quan:
- [ ] Usuari pot crear templates amb components
- [ ] Usuari pot crear cards manualment
- [ ] Agent pot crear cards via API
- [ ] UI té sidebar + llista visual estil Figma
- [ ] Documentació API accessible a `/docs/api`
- [ ] Tot funciona sense errors crítics
