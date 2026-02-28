# DockerClaw Agent API (Supabase Edge Functions)

API per agents IA per interactuar amb DockerClaw via Supabase Edge Functions.

## Desplegament

### 1. Instal·la Supabase CLI

```bash
npm install -g supabase
```

### 2. Login i link del projecte

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 3. Aplica migracions

```bash
supabase db push
```

Això crea la taula `agent_api_keys` i la funció `validate_agent_api_key`.

### 4. Desplega les Edge Functions

```bash
supabase functions deploy agent-create-block
supabase functions deploy agent-list-blocks
supabase functions deploy agent-create-doc
supabase functions deploy agent-generate-key
```

### 5. Configura secrets (si cal)

```bash
supabase secrets set --env-file ./supabase/.env.local
```

## Ús

### Generar una API Key (des de la UI)

```bash
curl -X POST "https://<your-project>.supabase.co/functions/v1/agent-generate-key" \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "uuid-del-board",
    "name": "OpenClaw Agent",
    "permissions": ["read", "write"]
  }'
```

**Resposta:**
```json
{
  "success": true,
  "key": "dc_agent_aB3xK9mPqRsTuVwXyZ...",
  "warning": "This key will only be shown once. Store it securely!"
}
```

### Crear un document (agent)

```bash
curl -X POST "https://<your-project>.supabase.co/functions/v1/agent-create-doc" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "uuid-del-board",
    "title": "Informe Setmanal",
    "content": "# Resum\n\nContingut en markdown...",
    "tags": ["informe", "setmana-1"]
  }'
```

### Crear un block qualsevol (agent)

```bash
curl -X POST "https://<your-project>.supabase.co/functions/v1/agent-create-block" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "uuid-del-board",
    "type": "text",
    "title": "Nota ràpida",
    "x": 200,
    "y": 300
  }'
```

**Tipus disponibles:** `doc`, `text`, `kanban`, `checklist`, `table`, `inbox`, `folder`, `heading`, `image`

### Llistar blocks (agent)

```bash
curl "https://<your-project>.supabase.co/functions/v1/agent-list-blocks?board_id=uuid-del-board" \
  -H "X-API-Key: dc_agent_xxx"
```

## Integració amb OpenClaw Agents

### Exemple de Skill per OpenClaw

```typescript
// tools/dockerclaw.ts
export async function createDocument(boardId: string, title: string, content: string) {
  const apiKey = process.env.DOCKERCLAW_AGENT_API_KEY;
  const url = process.env.DOCKERCLAW_URL; // https://xxx.supabase.co
  
  const res = await fetch(`${url}/functions/v1/agent-create-doc`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title,
      content,
    }),
  });
  
  return res.json();
}
```

### Variables d'entorn per agents

```bash
DOCKERCLAW_URL=https://xxx.supabase.co
DOCKERCLAW_AGENT_API_KEY=dc_agent_xxx
DOCKERCLAW_BOARD_ID=uuid-del-board
```

## Seguretat

- Les API keys es guarden **hashejades** (SHA-256) a la BD
- Només es mostra la key completa **una vegada** (quan es genera)
- Les keys tenen **permisos granulars**: `read`, `write`, `delete`
- Cada key està vinculada a un **board específic**
- Les keys poden **desactivar-se** sense esborrar-les
- Camp `last_used_at` per audit trail

## Límits

- Mida màxima del body: 6MB (límit de Supabase Edge Functions)
- Timeout: 60 segons
- Rate limiting: gestionat per Supabase (veure dashboard)

## Desenvolupament local

```bash
# Serveix funcions en local
supabase functions serve agent-create-doc --env-file ./supabase/.env.local

# Test amb curl
curl -X POST "http://localhost:54321/functions/v1/agent-create-doc" \
  -H "X-API-Key: test-key" \
  -d '{"board_id": "...", "title": "Test"}'
```
