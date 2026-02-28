# DockerClaw Agent API (Supabase Edge Functions)

This Agent API is intentionally minimal:

- `agent-generate-key` for creating API keys from the UI
- `agent-execute` for read/write/delete operations

## Deploy

```bash
supabase db push
supabase functions deploy agent-generate-key
supabase functions deploy agent-execute
```

## 1) Generate API key (UI/authenticated user)

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-generate-key" \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "name": "Planning Assistant",
    "description": "Agent for planning docs and checklists",
    "permissions": ["read", "write", "delete"]
  }'
```

Response includes `key` only once. Store it securely.

## 2) Execute actions (agent using X-API-Key)

Endpoint:

```bash
POST /functions/v1/agent-execute
```

Body shape:

```json
{
  "board_id": "<board-uuid>",
  "action": "<action-name>",
  "params": {}
}
```

Supported actions:

- `list_blocks` (read)
- `get_block` (read)
- `create_block` (write)
- `update_block` (write)
- `delete_block` (delete)

### Examples

List blocks:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-execute" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "action": "list_blocks",
    "params": { "include_deleted": false }
  }'
```

Create a doc:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-execute" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "action": "create_block",
    "params": {
      "type": "doc",
      "title": "Weekly report",
      "content": "# Summary\n\n...",
      "tags": ["weekly"]
    }
  }'
```

Update checklist item:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-execute" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "action": "update_block",
    "params": {
      "block_id": "<checklist-block-uuid>",
      "checklist_action": "add",
      "text": "Review launch checklist"
    }
  }'
```

Append to doc:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-execute" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "action": "update_block",
    "params": {
      "block_id": "<doc-block-uuid>",
      "content": "New section",
      "append": true
    }
  }'
```

Soft delete:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/agent-execute" \
  -H "X-API-Key: dc_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "action": "delete_block",
    "params": {
      "block_id": "<block-uuid>",
      "permanent": false
    }
  }'
```

Legacy specialized endpoints have been removed. Use `agent-execute` for all agent read/write operations.

