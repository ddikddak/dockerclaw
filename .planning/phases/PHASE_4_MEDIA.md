# Phase 4: Documents, Images & Connectors

## Objectives

Add rich content types to the canvas: Markdown documents, image uploads, and visual connectors between items. After Phase 4, agents can push analysis reports (documents), charts (images), and relationship diagrams (connectors) to the canvas.

## Prerequisites

- Phase 1 complete (API endpoints for items CRUD)
- Phase 2 complete (tldraw canvas rendering)
- Phase 3 recommended (real-time sync) but not strictly required

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D4.1 | Image upload endpoint | Multipart upload to GCS with signed URLs |
| D4.2 | Image rendering on canvas | tldraw image shape with GCS URL |
| D4.3 | Document item type | Markdown content as canvas item with side-panel viewer |
| D4.4 | Connector CRUD API | REST endpoints for creating arrows between items |
| D4.5 | Connector rendering | tldraw arrow shapes mapped to DockerClaw connectors |
| D4.6 | GCS bucket setup | Cloud Storage configuration with CORS and lifecycle |
| D4.7 | Backward-compatible Document API | Legacy `/v1/boards/:id/documents` still works |

---

## Task Breakdown

### T4.1: Set Up Google Cloud Storage

**Description:** Create and configure GCS bucket for media uploads.

**Steps:**
```bash
# Create bucket
gsutil mb -l europe-west1 gs://dockerclaw-media-${PROJECT_ID}

# Set CORS policy
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://app.dockerclaw.com", "http://localhost:3000"],
    "method": ["GET", "PUT", "POST", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://dockerclaw-media-${PROJECT_ID}

# Set lifecycle policy (delete orphaned files after 30 days)
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 30,
          "matchesPrefix": ["orphaned/"]
        }
      }
    ]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://dockerclaw-media-${PROJECT_ID}
```

**Files:**
- Modify: `.env.example` (add `GCS_BUCKET`, `GCS_PROJECT_ID`)

**Acceptance Criteria:**
- Bucket exists in `europe-west1`
- CORS allows uploads from frontend domains
- Lifecycle policy configured

---

### T4.2: Create GCS Storage Module

**Description:** Server-side module for uploading files to GCS and generating signed URLs.

**Files:**
- Create: `src/lib/storage.ts`

**Dependencies:** `@google-cloud/storage`

**Implementation:**
```typescript
// src/lib/storage.ts
import { Storage } from '@google-cloud/storage'
import { config } from './config'
import { logger } from './logger'
import crypto from 'crypto'

const storage = new Storage({ projectId: config.gcsProjectId })
const bucket = storage.bucket(config.gcsBucket)

export async function uploadFile(
  file: Express.Multer.File,
  boardId: string
): Promise<{ storageUrl: string; filename: string }> {
  const ext = file.originalname.split('.').pop()
  const uniqueName = `${boardId}/${crypto.randomUUID()}.${ext}`
  const blob = bucket.file(uniqueName)

  await blob.save(file.buffer, {
    contentType: file.mimetype,
    metadata: {
      boardId,
      originalName: file.originalname,
    },
  })

  const storageUrl = `https://storage.googleapis.com/${config.gcsBucket}/${uniqueName}`

  logger.info({ boardId, filename: uniqueName, sizeBytes: file.size }, 'File uploaded to GCS')

  return { storageUrl, filename: uniqueName }
}

export async function getSignedUrl(filename: string): Promise<string> {
  const [url] = await bucket.file(filename).getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  })
  return url
}

export async function deleteFile(filename: string): Promise<void> {
  try {
    await bucket.file(filename).delete()
    logger.info({ filename }, 'File deleted from GCS')
  } catch (err) {
    logger.warn({ err, filename }, 'Failed to delete file from GCS')
  }
}
```

---

### T4.3: Implement Image Upload Endpoint

**Description:** Multipart file upload endpoint that stores files in GCS and updates the canvas item.

**Files:**
- Create: `src/routes/media.ts`
- Modify: `src/app.ts` (register route)

**Dependencies:** `multer`

**Implementation:**
```typescript
// src/routes/media.ts
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { uploadFile } from '../lib/storage'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`))
    }
  },
})

const router = Router()

// POST /v1/boards/:id/items/:itemId/upload
router.post(
  '/:id/items/:itemId/upload',
  requireAuth('write'),
  upload.single('file'),
  async (req, res) => {
    const { id: boardId, itemId } = req.params

    // Verify item exists and is type 'image'
    const item = await prisma.canvasItem.findFirst({
      where: { id: itemId, board_id: boardId },
    })

    if (!item) {
      return res.status(404).json({
        error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' },
      })
    }

    if (item.type !== 'image') {
      return res.status(400).json({
        error: { code: 'INVALID_TYPE', message: 'Upload only supported for image items' },
      })
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      })
    }

    // Upload to GCS
    const { storageUrl, filename } = await uploadFile(req.file, boardId)

    // Update item content
    const updatedItem = await prisma.canvasItem.update({
      where: { id: itemId },
      data: {
        content: {
          storage_url: storageUrl,
          alt_text: req.body.alt_text || '',
          original_filename: req.file.originalname,
        },
        updated_at: new Date(),
      },
    })

    // Create media attachment record
    const media = await prisma.mediaAttachment.create({
      data: {
        board_id: boardId,
        item_id: itemId,
        filename,
        content_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_url: storageUrl,
      },
    })

    // Log event
    await prisma.event.create({
      data: {
        board_id: boardId,
        item_id: itemId,
        actor_type: 'agent',
        actor_id: req.apiKey.key_prefix,
        event_type: 'item.updated',
        payload: { action: 'upload', filename: req.file.originalname },
      },
    })

    res.status(200).json({
      data: {
        id: media.id,
        filename: req.file.originalname,
        content_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_url: storageUrl,
        item: updatedItem,
      },
    })
  }
)

export default router
```

**Acceptance Criteria:**
- Upload 5MB JPEG completes in < 5s
- File stored in GCS at `{boardId}/{uuid}.{ext}`
- Canvas item `content.storage_url` updated
- `media_attachments` row created
- Event logged
- Rejects files > 10MB with 413
- Rejects non-image files with 415
- Returns storage URL in response

---

### T4.4: Render Images on Canvas

**Description:** Display uploaded images as tldraw shapes on the canvas.

**Files:**
- Modify: `frontend/src/lib/tldraw/store.ts` (add image type mapping)

**tldraw Image Support:**
tldraw has built-in `TLImageShape`. Map DockerClaw `image` items to tldraw image records:

```typescript
// In itemsToTldrawRecords, handle type 'image':
case 'image': {
  return {
    id: `shape:${item.id}`,
    typeName: 'shape',
    type: 'image',
    x: item.x,
    y: item.y,
    props: {
      w: item.width || 300,
      h: item.height || 200,
      assetId: `asset:${item.id}`, // Reference to tldraw asset
      url: item.content.storage_url,
    },
    meta: { dockerclaw_id: item.id },
  }
}
```

**Asset Registration:**
tldraw requires images to be registered as assets:
```typescript
store.putAsset({
  id: `asset:${item.id}`,
  type: 'image',
  typeName: 'asset',
  props: {
    src: item.content.storage_url,
    w: item.content.width_original || 300,
    h: item.content.height_original || 200,
    mimeType: 'image/png',
    name: item.content.original_filename || 'image',
  },
})
```

**Acceptance Criteria:**
- Images uploaded via API render on canvas
- Images can be resized and moved
- Image URL loads correctly (GCS signed URL or public URL)

---

### T4.5: Implement Document Item Type

**Description:** Canvas items of type `document` that display a Markdown preview and open in a side panel for full viewing/editing.

**Files:**
- Modify: `frontend/src/lib/tldraw/store.ts` (add document type mapping)
- Create: `frontend/src/components/canvas/DocumentPanel.tsx`

**Canvas Rendering:**
Documents appear as card-like shapes on the canvas showing:
- Title in bold
- First 2 lines of body as preview
- Document icon
- Click to open side panel

**Side Panel:**
```typescript
// frontend/src/components/canvas/DocumentPanel.tsx
'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { CanvasItem } from '@/types/canvas'

interface DocumentPanelProps {
  item: CanvasItem
  onClose: () => void
  onUpdate: (content: { title: string; body: string }) => void
}

export function DocumentPanel({ item, onClose, onUpdate }: DocumentPanelProps) {
  const content = item.content as { title: string; body: string }
  const [isEditing, setIsEditing] = useState(false)
  const [body, setBody] = useState(content.body)

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{content.title}</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            className="w-full h-full font-mono text-sm"
            value={body}
            onChange={e => setBody(e.target.value)}
            onBlur={() => {
              setIsEditing(false)
              onUpdate({ title: content.title, body })
            }}
          />
        ) : (
          <div className="prose prose-sm max-w-none" onClick={() => setIsEditing(true)}>
            <ReactMarkdown>{content.body}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- Document items render as cards on canvas with title + preview
- Clicking document opens side panel with full Markdown rendering
- Side panel supports inline editing (click to edit, blur to save)
- Content changes persist via API
- Existing `DocumentViewer` component reused where possible

---

### T4.6: Implement Connector CRUD API

**Description:** REST endpoints for creating, reading, updating, and deleting connectors.

**Files:**
- Create: `src/routes/connectors.ts`
- Modify: `src/app.ts` (register route)

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/boards/:id/connectors` | Create connector |
| GET | `/v1/boards/:id/connectors` | List connectors |
| GET | `/v1/boards/:id/connectors/:connectorId` | Get connector |
| PATCH | `/v1/boards/:id/connectors/:connectorId` | Update connector |
| DELETE | `/v1/boards/:id/connectors/:connectorId` | Delete connector |

**Validation:**
```typescript
const CreateConnectorSchema = z.object({
  from_item_id: z.string().uuid(),
  to_item_id: z.string().uuid(),
  label: z.string().max(200).optional(),
  style: z.object({
    color: z.string().optional(),
    strokeWidth: z.number().min(1).max(10).optional(),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    startMarker: z.enum(['none', 'arrow', 'dot']).optional(),
    endMarker: z.enum(['none', 'arrow', 'dot']).optional(),
  }).optional(),
})
```

**Validation Rules:**
- `from_item_id` and `to_item_id` must exist on the same board
- `from_item_id !== to_item_id` (no self-connections)
- Both items must belong to the board in the URL

**Acceptance Criteria:**
- All 5 endpoints functional
- Validates both items exist on same board
- Rejects self-connections
- Event logged on create/update/delete
- Redis publish for WebSocket bridge

---

### T4.7: Render Connectors on Canvas

**Description:** Map DockerClaw connectors to tldraw arrow shapes.

**Files:**
- Modify: `frontend/src/lib/tldraw/store.ts`

**tldraw Arrow Shape:**
```typescript
// Convert connector to tldraw arrow
function connectorToTldrawArrow(connector: Connector): TLRecord {
  return {
    id: `shape:connector:${connector.id}`,
    typeName: 'shape',
    type: 'arrow',
    x: 0, // Arrows position relative to start/end
    y: 0,
    props: {
      start: {
        type: 'binding',
        boundShapeId: `shape:${connector.from_item_id}`,
        normalizedAnchor: { x: 0.5, y: 0.5 },
      },
      end: {
        type: 'binding',
        boundShapeId: `shape:${connector.to_item_id}`,
        normalizedAnchor: { x: 0.5, y: 0.5 },
      },
      text: connector.label || '',
      arrowheadStart: mapMarker(connector.style?.startMarker),
      arrowheadEnd: mapMarker(connector.style?.endMarker),
      color: connector.style?.color || 'black',
    },
    meta: {
      dockerclaw_id: connector.id,
      dockerclaw_type: 'connector',
    },
  }
}
```

**Acceptance Criteria:**
- Connectors render as arrows between two items
- Arrows update when connected items are moved
- Labels display on connectors
- Arrow styles (solid/dashed, markers) respected

---

### T4.8: Backward-Compatible Document API

**Description:** Keep legacy document endpoints working by mapping to canvas items internally.

**Files:**
- Modify: `src/routes/legacy.ts` or create specific handlers

**Mapping:**
```typescript
// POST /v1/boards/:id/documents → create canvas_item with type 'document'
router.post('/v1/boards/:id/documents', requireAuth('write'), async (req, res) => {
  const { title, content, author } = req.body

  // Find the next available position (stack documents vertically)
  const lastDoc = await prisma.canvasItem.findFirst({
    where: { board_id: req.params.id, type: 'document' },
    orderBy: { y: 'desc' },
  })
  const nextY = lastDoc ? lastDoc.y + 250 : 0

  const item = await prisma.canvasItem.create({
    data: {
      board_id: req.params.id,
      type: 'document',
      x: 0,
      y: nextY,
      width: 400,
      height: 200,
      content: { title, body: content, format: 'markdown' },
      created_by: author || req.apiKey.key_prefix,
    },
  })

  // Return in legacy Document format
  res.status(201).json({
    data: {
      id: item.id,
      board_id: item.board_id,
      title,
      content,
      author: author || req.apiKey.key_prefix,
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
  })
})

// GET /v1/boards/:id/documents → list canvas_items WHERE type = 'document'
// GET /v1/boards/:id/documents/:docId → get canvas_item by id
```

**Acceptance Criteria:**
- Legacy document POST creates a canvas item
- Legacy document GET returns data in original format
- Deprecation header: `Deprecation: true` + `Sunset: <date 90 days out>`
- Existing v1 clients continue working

---

### T4.9: Integration Tests

**Files:**
- Create: `tests/media.test.ts`
- Create: `tests/connectors.test.ts`
- Create: `tests/documents-legacy.test.ts`

**Test Cases:**
- Upload image → verify GCS URL returned
- Upload oversized file → verify 413
- Upload non-image → verify 415
- Create connector → verify both items exist
- Create self-connector → verify 422
- Create connector across boards → verify 422
- Legacy POST document → verify canvas item created
- Legacy GET document → verify legacy format returned

---

## Definition of Done

- [ ] Images uploadable via API (`POST .../upload`)
- [ ] Images render on tldraw canvas
- [ ] Images can be resized/moved, changes persist
- [ ] Document items render as cards on canvas
- [ ] Clicking document opens side panel with Markdown viewer
- [ ] Connectors CRUD API fully functional
- [ ] Connectors render as arrows between items on canvas
- [ ] Legacy document API still works (backward compat)
- [ ] All new endpoints tested (>80% coverage)
- [ ] File uploads capped at 10MB
- [ ] GCS bucket configured with CORS and lifecycle

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GCS signed URL expiration (1 hour) | Medium | Frontend checks URL expiry, requests new signed URL if expired; or use public URLs with ACL |
| Large image files slow canvas rendering | Medium | Generate thumbnails on upload (sharp library); serve thumbnails for canvas, full-res in panel |
| tldraw arrow binding API changes | Medium | Pin tldraw version; test arrow rendering in CI |
| Cloud Run cold start with multer/GCS | Low | Multer uses memory storage (fast); GCS client initializes on first request |
