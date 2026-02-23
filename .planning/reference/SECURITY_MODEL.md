# Security Model

## 1. Authentication

### Current Model (v1) — Issues

```
Board.api_key stored as PLAINTEXT in Prisma/PostgreSQL
└─ Lookup: SELECT * FROM Board WHERE api_key = $received_key
└─ Problem: Database compromise exposes all API keys
└─ Problem: Logs may contain plaintext keys
```

### Target Model (v2)

```
api_keys table:
  key_hash: SHA-256(dc_original_key)    ← stored
  key_prefix: "dc_a1b2"                ← stored (for identification)
  original key: NEVER stored            ← shown once on creation

Lookup flow:
  1. Agent sends: X-API-Key: dc_a1b2c3d4e5f6...
  2. API computes: SHA-256("dc_a1b2c3d4e5f6...") = "abc123..."
  3. Redis cache check: GET apikey:abc123...
  4. Cache miss: SELECT * FROM api_keys WHERE key_hash = 'abc123...' AND is_active = true
  5. Cache hit: validate board_id matches route param
  6. Update last_used_at (debounced, not every request)
```

### Key Format

```
dc_ + 64 hex characters (32 random bytes)
    ↑ prefix (always dc_)
       ↑ 256 bits of entropy
```

**Example:** `dc_a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678`

### Key Generation

```typescript
import crypto from 'crypto'

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `dc_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 7) // "dc_a1b2"
  return { key, hash, prefix }
}
```

---

## 2. Authorization Scopes

### Scope Definitions

| Scope | Permissions |
|-------|-------------|
| `read` | GET all resources (boards, items, connectors, events) |
| `write` | POST, PATCH, PUT, DELETE on items, connectors |
| `admin` | DELETE boards, manage API keys, manage webhooks |

### Default Scopes by Key Type

| Key Type | Default Scopes |
|----------|---------------|
| Board creation key (auto-generated) | `read`, `write`, `admin` |
| Additional key (manually created) | Configurable; default `read`, `write` |
| Read-only key | `read` only |

### Scope Enforcement

```typescript
// Middleware example
router.delete('/boards/:id', requireAuth('admin'), ...)
router.post('/boards/:id/items', requireAuth('write'), ...)
router.get('/boards/:id/items', requireAuth('read'), ...)
```

### Board-Level Isolation

Every API key is scoped to exactly one board. An API key for Board A cannot access Board B's resources. This is enforced by checking `api_keys.board_id === req.params.id` in the auth middleware.

---

## 3. Threat Model

| # | Threat | Severity | Likelihood | Mitigation |
|---|--------|----------|------------|------------|
| T1 | API key leakage (logs, client-side) | High | Medium | Keys hashed at rest; prefix-only in logs; `redact` in Pino; never in frontend code |
| T2 | Brute-force API key guessing | High | Low | 256-bit entropy makes guessing infeasible (2^256 possibilities) |
| T3 | Webhook SSRF | Medium | Medium | DNS resolution check: reject RFC 1918, localhost, link-local addresses |
| T4 | Rate limit bypass | Medium | Medium | Per-key rate limiting in Redis; global rate limit for unauthenticated |
| T5 | Large payload DoS | Medium | Medium | `express.json({ limit: '1mb' })`, multer 10MB limit, batch 100-item limit |
| T6 | SQL injection | High | Low | Prisma parameterized queries exclusively; no raw SQL in application code |
| T7 | XSS via canvas content | Medium | Medium | Content sanitized before rendering; tldraw sandboxes shapes; CSP headers |
| T8 | CORS misconfiguration | Medium | High | Currently wildcard `cors()` — **must fix**: allowlist of known origins |
| T9 | Webhook replay attack | Low | Low | Timestamp in payload; SDK verifies < 5 min age |
| T10 | Database credential exposure | High | Low | Environment variables via Secret Manager; never in source code |
| T11 | Dependency vulnerability | Medium | Medium | `npm audit` in CI; Dependabot/Renovate for auto-updates |
| T12 | Unauthorized board deletion | High | Low | `admin` scope required; board deletion is soft-delete (30-day recovery) |

---

## 4. Security Controls

### 4.1 Transport Security

- All Cloud Run services enforce HTTPS (HTTP → HTTPS redirect automatic)
- Vercel enforces HTTPS
- Supabase connections use TLS
- WebSocket connections use WSS (TLS)
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 4.2 CORS Configuration

```typescript
// Current (INSECURE):
app.use(cors())  // ← allows ANY origin

// Target:
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Idempotency-Key'],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-Id',
    'X-Idempotency-Replay',
  ],
  maxAge: 86400, // Preflight cache: 24 hours
}))
```

### 4.3 Security Headers (Helmet)

```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
      imgSrc: ["'self'", "https://storage.googleapis.com"],
      connectSrc: ["'self'", process.env.WS_URL || ''],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
```

### 4.4 Rate Limiting

| Tier | Limit | Window | Scope |
|------|-------|--------|-------|
| Standard | 1,000 requests | 1 minute | Per API key |
| Batch | 50 requests | 1 minute | Per API key |
| Upload | 20 requests | 1 minute | Per API key |
| Unauthenticated | 10 requests | 1 minute | Per IP |

**Implementation:** Redis sliding window via `rate-limiter-flexible`:

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 1000,      // requests
  duration: 60,       // per 60 seconds
  keyPrefix: 'rl',
})

// In middleware
const key = req.apiKey?.key_prefix || req.ip
const result = await rateLimiter.consume(key)

res.set('X-RateLimit-Limit', '1000')
res.set('X-RateLimit-Remaining', String(result.remainingPoints))
res.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000 + result.msBeforeNext / 1000)))
```

### 4.5 Input Validation

- All request bodies validated by Zod schemas
- Maximum request body: 1MB (5MB for batch, 10MB for upload)
- UUID format enforced on all ID parameters
- URL format enforced on webhook URLs
- File type allowlist for uploads

### 4.6 Logging Security

```typescript
// Pino redaction configuration
const logger = pino({
  redact: {
    paths: [
      'req.headers["x-api-key"]',
      'api_key',
      'secret',
      'key',
      'password',
      'authorization',
    ],
    censor: '[REDACTED]',
  },
})
```

---

## 5. Key Rotation Procedure

### Zero-Downtime Key Rotation

1. **Create new key:** `POST /v1/boards/:id/keys` → receive new `dc_newkey...`
2. **Update agent config:** Replace old key with new key in agent configuration
3. **Verify:** Agent makes test request with new key → 200 OK
4. **Revoke old key:** `DELETE /v1/boards/:id/keys/:oldKeyId`
5. **Clear cache:** Old key's Redis cache expires after 60s

### Multiple Active Keys

A board can have multiple active API keys. This enables:
- Key rotation without downtime
- Different keys for different agents (with different scopes)
- Key revocation without affecting other agents

### Protection: Last Key Guard

Cannot revoke the last active key for a board:
```typescript
const activeKeys = await prisma.apiKey.count({
  where: { board_id: boardId, is_active: true },
})
if (activeKeys <= 1) {
  return res.status(400).json({
    error: { code: 'LAST_KEY', message: 'Cannot revoke the last active API key' },
  })
}
```

---

## 6. Webhook Security

### HMAC Signature

Every webhook delivery includes a signature header:
```
X-DockerClaw-Signature: sha256=<hex-hmac-sha256>
```

Computed as:
```typescript
const signature = `sha256=${crypto
  .createHmac('sha256', webhookSecret)
  .update(rawJsonBody, 'utf8')
  .digest('hex')}`
```

### Webhook Secret Storage

Webhook secrets need to be retrievable (for HMAC signing), so they cannot be one-way hashed. Options:

1. **Encrypt at rest** using AES-256-GCM with a server-side key stored in Secret Manager
2. **Store in Secret Manager** directly (GCP Secret Manager)
3. **Derive from board key** (less flexible but no additional storage)

**Recommended:** Option 1 — AES-256-GCM encryption with server key in env var.

### Replay Protection

Webhook payloads include a `timestamp` field. SDK verifies:
```python
# In SDK
import time
event_time = parse_iso(payload["timestamp"])
if abs(time.time() - event_time.timestamp()) > 300:  # 5 minutes
    raise ReplayAttackError("Webhook payload too old")
```

### SSRF Protection

Before delivering webhooks, validate the URL:
```typescript
async function isPrivateUrl(url: string): Promise<boolean> {
  const parsed = new URL(url)

  // Must be HTTPS
  if (parsed.protocol !== 'https:') return true

  // Resolve hostname
  const addresses = await dns.promises.resolve(parsed.hostname)

  return addresses.some(addr => {
    const parts = addr.split('.').map(Number)
    return (
      addr === '127.0.0.1' ||
      addr === '0.0.0.0' ||
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) // Link-local
    )
  })
}
```

---

## 7. Data Protection

### Data Classification

| Data Type | Classification | Storage | Protection |
|-----------|---------------|---------|------------|
| Board name/description | Internal | PostgreSQL | Standard access control |
| Canvas item content | Internal | PostgreSQL (JSONB) | Board-scoped access |
| API keys | Secret | PostgreSQL (hashed) | SHA-256 hash, never plaintext |
| Webhook secrets | Secret | PostgreSQL (encrypted) | AES-256-GCM encryption |
| Media files | Internal | GCS | Signed URLs (1h expiry) |
| Event payloads | Internal | PostgreSQL | Board-scoped access |
| User cursors/presence | Transient | Memory (Yjs) | Not persisted |

### Data Retention

| Data Type | Retention | Deletion |
|-----------|-----------|----------|
| Boards | Until deleted (30-day soft delete) | Cascade to all child data |
| Canvas items | Until deleted | Hard delete |
| Events | 90 days | Auto-cleanup via cron job |
| Webhook deliveries | 7 days | Auto-cleanup via cron job |
| Media files | Until item deleted + 30 days (GCS lifecycle) | GCS lifecycle policy |
| Snapshots | Latest only (overwritten) | CASCADE with board |
