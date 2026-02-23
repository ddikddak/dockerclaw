# Data Model

## 1. Current Schema (v1 Baseline)

### Prisma Models (Active)

```prisma
// File: prisma/schema.prisma

model Board {
  id          String     @id @default(uuid())
  name        String
  description String?
  api_key     String     @unique           // ⚠️ PLAINTEXT — must migrate to hashed
  created_at  DateTime   @default(now())
  documents   Document[]

  @@index([api_key])
}

model Document {
  id         String   @id @default(uuid())
  board_id   String
  title      String
  content    String                         // Full Markdown body
  author     String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  board      Board    @relation(fields: [board_id], references: [id], onDelete: Cascade)

  @@index([board_id, created_at])
}
```

### Supabase Tables (Legacy — NOT wired to current backend)

From `supabase/migrations/`:
- `Agent` (id, name, email, api_key, webhook_url)
- `Template` (id, agent_id, name, schema JSONB)
- `Card` (id, template_id, agent_id, data JSONB, status, tags[], x, y)
- `Event` (id, agent_id, type, payload JSONB, status)
- `Comment` (id, card_id, author_type, author_id, author_name, content)
- `Reaction` (id, card_id, author_type, author_id, emoji)
- `ApiKey` (id, name, keyHash, keyPrefix, isActive, lastUsedAt)
- `actions` (id, card_id, agent_id, type, action, payload JSONB, status)

> These tables remain in Supabase but are not used by the v2 architecture. They will be dropped after v2 is stable (see [Migration Strategy](../reference/MIGRATION_STRATEGY.md)).

---

## 2. Target Schema (v2)

### Entity Relationship Diagram

```
┌──────────────┐
│    boards    │
│              │
│ id (PK)      │
│ name         │───────┐
│ description  │       │ 1:N
│ settings     │       │
│ created_at   │       │
│ updated_at   │       │
└──────────────┘       │
       │               │
       │ 1:N           │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  api_keys    │ │ canvas_items │
│              │ │              │
│ id (PK)      │ │ id (PK)      │
│ board_id(FK) │ │ board_id(FK) │
│ name         │ │ type         │──────────────┐
│ key_hash     │ │ x, y         │              │
│ key_prefix   │ │ width,height │              │
│ scopes       │ │ rotation     │              │
│ is_active    │ │ content(JSONB│              │
│ last_used_at │ │ style (JSONB)│              │
│ created_at   │ │ z_index      │              │
└──────────────┘ │ locked       │              │
                 │ visible      │              │
                 │ frame_id(FK) │──┐ self-ref  │
                 │ created_by   │  │           │
                 │ version      │  │           │
                 │ created_at   │  │           │
                 │ updated_at   │◄─┘           │
                 └──────┬───────┘              │
                        │                      │
              ┌─────────┼──────────┐           │
              │ 1:N     │ 1:N     │           │
              ▼         ▼         ▼           │
    ┌──────────────┐ ┌────────┐ ┌───────────┐ │
    │ connectors   │ │events  │ │   media   │ │
    │              │ │        │ │attachments│ │
    │ id (PK)      │ │id (PK) │ │           │ │
    │ board_id(FK) │ │board_id│ │ id (PK)   │ │
    │ from_item(FK)│ │item_id │ │ board_id  │ │
    │ to_item (FK) │ │actor_  │ │ item_id   │ │
    │ label        │ │  type  │ │ filename  │ │
    │ style (JSONB)│ │actor_id│ │ content_  │ │
    │ waypoints    │ │event_  │ │   type    │ │
    │ created_at   │ │  type  │ │ size_bytes│ │
    │ updated_at   │ │payload │ │ storage_  │ │
    └──────────────┘ │created │ │   url     │ │
                     │  _at   │ │ created_at│ │
                     └────────┘ └───────────┘ │
                                              │
                 ┌────────────────┐            │
                 │   webhooks     │            │
                 │                │            │
                 │ id (PK)        │            │
                 │ board_id (FK)  │────────────┘
                 │ url            │
                 │ secret_hash   │
                 │ events (text[])│
                 │ is_active      │
                 │ last_triggered │
                 │ created_at     │
                 └───────┬────────┘
                         │ 1:N
                         ▼
                 ┌────────────────┐
                 │webhook_delivers│
                 │                │
                 │ id (PK)        │
                 │ webhook_id(FK) │
                 │ event_id (FK)  │
                 │ status         │
                 │ response_code  │
                 │ response_body  │
                 │ attempt_count  │
                 │ next_retry_at  │
                 │ created_at     │
                 └────────────────┘

          ┌─────────────────────┐
          │  canvas_snapshots   │
          │                     │
          │ id (PK)             │
          │ board_id (FK,UNIQUE)│
          │ snapshot (JSONB)    │
          │ created_at          │
          │ updated_at          │
          └─────────────────────┘

          ┌─────────────────────┐
          │    documents        │
          │   (DEPRECATED)      │
          │                     │
          │ id (PK)             │
          │ board_id (FK)       │
          │ title               │
          │ content             │
          │ author              │
          │ created_at          │
          │ updated_at          │
          └─────────────────────┘
```

---

## 3. Table Definitions

### `boards`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Board identifier |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `description` | TEXT | NULLABLE | Optional description |
| `thumbnail_url` | TEXT | NULLABLE | Auto-generated canvas thumbnail |
| `settings` | JSONB | DEFAULT '{}' | Board-level settings (see schema below) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**Settings JSONB Schema:**
```json
{
  "background": "dots" | "grid" | "none",
  "defaultItemColor": "#FFD700",
  "maxItems": 10000,
  "allowPublicView": false
}
```

### `api_keys`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Key identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE | Associated board |
| `name` | VARCHAR(255) | NOT NULL, DEFAULT 'default' | Human-readable key name |
| `key_hash` | VARCHAR(64) | NOT NULL, UNIQUE | SHA-256 hash of the full key |
| `key_prefix` | VARCHAR(8) | NOT NULL, DEFAULT 'dc_' | First chars for identification |
| `scopes` | TEXT[] | NOT NULL, DEFAULT '{read,write}' | Permission scopes |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether key is usable |
| `last_used_at` | TIMESTAMPTZ | NULLABLE | Last API call timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Valid scopes:** `read`, `write`, `admin`

### `canvas_items`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Item identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, NOT NULL | Parent board |
| `type` | VARCHAR(20) | NOT NULL, CHECK IN ('sticky','text','shape','frame','image','document') | Item type |
| `x` | DOUBLE PRECISION | NOT NULL, DEFAULT 0 | X position on canvas |
| `y` | DOUBLE PRECISION | NOT NULL, DEFAULT 0 | Y position on canvas |
| `width` | DOUBLE PRECISION | NULLABLE | Width (auto-calculated if null) |
| `height` | DOUBLE PRECISION | NULLABLE | Height (auto-calculated if null) |
| `rotation` | DOUBLE PRECISION | NOT NULL, DEFAULT 0 | Rotation in degrees |
| `z_index` | INTEGER | NOT NULL, DEFAULT 0 | Stacking order |
| `content` | JSONB | NOT NULL, DEFAULT '{}' | Type-specific content (see schemas below) |
| `style` | JSONB | NOT NULL, DEFAULT '{}' | Visual styling (see schema below) |
| `frame_id` | UUID | FK → canvas_items.id ON DELETE SET NULL, NULLABLE | Parent frame (grouping) |
| `locked` | BOOLEAN | NOT NULL, DEFAULT false | Prevent human editing |
| `visible` | BOOLEAN | NOT NULL, DEFAULT true | Visibility on canvas |
| `created_by` | VARCHAR(100) | NULLABLE | Creator identifier (API key prefix or 'human') |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Optimistic concurrency version |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

### `connectors`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Connector identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, NOT NULL | Parent board |
| `from_item_id` | UUID | FK → canvas_items.id ON DELETE CASCADE, NOT NULL | Source item |
| `to_item_id` | UUID | FK → canvas_items.id ON DELETE CASCADE, NOT NULL | Target item |
| `label` | TEXT | NULLABLE | Text label on connector |
| `style` | JSONB | NOT NULL, DEFAULT '{}' | Visual styling |
| `waypoints` | JSONB | DEFAULT '[]' | Intermediate path points |
| `created_by` | VARCHAR(100) | NULLABLE | Creator identifier |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**Constraint:** `CHECK (from_item_id != to_item_id)` — no self-connections.

### `events`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Event identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, NOT NULL | Board context |
| `item_id` | UUID | NULLABLE | Related canvas item (null for board-level events) |
| `actor_type` | VARCHAR(10) | NOT NULL, CHECK IN ('agent','human','system') | Who triggered |
| `actor_id` | VARCHAR(100) | NULLABLE | API key prefix or session ID |
| `event_type` | VARCHAR(50) | NOT NULL | Event type (e.g., 'item.created') |
| `payload` | JSONB | DEFAULT '{}' | Event-specific data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp |

### `webhooks`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Webhook identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, NOT NULL | Parent board |
| `url` | TEXT | NOT NULL | Delivery URL (HTTPS required) |
| `secret_hash` | VARCHAR(64) | NOT NULL | SHA-256 hash of the webhook secret |
| `events` | TEXT[] | NOT NULL | Event types to subscribe |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether webhook fires |
| `failure_count` | INTEGER | NOT NULL, DEFAULT 0 | Consecutive failures |
| `last_triggered_at` | TIMESTAMPTZ | NULLABLE | Last successful delivery |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Constraint:** `CHECK (array_length(events, 1) > 0)` — must subscribe to at least one event.
**Auto-suspend:** When `failure_count >= 10`, `is_active` is set to `false`.

### `webhook_deliveries`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Delivery identifier |
| `webhook_id` | UUID | FK → webhooks.id ON DELETE CASCADE, NOT NULL | Parent webhook |
| `event_id` | UUID | FK → events.id ON DELETE CASCADE, NOT NULL | Triggering event |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending, success, failed, exhausted |
| `response_code` | INTEGER | NULLABLE | HTTP response status |
| `response_body` | TEXT | NULLABLE | First 1KB of response body |
| `attempt_count` | INTEGER | NOT NULL, DEFAULT 0 | Delivery attempts |
| `next_retry_at` | TIMESTAMPTZ | NULLABLE | Next retry timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

### `media_attachments`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Attachment identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, NOT NULL | Parent board |
| `item_id` | UUID | FK → canvas_items.id ON DELETE SET NULL, NULLABLE | Associated item |
| `filename` | VARCHAR(255) | NOT NULL | Original filename |
| `content_type` | VARCHAR(100) | NOT NULL | MIME type |
| `size_bytes` | BIGINT | NOT NULL | File size |
| `storage_url` | TEXT | NOT NULL | GCS URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

### `canvas_snapshots`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | Snapshot identifier |
| `board_id` | UUID | FK → boards.id ON DELETE CASCADE, UNIQUE | One active snapshot per board |
| `snapshot` | JSONB | NOT NULL | Full tldraw TLStoreSnapshot |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Snapshot version counter |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### `documents` (DEPRECATED — kept for backward compatibility)

Same as v1 Prisma `Document` model. Will be removed after 90-day deprecation period.

---

## 4. Index Strategy

| Table | Index Name | Columns | Type | Purpose |
|-------|-----------|---------|------|---------|
| `api_keys` | `idx_api_keys_hash` | `key_hash` | B-tree, UNIQUE | API key lookup by hash |
| `api_keys` | `idx_api_keys_board` | `board_id` | B-tree | List keys for a board |
| `canvas_items` | `idx_items_board_created` | `board_id, created_at` | B-tree | List items by board (default sort) |
| `canvas_items` | `idx_items_board_type` | `board_id, type` | B-tree | Filter items by type |
| `canvas_items` | `idx_items_board_zindex` | `board_id, z_index` | B-tree | Ordered rendering |
| `canvas_items` | `idx_items_frame` | `frame_id` | B-tree | Find items in a frame |
| `canvas_items` | `idx_items_content_gin` | `content` | GIN | JSONB content search |
| `connectors` | `idx_connectors_board` | `board_id` | B-tree | List connectors by board |
| `connectors` | `idx_connectors_from` | `from_item_id` | B-tree | Find connectors from item |
| `connectors` | `idx_connectors_to` | `to_item_id` | B-tree | Find connectors to item |
| `events` | `idx_events_board_created` | `board_id, created_at DESC` | B-tree | Event log pagination |
| `events` | `idx_events_board_type` | `board_id, event_type` | B-tree | Filter events by type |
| `webhooks` | `idx_webhooks_board` | `board_id` | B-tree | List webhooks for board |
| `webhook_deliveries` | `idx_deliveries_status_retry` | `status, next_retry_at` | B-tree | Retry queue query |
| `webhook_deliveries` | `idx_deliveries_webhook` | `webhook_id` | B-tree | Delivery history |
| `media_attachments` | `idx_media_board` | `board_id` | B-tree | List media by board |
| `media_attachments` | `idx_media_item` | `item_id` | B-tree | Find media for item |
| `canvas_snapshots` | `idx_snapshots_board` | `board_id` | B-tree, UNIQUE | One snapshot per board |

---

## 5. JSON Column Schemas

### `canvas_items.content` by Type

**`sticky`:**
```json
{
  "text": "string (required, max 500 chars)",
  "color": "string (optional, hex color, default #FFD700)"
}
```

**`text`:**
```json
{
  "text": "string (required)",
  "fontSize": "number (optional, default 16)",
  "fontFamily": "string (optional, default 'Inter')",
  "textAlign": "string (optional, 'left'|'center'|'right', default 'left')"
}
```

**`shape`:**
```json
{
  "shapeType": "string (required, 'rect'|'circle'|'diamond'|'triangle')",
  "label": "string (optional, text inside shape)"
}
```

**`frame`:**
```json
{
  "title": "string (optional, frame header text)",
  "children": "string[] (optional, IDs of items inside frame — auto-managed)"
}
```

**`image`:**
```json
{
  "storage_url": "string (required, GCS signed URL or external URL)",
  "alt_text": "string (optional)",
  "original_filename": "string (optional)",
  "width_original": "number (optional, original image width)",
  "height_original": "number (optional, original image height)"
}
```

**`document`:**
```json
{
  "title": "string (required)",
  "body": "string (required, Markdown content)",
  "format": "string (optional, 'markdown', default 'markdown')"
}
```

### `canvas_items.style`

Shared across all item types:

```json
{
  "color": "string (optional, hex or named color, e.g. '#FF0000' or 'red')",
  "fill": "string (optional, 'solid'|'semi'|'none', default 'solid')",
  "strokeColor": "string (optional, hex)",
  "strokeWidth": "number (optional, default 2)",
  "opacity": "number (optional, 0-1, default 1)",
  "fontSize": "number (optional, override for text elements)",
  "fontFamily": "string (optional)"
}
```

### `connectors.style`

```json
{
  "color": "string (optional, hex, default '#000000')",
  "strokeWidth": "number (optional, default 2)",
  "strokeStyle": "string (optional, 'solid'|'dashed'|'dotted', default 'solid')",
  "startMarker": "string (optional, 'none'|'arrow'|'dot', default 'none')",
  "endMarker": "string (optional, 'none'|'arrow'|'dot', default 'arrow')"
}
```

### `connectors.waypoints`

```json
[
  { "x": 150, "y": 250 },
  { "x": 200, "y": 300 }
]
```

### `canvas_snapshots.snapshot`

Full tldraw `TLStoreSnapshot` format:

```json
{
  "store": {
    "document:document": { "id": "document:document", "typeName": "document", ... },
    "page:page": { "id": "page:page", "typeName": "page", ... },
    "shape:abc123": { "id": "shape:abc123", "typeName": "shape", "type": "geo", "x": 100, "y": 200, ... },
    ...
  },
  "schema": { "schemaVersion": 2, "sequences": { ... } }
}
```

### `boards.settings`

```json
{
  "background": "string ('dots'|'grid'|'none', default 'dots')",
  "defaultItemColor": "string (hex, default '#FFD700')",
  "maxItems": "number (soft limit, default 10000)",
  "allowPublicView": "boolean (default false)"
}
```

---

## 6. Migration Plan

### Migration Sequence

All migrations are additive (no drops, no renames) until the deprecation period ends.

| Order | Migration File | Description |
|-------|---------------|-------------|
| M001 | `20260224_001_create_api_keys.sql` | Create `api_keys` table, backfill from `Board.api_key` |
| M002 | `20260224_002_create_canvas_items.sql` | Create `canvas_items` table with all columns and indexes |
| M003 | `20260224_003_create_connectors.sql` | Create `connectors` table |
| M004 | `20260224_004_create_events.sql` | Create `events` table |
| M005 | `20260224_005_create_canvas_snapshots.sql` | Create `canvas_snapshots` table |
| M006 | `20260224_006_create_webhooks.sql` | Create `webhooks` + `webhook_deliveries` tables |
| M007 | `20260224_007_create_media_attachments.sql` | Create `media_attachments` table |
| M008 | `20260224_008_backfill_api_keys.sql` | Backfill `api_keys` from `Board.api_key` (SHA-256 hash) |
| M009 | `20260224_009_backfill_documents_to_items.sql` | Create `canvas_items` rows for existing `Document` records |

### Prisma Schema Updates

After SQL migrations run, update `prisma/schema.prisma` to add models for all new tables. Use `prisma db pull` to introspect or manually write models that match the SQL tables.

**Important:** Prisma and Supabase SQL migrations must not conflict. Strategy: write all new tables as Supabase SQL migrations (for complex constraints and GIN indexes), then `prisma db pull` to sync the Prisma client.

### Rollback Strategy

Each migration has a corresponding down migration:

| Migration | Rollback |
|-----------|----------|
| M001 | `DROP TABLE api_keys;` |
| M002 | `DROP TABLE canvas_items;` |
| M003 | `DROP TABLE connectors;` |
| ... | `DROP TABLE ...;` |
| M008 | No rollback needed (backfill only) |
| M009 | `DELETE FROM canvas_items WHERE type = 'document';` |

---

## 7. Data Integrity Rules

### Foreign Key Cascades

| Relationship | On Delete | Rationale |
|-------------|-----------|-----------|
| `boards → api_keys` | CASCADE | Deleting board removes all keys |
| `boards → canvas_items` | CASCADE | Deleting board removes all items |
| `boards → connectors` | CASCADE | Deleting board removes all connectors |
| `boards → events` | CASCADE | Deleting board removes event history |
| `boards → webhooks` | CASCADE | Deleting board removes webhooks |
| `boards → canvas_snapshots` | CASCADE | Deleting board removes snapshots |
| `boards → media_attachments` | CASCADE | Deleting board removes media records |
| `boards → documents` | CASCADE | (Legacy) Deleting board removes documents |
| `canvas_items → connectors` (from/to) | CASCADE | Deleting item removes connected connectors |
| `canvas_items → canvas_items` (frame_id) | SET NULL | Deleting frame un-groups children |
| `canvas_items → media_attachments` | SET NULL | Deleting item orphans media (GCS lifecycle cleans up) |
| `webhooks → webhook_deliveries` | CASCADE | Deleting webhook removes delivery history |
| `events → webhook_deliveries` | CASCADE | Deleting event removes delivery records |

### Validation Rules (enforced in application layer via Zod)

| Rule | Scope | Description |
|------|-------|-------------|
| Board name length | boards.name | 1-255 characters |
| Item type enum | canvas_items.type | Must be one of the defined types |
| Position range | canvas_items.x/y | -1,000,000 to 1,000,000 |
| Dimension range | canvas_items.width/height | 1 to 10,000 |
| Rotation range | canvas_items.rotation | 0 to 360 |
| Z-index range | canvas_items.z_index | 0 to 100,000 |
| Sticky text length | content.text (sticky) | 1-500 characters |
| Webhook URL | webhooks.url | Valid HTTPS URL, not RFC 1918 private |
| Webhook events | webhooks.events | Non-empty array of valid event types |
| Connector endpoints | connectors.from/to | Must be different items on same board |
| File size | media_attachments.size_bytes | Max 10MB (10,485,760) |
| Content type | media_attachments.content_type | Allowlist: image/jpeg, image/png, image/gif, image/webp, image/svg+xml |
