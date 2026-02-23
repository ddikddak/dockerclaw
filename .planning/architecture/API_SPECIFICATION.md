# REST API Specification

## Design Principles

- **Base URL:** `https://api.dockerclaw.com/v1` (Cloud Run: `https://dockerclaw-backend-...run.app/v1`)
- **Authentication:** `X-API-Key: dc_{64 hex chars}` header on all endpoints except board creation
- **Content-Type:** `application/json` for all request/response bodies
- **Versioning:** URL path prefix (`/v1/`)
- **Pagination:** Cursor-based (`?after=<item_id>&limit=50`, max limit=100)
- **Idempotency:** `Idempotency-Key: <uuid>` header on all POST/PATCH/PUT (optional)
- **Rate Limiting:** Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Response Envelope

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "total": 42,
    "has_more": true,
    "next_cursor": "uuid-of-last-item"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "content.text", "message": "Required" }
    ]
  }
}
```

### Standard Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `X-API-Key` | Request | Board-scoped API key |
| `Idempotency-Key` | Request | UUID for request deduplication |
| `X-RateLimit-Limit` | Response | Requests allowed per window |
| `X-RateLimit-Remaining` | Response | Requests remaining |
| `X-RateLimit-Reset` | Response | Unix timestamp when window resets |
| `X-Idempotency-Replay` | Response | `true` if response was cached replay |
| `X-Request-Id` | Response | Unique request identifier for debugging |

---

## 1. Boards

### `POST /v1/boards` — Create Board

**Auth:** None (creates a new board with a new API key)

**Request:**
```json
{
  "name": "My Agent Board",
  "description": "Board for my AI analysis pipeline"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Agent Board",
    "description": "Board for my AI analysis pipeline",
    "settings": {},
    "api_key": "dc_a1b2c3d4e5f6...64hexchars...",
    "item_count": 0,
    "created_at": "2026-02-23T10:00:00Z",
    "updated_at": "2026-02-23T10:00:00Z"
  }
}
```

> **Note:** `api_key` is returned ONLY on creation. It cannot be retrieved again.

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Required, string, 1-255 chars |
| `description` | Optional, string, max 2000 chars |

---

### `GET /v1/boards` — List Boards

**Auth:** Required (returns boards accessible by this API key)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Items per page (1-100) |
| `after` | uuid | - | Cursor for pagination |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "My Board",
      "description": "...",
      "item_count": 42,
      "created_at": "2026-02-23T10:00:00Z",
      "updated_at": "2026-02-23T10:30:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "has_more": false,
    "next_cursor": null
  }
}
```

---

### `GET /v1/boards/:id` — Get Board

**Auth:** Required

**Response:** `200 OK`
```json
{
  "data": {
    "id": "550e8400-...",
    "name": "My Board",
    "description": "...",
    "settings": { "background": "dots" },
    "item_count": 42,
    "connector_count": 8,
    "created_at": "2026-02-23T10:00:00Z",
    "updated_at": "2026-02-23T10:30:00Z"
  }
}
```

---

### `PATCH /v1/boards/:id` — Update Board

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "name": "Renamed Board",
  "description": "Updated description",
  "settings": { "background": "grid" }
}
```

**Response:** `200 OK` — Returns updated board object.

**Validation:** All fields optional. Same constraints as creation.

---

### `DELETE /v1/boards/:id` — Delete Board

**Auth:** Required (scope: `admin`)

**Response:** `204 No Content`

**Side Effects:** Cascades to all items, connectors, events, webhooks, snapshots, media.

---

### `GET /v1/boards/:id/export` — Export Board Snapshot

**Auth:** Required (scope: `read`)

**Response:** `200 OK`
```json
{
  "data": {
    "board": { "id": "...", "name": "..." },
    "items": [ ... ],
    "connectors": [ ... ],
    "exported_at": "2026-02-23T10:00:00Z"
  }
}
```

---

## 2. Canvas Items

### `POST /v1/boards/:id/items` — Create Item

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "type": "sticky",
  "x": 100,
  "y": 200,
  "width": 200,
  "height": 200,
  "rotation": 0,
  "content": {
    "text": "Analysis complete",
    "color": "#FFD700"
  },
  "style": {
    "fill": "solid",
    "opacity": 1
  },
  "locked": false
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "item-uuid-...",
    "board_id": "board-uuid-...",
    "type": "sticky",
    "x": 100,
    "y": 200,
    "width": 200,
    "height": 200,
    "rotation": 0,
    "z_index": 1,
    "content": { "text": "Analysis complete", "color": "#FFD700" },
    "style": { "fill": "solid", "opacity": 1 },
    "locked": false,
    "visible": true,
    "frame_id": null,
    "created_by": "dc_a1b2",
    "version": 1,
    "created_at": "2026-02-23T10:00:00Z",
    "updated_at": "2026-02-23T10:00:00Z"
  }
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| `type` | Required. One of: `sticky`, `text`, `shape`, `frame`, `image`, `document` |
| `x` | Required. Number, -1000000 to 1000000 |
| `y` | Required. Number, -1000000 to 1000000 |
| `width` | Optional. Number, 1 to 10000 |
| `height` | Optional. Number, 1 to 10000 |
| `rotation` | Optional. Number, 0 to 360. Default: 0 |
| `content` | Required. Object, schema varies by `type` (see Data Model) |
| `style` | Optional. Object with color, fill, strokeWidth, opacity, etc. |
| `frame_id` | Optional. UUID of a `frame` type item on the same board |
| `locked` | Optional. Boolean. Default: false |

---

### `GET /v1/boards/:id/items` — List Items

**Auth:** Required (scope: `read`)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | Filter by item type |
| `frame_id` | uuid | - | Filter by parent frame |
| `locked` | boolean | - | Filter locked/unlocked items |
| `limit` | integer | 50 | Items per page (1-100) |
| `after` | uuid | - | Cursor for pagination |
| `sort` | string | `created_at` | Sort field: `created_at`, `updated_at`, `z_index` |
| `order` | string | `asc` | Sort order: `asc`, `desc` |

**Response:** `200 OK`
```json
{
  "data": [
    { "id": "...", "type": "sticky", "x": 100, "y": 200, ... },
    { "id": "...", "type": "text", "x": 300, "y": 400, ... }
  ],
  "meta": {
    "total": 142,
    "has_more": true,
    "next_cursor": "last-item-uuid"
  }
}
```

---

### `GET /v1/boards/:id/items/:itemId` — Get Item

**Auth:** Required (scope: `read`)

**Response:** `200 OK` — Full item object.

---

### `PATCH /v1/boards/:id/items/:itemId` — Update Item (Partial)

**Auth:** Required (scope: `write`)

**Request:** Any subset of item fields.
```json
{
  "x": 300,
  "y": 400,
  "content": { "text": "Updated text" }
}
```

**Response:** `200 OK` — Full updated item object.

**Concurrency:** If `version` is provided in the request, the update only succeeds if the current version matches (optimistic locking). Returns `409 Conflict` on version mismatch.

---

### `PATCH /v1/boards/:id/items/:itemId/position` — Update Position

**Auth:** Required (scope: `write`)

Convenience endpoint for position-only updates (common for drag operations).

**Request:**
```json
{
  "x": 300,
  "y": 400,
  "width": 250,
  "height": 250
}
```

**Response:** `200 OK` — Full updated item object.

---

### `PATCH /v1/boards/:id/items/:itemId/content` — Update Content

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "text": "New sticky note text"
}
```

**Response:** `200 OK` — Full updated item object.

---

### `PATCH /v1/boards/:id/items/:itemId/style` — Update Style

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "color": "#FF0000",
  "fill": "semi",
  "opacity": 0.8
}
```

**Response:** `200 OK` — Full updated item object.

---

### `DELETE /v1/boards/:id/items/:itemId` — Delete Item

**Auth:** Required (scope: `write`)

**Response:** `204 No Content`

**Side Effects:** Cascades to connectors referencing this item. If item is a frame, children are un-grouped (frame_id set to null).

---

### `POST /v1/boards/:id/items/:itemId/lock` — Lock Item

**Auth:** Required (scope: `write`)

Prevents human UI editing. Agents can still update via API.

**Response:** `200 OK` — Updated item with `locked: true`.

---

### `DELETE /v1/boards/:id/items/:itemId/lock` — Unlock Item

**Auth:** Required (scope: `write`)

**Response:** `200 OK` — Updated item with `locked: false`.

---

## 3. Batch Operations

### `POST /v1/boards/:id/items/batch` — Batch Create

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "items": [
    {
      "type": "sticky",
      "x": 0,
      "y": 0,
      "content": { "text": "Item 1" }
    },
    {
      "type": "card",
      "x": 250,
      "y": 0,
      "content": { "title": "Task 1", "status": "todo" }
    }
  ]
}
```

**Limits:**
- Maximum 100 items per batch
- Maximum request body 5MB

**Response:** `201 Created`
```json
{
  "data": {
    "created": [
      { "index": 0, "item": { "id": "...", "type": "sticky", ... } },
      { "index": 1, "item": { "id": "...", "type": "card", ... } }
    ],
    "failed": []
  },
  "meta": {
    "total_created": 2,
    "total_failed": 0
  }
}
```

**Partial Failure:** By default, all-or-nothing (transaction). With `?partial=true`, successful items are created and failures are returned in the `failed` array.

---

### `PATCH /v1/boards/:id/items/batch` — Batch Update

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "updates": [
    { "id": "item-uuid-1", "x": 100, "y": 200 },
    { "id": "item-uuid-2", "content": { "text": "Updated" } }
  ]
}
```

**Response:** `200 OK` — Same structure as batch create.

---

### `DELETE /v1/boards/:id/items/batch` — Batch Delete

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "ids": ["item-uuid-1", "item-uuid-2", "item-uuid-3"]
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "deleted": ["item-uuid-1", "item-uuid-2", "item-uuid-3"],
    "not_found": []
  }
}
```

---

## 4. Connectors

### `POST /v1/boards/:id/connectors` — Create Connector

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "from_item_id": "uuid-of-source-item",
  "to_item_id": "uuid-of-target-item",
  "label": "depends on",
  "style": {
    "color": "#333333",
    "endMarker": "arrow",
    "strokeStyle": "solid"
  }
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "connector-uuid",
    "board_id": "board-uuid",
    "from_item_id": "...",
    "to_item_id": "...",
    "label": "depends on",
    "style": { ... },
    "waypoints": [],
    "created_by": "dc_a1b2",
    "created_at": "2026-02-23T10:00:00Z",
    "updated_at": "2026-02-23T10:00:00Z"
  }
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `from_item_id` | Required. Must be a valid item on this board. |
| `to_item_id` | Required. Must be a valid item on this board. Must differ from `from_item_id`. |
| `label` | Optional. String, max 200 chars. |
| `style` | Optional. Object. |

---

### `GET /v1/boards/:id/connectors` — List Connectors

**Auth:** Required (scope: `read`)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `item_id` | uuid | Filter connectors involving this item (as source or target) |
| `limit` | integer | Items per page (default 50) |
| `after` | uuid | Cursor for pagination |

---

### `GET /v1/boards/:id/connectors/:connectorId` — Get Connector

**Auth:** Required (scope: `read`)

---

### `PATCH /v1/boards/:id/connectors/:connectorId` — Update Connector

**Auth:** Required (scope: `write`)

---

### `DELETE /v1/boards/:id/connectors/:connectorId` — Delete Connector

**Auth:** Required (scope: `write`)

**Response:** `204 No Content`

---

## 5. Canvas Snapshots

### `GET /v1/boards/:id/snapshot` — Get Canvas Snapshot

**Auth:** Required (scope: `read`)

Returns the full tldraw store JSON for initial canvas load.

**Response:** `200 OK`
```json
{
  "data": {
    "board_id": "...",
    "snapshot": {
      "store": { ... },
      "schema": { ... }
    },
    "version": 42,
    "updated_at": "2026-02-23T10:30:00Z"
  }
}
```

---

### `PUT /v1/boards/:id/snapshot` — Replace Canvas Snapshot

**Auth:** Required (scope: `admin`)

Replaces the entire canvas state. Used for migrations or bulk import.

**Request:**
```json
{
  "snapshot": {
    "store": { ... },
    "schema": { ... }
  }
}
```

**Response:** `200 OK`

---

## 6. Events

### `GET /v1/boards/:id/events` — List Events

**Auth:** Required (scope: `read`)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `event_type` | string | - | Filter: `item.created`, `item.updated`, `item.deleted`, etc. |
| `actor_type` | string | - | Filter: `agent`, `human`, `system` |
| `item_id` | uuid | - | Filter events for a specific item |
| `limit` | integer | 50 | Items per page (1-100) |
| `after` | uuid | - | Cursor for pagination |
| `since` | ISO 8601 | - | Events after this timestamp |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "event-uuid",
      "board_id": "...",
      "item_id": "...",
      "actor_type": "agent",
      "actor_id": "dc_a1b2",
      "event_type": "item.created",
      "payload": { "type": "sticky", "content": { "text": "Hello" } },
      "created_at": "2026-02-23T10:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

### `GET /v1/boards/:id/events/:eventId` — Get Event

**Auth:** Required (scope: `read`)

---

## 7. Webhooks

### `POST /v1/boards/:id/webhooks` — Create Webhook

**Auth:** Required (scope: `admin`)

**Request:**
```json
{
  "url": "https://my-agent.example.com/webhook",
  "events": ["item.created", "item.updated", "item.deleted"]
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "webhook-uuid",
    "board_id": "...",
    "url": "https://my-agent.example.com/webhook",
    "secret": "whsec_a1b2c3d4e5f6...",
    "events": ["item.created", "item.updated", "item.deleted"],
    "is_active": true,
    "created_at": "2026-02-23T10:00:00Z"
  }
}
```

> **Note:** `secret` is returned ONLY on creation. Store it securely for signature verification.

**Validation:**
| Field | Rules |
|-------|-------|
| `url` | Required. Valid HTTPS URL. Not a private IP (SSRF protection). |
| `events` | Required. Non-empty array. Valid values: `item.created`, `item.updated`, `item.deleted`, `board.updated`, `connector.created`, `connector.deleted` |

---

### `GET /v1/boards/:id/webhooks` — List Webhooks

**Auth:** Required (scope: `admin`)

---

### `GET /v1/boards/:id/webhooks/:webhookId` — Get Webhook

**Auth:** Required (scope: `admin`)

---

### `PATCH /v1/boards/:id/webhooks/:webhookId` — Update Webhook

**Auth:** Required (scope: `admin`)

**Request:**
```json
{
  "url": "https://new-url.example.com/webhook",
  "events": ["item.created"],
  "is_active": true
}
```

---

### `DELETE /v1/boards/:id/webhooks/:webhookId` — Delete Webhook

**Auth:** Required (scope: `admin`)

**Response:** `204 No Content`

---

### `POST /v1/boards/:id/webhooks/:webhookId/ping` — Test Webhook

**Auth:** Required (scope: `admin`)

Sends a test event to the webhook URL.

**Response:** `200 OK`
```json
{
  "data": {
    "delivered": true,
    "response_code": 200,
    "response_time_ms": 150
  }
}
```

### Webhook Delivery Payload

```json
{
  "id": "delivery-uuid",
  "event": "item.created",
  "board_id": "board-uuid",
  "data": {
    "id": "item-uuid",
    "type": "sticky",
    "x": 100,
    "y": 200,
    "content": { "text": "Hello" },
    ...
  },
  "timestamp": "2026-02-23T10:00:00Z"
}
```

**Signature Header:**
```
X-DockerClaw-Signature: sha256=<hex-hmac-sha256-of-raw-body>
```

**Retry Schedule:**
| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 2 minutes |
| 4 | 10 minutes |
| 5 | 1 hour |
| Exhausted | Webhook `failure_count` incremented. Auto-suspended at 10 failures. |

---

## 8. API Keys

### `GET /v1/boards/:id/keys` — List API Keys

**Auth:** Required (scope: `admin`)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "key-uuid",
      "name": "default",
      "key_prefix": "dc_a1b2",
      "scopes": ["read", "write"],
      "is_active": true,
      "last_used_at": "2026-02-23T10:00:00Z",
      "created_at": "2026-02-23T09:00:00Z"
    }
  ]
}
```

> **Note:** Full key is never returned after creation.

---

### `POST /v1/boards/:id/keys` — Create API Key

**Auth:** Required (scope: `admin`)

**Request:**
```json
{
  "name": "Agent Pipeline Key",
  "scopes": ["read", "write"]
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "key-uuid",
    "name": "Agent Pipeline Key",
    "key": "dc_newkey64hexchars...",
    "scopes": ["read", "write"],
    "is_active": true,
    "created_at": "2026-02-23T10:00:00Z"
  }
}
```

> **Note:** `key` is returned ONLY on creation.

---

### `DELETE /v1/boards/:id/keys/:keyId` — Revoke API Key

**Auth:** Required (scope: `admin`)

**Response:** `204 No Content`

**Protection:** Cannot revoke the last active key for a board.

---

## 9. Media Upload

### `POST /v1/boards/:id/items/:itemId/upload` — Upload File

**Auth:** Required (scope: `write`)

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload |
| `alt_text` | string | Optional alt text for images |

**Constraints:**
- Max file size: 10MB
- Accepted types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Item must be of type `image`

**Response:** `200 OK`
```json
{
  "data": {
    "id": "media-uuid",
    "filename": "analysis-chart.png",
    "content_type": "image/png",
    "size_bytes": 524288,
    "storage_url": "https://storage.googleapis.com/dockerclaw-media/...",
    "item": {
      "id": "item-uuid",
      "content": {
        "storage_url": "https://storage.googleapis.com/...",
        "alt_text": "Analysis chart",
        "original_filename": "analysis-chart.png"
      }
    }
  }
}
```

---

## 10. Documents (Legacy — Deprecated)

These endpoints are maintained for backward compatibility with v1 clients. They map to `canvas_items` with `type: "document"`.

### `POST /v1/boards/:id/documents` — Create Document

**Auth:** Required (scope: `write`)

**Request:**
```json
{
  "title": "Analysis Report",
  "content": "## Summary\n\nThe analysis shows...",
  "author": "agent-pipeline-v2"
}
```

**Response:** `201 Created` — Document object (same as v1 format).

**Internal:** Creates a `canvas_item` with `type: "document"` at auto-positioned coordinates.

---

### `GET /v1/boards/:id/documents` — List Documents

### `GET /v1/boards/:id/documents/:docId` — Get Document

> **Deprecation Notice:** These endpoints will be removed 90 days after v2 GA. Use `/v1/boards/:id/items?type=document` instead.

---

## 11. Error Reference

| HTTP Status | Error Code | Description | When |
|------------|-----------|-------------|------|
| 400 | `VALIDATION_ERROR` | Request body fails Zod validation | Invalid/missing fields |
| 400 | `INVALID_TYPE` | Unknown item type | `type` not in enum |
| 400 | `BATCH_TOO_LARGE` | Batch exceeds 100 items | Batch request too large |
| 401 | `UNAUTHORIZED` | Missing or invalid API key | No `X-API-Key` header or key not found |
| 403 | `FORBIDDEN` | API key lacks required scope | e.g., `read` key trying to `write` |
| 403 | `KEY_INACTIVE` | API key has been revoked | Key `is_active` = false |
| 404 | `NOT_FOUND` | Resource does not exist | Board, item, or connector not found |
| 404 | `BOARD_NOT_FOUND` | Board does not exist | Board ID invalid |
| 404 | `ITEM_NOT_FOUND` | Item does not exist on this board | Item ID invalid or wrong board |
| 409 | `VERSION_CONFLICT` | Optimistic lock failed | Version mismatch on PATCH |
| 409 | `IDEMPOTENCY_CONFLICT` | Same key, different payload | Idempotency key reused with different request body |
| 413 | `PAYLOAD_TOO_LARGE` | Request body exceeds limit | Body > 1MB (5MB for batch) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Invalid file type for upload | File type not in allowlist |
| 422 | `CONNECTOR_INVALID` | Connector endpoints invalid | Same item, different boards, or items don't exist |
| 429 | `RATE_LIMITED` | Rate limit exceeded | Too many requests; includes `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Bug or infrastructure issue |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable | Cloud Run scaling / DB connection issue |

---

## 12. Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Per API key (standard) | 1,000 requests | 1 minute |
| Per API key (batch) | 50 batch requests | 1 minute |
| Per API key (uploads) | 20 uploads | 1 minute |
| Global (unauthenticated) | 10 requests | 1 minute |

Exceeding the limit returns `429 Too Many Requests` with:
```
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708689600
```
