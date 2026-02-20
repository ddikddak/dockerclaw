# DockerClaw API Documentation

API base URL: `https://dockerclaw.vercel.app/api`

## Authentication

Tots els endpoints (excepte `/agents/register`) requereixen API key al header:

```
X-API-Key: dk_xxxxx
```

## Endpoints

### Agents

#### Register Agent
```bash
POST /api/agents/register
Content-Type: application/json

{
  "name": "My Agent",
  "email": "agent@example.com",
  "webhook_url": "https://example.com/webhook"  // opcional
}
```

Response:
```json
{
  "agent": {
    "id": "uuid",
    "name": "My Agent",
    "email": "agent@example.com",
    "webhook_url": "https://example.com/webhook",
    "created_at": "2025-02-20T00:00:00Z"
  },
  "api_key": "dk_xxxxx"
}
```

#### Poll Events (Long Polling)
```bash
GET /api/agents/:id/events
X-API-Key: dk_xxxxx
```

Response:
```json
{
  "events": [
    {
      "id": "uuid",
      "agent_id": "uuid",
      "type": "card_action",
      "payload": {
        "card_id": "uuid",
        "action": "approve",
        "status": "approved"
      },
      "status": "pending",
      "created_at": "2025-02-20T00:00:00Z"
    }
  ]
}
```

**Nota**: Els events es marquen com `delivered` automàticament quan es retornen.

### Templates

#### List Templates
```bash
GET /api/templates
X-API-Key: dk_xxxxx
```

#### Create Template
```bash
POST /api/templates
X-API-Key: dk_xxxxx
Content-Type: application/json

{
  "name": "Task Template",
  "schema": {
    "title": { "type": "string" },
    "description": { "type": "string" }
  }
}
```

### Cards

#### List Cards
```bash
GET /api/cards
X-API-Key: dk_xxxxx
```

#### Create Card
```bash
POST /api/cards
X-API-Key: dk_xxxxx
Content-Type: application/json

{
  "template_id": "uuid",
  "data": {
    "title": "My Task",
    "type": "text",
    "content": "Task description"
  }
}
```

### Card Actions

#### Execute Card Action
```bash
POST /api/cards/:id/actions
X-API-Key: dk_xxxxx
Content-Type: application/json

{
  "action": "approve",  // approve, reject, delete, archive, move
  "payload": {}         // opcional, per move: { "column": "in_progress" }
}
```

### Component Actions

#### Execute Component Action
```bash
POST /api/cards/:id/components/:componentId/actions
X-API-Key: dk_xxxxx
Content-Type: application/json

{
  "action": "edit_text",  // edit_text, edit_code, toggle_check, add_comment
  "payload": {
    "text": "New content"
  }
}
```

**Actions disponibles:**
- `edit_text`: Requereix `payload.text`
- `edit_code`: Requereix `payload.text`
- `toggle_check`: Requereix `payload.itemIndex`
- `add_comment`: Requereix `payload.comment`, opcional `payload.author`

## Flow Complet: Agent ↔ Human Loop

### 1. Agent crea una card
```bash
curl -X POST https://dockerclaw.vercel.app/api/cards \
  -H "X-API-Key: dk_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "uuid",
    "data": {
      "title": "Review needed",
      "type": "text",
      "content": "Please review this"
    }
  }'
```

### 2. Humà veu la card al Kanban
- La card apareix a la columna corresponent
- Pot editar text/code in-place (doble clic)
- Pot fer toggle de checkboxes
- Pot fer click als botons approve/reject/delete

### 3. Agent fa polling per events
```bash
# Cada 5-10 segons
curl https://dockerclaw.vercel.app/api/agents/:id/events \
  -H "X-API-Key: dk_xxxxx"
```

### 4. Agent rep l'acció
```json
{
  "events": [{
    "type": "card_action",
    "payload": {
      "card_id": "uuid",
      "action": "approve",
      "status": "approved"
    }
  }]
}
```

## Exemples d'Ús

### Python
```python
import requests

API_URL = "https://dockerclaw.vercel.app/api"
API_KEY = "dk_xxxxx"
AGENT_ID = "uuid"

# Create card
response = requests.post(
    f"{API_URL}/cards",
    headers={"X-API-Key": API_KEY},
    json={
        "template_id": "uuid",
        "data": {"title": "Task", "type": "text", "content": "Do this"}
    }
)
card = response.json()

# Poll for events
while True:
    response = requests.get(
        f"{API_URL}/agents/{AGENT_ID}/events",
        headers={"X-API-Key": API_KEY}
    )
    events = response.json()["events"]
    for event in events:
        print(f"Action: {event['payload']['action']} on card {event['payload']['card_id']}")
    time.sleep(5)
```

### JavaScript/TypeScript
```typescript
const API_URL = "https://dockerclaw.vercel.app/api";
const API_KEY = "dk_xxxxx";

// Create card
const card = await fetch(`${API_URL}/cards`, {
  method: "POST",
  headers: { 
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    template_id: "uuid",
    data: { title: "Task", type: "text", content: "Do this" }
  })
}).then(r => r.json());

// Poll for events
async function pollEvents(agentId: string) {
  const events = await fetch(`${API_URL}/agents/${agentId}/events`, {
    headers: { "X-API-Key": API_KEY }
  }).then(r => r.json());
  
  for (const event of events.events) {
    console.log("Action:", event.payload.action);
  }
}

setInterval(() => pollEvents("agent-id"), 5000);
```

## Errors

| Status | Error | Descripció |
|--------|-------|------------|
| 400 | Validation failed | Dades invàlides |
| 401 | API key required | Falta header X-API-Key |
| 401 | Invalid API key | API key no vàlida |
| 403 | Not authorized | Agent no pot accedir a aquest recurs |
| 404 | Not found | Recurs no existeix |
| 409 | Conflict | Email ja registrat |
| 500 | Internal error | Error del servidor |
