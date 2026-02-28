# DockerClaw Agent API (Supabase Edge Functions)

API completa per agents IA per interactuar amb DockerClaw com si fossin humans.

## Desplegament ràpid

```bash
# 1. Instal·lar Supabase CLI
npm install -g supabase

# 2. Linkar projecte
supabase link --project-ref <teu-project-ref>

# 3. Aplicar migracions (crea taula API keys)
supabase db push

# 4. Desplegar TOTES les funcions
supabase functions deploy agent-create-block
supabase functions deploy agent-create-doc
supabase functions deploy agent-list-blocks
supabase functions deploy agent-get-block
supabase functions deploy agent-update-block
supabase functions deploy agent-update-doc
supabase functions deploy agent-update-checklist
supabase functions deploy agent-delete-block
supabase functions deploy agent-generate-key
```

---

## Funcions disponibles

### Generar API Key (des de UI)
```bash
curl -X POST "https://xxx.supabase.co/functions/v1/agent-generate-key" \
  -H "Authorization: Bearer <user_jwt>" \
  -d '{"board_id": "uuid", "name": "Meu Agent", "permissions": ["read", "write", "delete"]}'
```

---

### Crear Blocks

**Crear document (més simple):**
```bash
curl -X POST "https://xxx.supabase.co/functions/v1/agent-create-doc" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "title": "Informe",
    "content": "# Resum\n\nContingut en markdown...",
    "tags": ["urgent"]
  }'
```

**Crear qualsevol tipus de block:**
```bash
curl -X POST "https://xxx.supabase.co/functions/v1/agent-create-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "type": "checklist",
    "title": "Tasques pendents",
    "x": 200, "y": 300
  }'
```

**Tipus disponibles:** `doc`, `text`, `checklist`, `kanban`, `table`, `inbox`, `folder`, `heading`, `image`

---

### Llegir Blocks

**Llistar tots els blocks:**
```bash
curl "https://xxx.supabase.co/functions/v1/agent-list-blocks?board_id=uuid" \
  -H "X-API-Key: dc_agent_xxx"
```

**Obtenir un block específic:**
```bash
curl "https://xxx.supabase.co/functions/v1/agent-get-block?board_id=uuid&block_id=uuid" \
  -H "X-API-Key: dc_agent_xxx"
```

---

### Modificar Documents

**Actualitzar document:**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-doc" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "title": "Nou títol",
    "content": "Nou contingut en markdown"
  }'
```

**Afegir contingut al final (append):**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-doc" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "content": "Això s\'afegirà al final",
    "append": true
  }'
```

---

### Modificar Checklists

**Afegir item:**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-checklist" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "action": "add",
    "text": "Comprar llet"
  }'
```

**Marcar com a fet:**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-checklist" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "action": "check",
    "text": "Comprar llet"
  }'
```

**Accions disponibles:**
- `"add"` - Afegir item (requereix `text`)
- `"check"` - Marcar com a fet (per `item_id` o `text`)
- `"uncheck"` - Desmarcar (per `item_id` o `text`)
- `"toggle"` - Invertir estat
- `"remove"` - Eliminar item (per `item_id` o `text`)
- `"rename"` - Canviar text (requereix `new_text`)

---

### Modificar Qualsevol Block

**Actualitzar posició, mida, o data:**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "x": 500,
    "y": 300,
    "title": "Nou títol"
  }'
```

**Actualitzar text de qualsevol tipus:**
```bash
curl -X PATCH "https://xxx.supabase.co/functions/v1/agent-update-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "content": "Nou contingut"
  }'
```

---

### Eliminar Blocks

**Soft delete (a la paperera):**
```bash
curl -X DELETE "https://xxx.supabase.co/functions/v1/agent-delete-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{"board_id": "uuid", "block_id": "uuid"}'
```

**Eliminar permanentment:**
```bash
curl -X DELETE "https://xxx.supabase.co/functions/v1/agent-delete-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{"board_id": "uuid", "block_id": "uuid", "permanent": true}'
```

---

## Exemples d'ús per Agents

### Exemple 1: Crear informe amb tasques

```bash
#!/bin/bash
API_KEY="dc_agent_xxx"
BOARD_ID="uuid-del-board"
URL="https://xxx.supabase.co/functions/v1"

# Crear document
curl -X POST "$URL/agent-create-doc" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"
    \"board_id\": \"$BOARD_ID\",\"
    \"title\": \"Anàlisi Setmanal\",\"
    \"content\": \"# Resum\n\n- Creixement: +15%\n- Usuaris nous: 234\",\"
    \"tags\": [\"setmana-9\", \"analytics\"]
  }"

# Crear checklist amb tasques
curl -X POST "$URL/agent-create-block" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"
    \"board_id\": \"$BOARD_ID\",\"
    \"type\": \"checklist\",\"
    \"title\": \"Accions pendents\"
  }"

# Afegir items a la checklist
for task in "Revisar métricas" "Actualizar dashboard" "Enviar report"; do
  curl -X PATCH "$URL/agent-update-checklist" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"
      \"board_id\": \"$BOARD_ID\",\"
      \"block_id\": \"uuid-del-checklist\",\"
      \"action\": \"add\",\"
      \"text\": \"$task\"
    }"
done
```

### Exemple 2: Actualitzar document existent

```bash
# Obtenir document
curl "$URL/agent-get-block?board_id=uuid&block_id=uuid" \
  -H "X-API-Key: dc_agent_xxx"

# Afegir secció nova
curl -X PATCH "$URL/agent-update-doc" \
  -H "X-API-Key: dc_agent_xxx" \
  -d '{
    "board_id": "uuid",
    "block_id": "uuid",
    "content": "\n\n## Conclusions\n\n- Punt 1\n- Punt 2",
    "append": true
  }'
```

---

## Seguretat

- API keys emmagatzemades com **hash SHA-256** (no en text pla)
- **Prefix visible** per identificació (primers 12 caràcters)
- **Permisos granulars**: `read`, `write`, `delete`
- Keys vinculades a **un sol board**
- **Soft delete** de keys (es poden reactivar)
- **Audit trail** amb `last_used_at`

---

## Integració amb OpenClaw

### Skill per agents OpenClaw

```typescript
// dockerclaw-skill.ts
export class DockerClawSkill {
  constructor(
    private apiKey: string,
    private boardId: string,
    private url: string
  ) {}

  async createDoc(title: string, content: string) {
    return fetch(`${this.url}/functions/v1/agent-create-doc`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: this.boardId, title, content })
    }).then(r => r.json());
  }

  async listBlocks() {
    return fetch(`${this.url}/functions/v1/agent-list-blocks?board_id=${this.boardId}`, {
      headers: { 'X-API-Key': this.apiKey }
    }).then(r => r.json());
  }

  async updateDoc(blockId: string, content: string, append = false) {
    return fetch(`${this.url}/functions/v1/agent-update-doc`, {
      method: 'PATCH',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: this.boardId, block_id: blockId, content, append })
    }).then(r => r.json());
  }

  async addChecklistItem(blockId: string, text: string) {
    return fetch(`${this.url}/functions/v1/agent-update-checklist`, {
      method: 'PATCH',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: this.boardId, block_id: blockId, action: 'add', text })
    }).then(r => r.json());
  }

  async checkItem(blockId: string, text: string) {
    return fetch(`${this.url}/functions/v1/agent-update-checklist`, {
      method: 'PATCH',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: this.boardId, block_id: blockId, action: 'check', text })
    }).then(r => r.json());
  }
}
```

### Ús dins un agent OpenClaw

```typescript
const claw = new DockerClawSkill(
  process.env.DOCKERCLAW_API_KEY!,
  process.env.DOCKERCLAW_BOARD_ID!,
  process.env.DOCKERCLAW_URL!
);

// Crear informe
await claw.createDoc("Anàlisi Q1", "# Resultats\n\n...");

// Llistar blocks existents
const blocks = await claw.listBlocks();

// Actualitzar document
await claw.updateDoc(blocks.blocks[0].id, "Nova secció afegida", true);

// Treure tasques pendents
await claw.addChecklistItem("checklist-uuid", "Revisar codi");
```

---

## Desenvolupament local

```bash
# Serveix funcions en local
supabase functions serve agent-create-doc --env-file ./supabase/.env.local

# Test amb curl
curl -X POST "http://localhost:54321/functions/v1/agent-create-doc" \
  -H "X-API-Key: test-key" \
  -d '{"board_id": "...", "title": "Test", "content": "# Test"}'
```

## Límits

- Mida màxima body: 6MB
- Timeout: 60 segons
- Rate limiting: gestionat per Supabase
