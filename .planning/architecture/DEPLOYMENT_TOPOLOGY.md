# Deployment Topology

## 1. Production Environment

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform (europe-west1)              │
│                                                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────┐        │
│  │  Cloud Run: API         │    │  Cloud Run: WebSocket   │        │
│  │  dockerclaw-api         │    │  dockerclaw-ws          │        │
│  │                         │    │                         │        │
│  │  Image: gcr.io/PROJECT/ │    │  Image: gcr.io/PROJECT/ │        │
│  │    dockerclaw-api:SHA   │    │    dockerclaw-ws:SHA    │        │
│  │                         │    │                         │        │
│  │  Min: 0  Max: 10       │    │  Min: 1  Max: 5        │        │
│  │  Mem: 512Mi CPU: 1     │    │  Mem: 256Mi CPU: 1     │        │
│  │  Concurrency: 80       │    │  Concurrency: 1000     │        │
│  │  Timeout: 300s         │    │  Timeout: 3600s        │        │
│  │  Port: 8080            │    │  Port: 8080            │        │
│  └────────────┬────────────┘    └────────────┬────────────┘        │
│               │                              │                      │
│               │         ┌────────────────────┤                      │
│               │         │                    │                      │
│               ▼         ▼                    │                      │
│  ┌─────────────────────────┐                 │                      │
│  │  Cloud Memorystore      │                 │                      │
│  │  (Redis 7.x)            │◄────────────────┘                      │
│  │                         │                                        │
│  │  Tier: Basic            │                                        │
│  │  Mem: 1GB               │                                        │
│  │  Region: europe-west1   │                                        │
│  └─────────────────────────┘                                        │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  Cloud Storage (GCS)    │                                        │
│  │  Bucket: dockerclaw-    │                                        │
│  │    media-{PROJECT}      │                                        │
│  │  Region: europe-west1   │                                        │
│  │  Lifecycle: 30d orphan  │                                        │
│  └─────────────────────────┘                                        │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  Container Registry     │                                        │
│  │  gcr.io/{PROJECT}/      │                                        │
│  │    dockerclaw-api       │                                        │
│  │    dockerclaw-ws        │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│  Vercel (Global CDN)        │  │  Supabase (EU Region)       │
│                             │  │                             │
│  Project: dockerclaw        │  │  PostgreSQL 15+             │
│  Framework: Next.js 16      │  │  PgBouncer (connection pool)│
│  Build: standalone          │  │                             │
│  Domain: app.dockerclaw.com │  │  Project: dockerclaw        │
└─────────────────────────────┘  │  Region: eu-west-1          │
                                 └─────────────────────────────┘
```

---

## 2. Service Configuration

### Cloud Run: `dockerclaw-api`

| Setting | Value | Rationale |
|---------|-------|-----------|
| Image | `gcr.io/$PROJECT_ID/dockerclaw-api:$SHORT_SHA` | Versioned by git SHA |
| Region | `europe-west1` | Same as current deployment |
| Memory | 512Mi | Sufficient for Express + Prisma + Redis clients |
| CPU | 1 | Single vCPU handles 80 concurrent requests |
| Min instances | 0 | Scale to zero when idle (cost savings) |
| Max instances | 10 | Handles ~500 RPS sustained |
| Concurrency | 80 | Requests per container instance |
| Request timeout | 300s | 5 min for large batch operations |
| Port | 8080 | Standard Cloud Run port |
| Ingress | All traffic | Public API |
| CPU allocation | Request-based | CPU only during request handling |

### Cloud Run: `dockerclaw-ws`

| Setting | Value | Rationale |
|---------|-------|-----------|
| Image | `gcr.io/$PROJECT_ID/dockerclaw-ws:$SHORT_SHA` | Versioned by git SHA |
| Region | `europe-west1` | Co-located with API + Redis |
| Memory | 256Mi | Y.Doc in-memory, ~100 boards = ~100MB |
| CPU | 1 | Handles 1000 WebSocket connections |
| Min instances | 1 | **Must not cold start** (WebSocket connections) |
| Max instances | 5 | Horizontal scale with Redis pub/sub |
| Concurrency | 1000 | WebSocket connections per instance |
| Request timeout | 3600s | 1 hour (long-lived WebSocket connections) |
| Port | 8080 | Standard Cloud Run port |
| Ingress | All traffic | Public WebSocket endpoint |
| CPU allocation | **Always allocated** | Must process WebSocket messages even between HTTP requests |
| Session affinity | Enabled | Keep WebSocket connections on same instance |

### Vercel: Frontend

| Setting | Value | Rationale |
|---------|-------|-----------|
| Framework | Next.js 16 | Auto-detected by Vercel |
| Build output | `standalone` | Minimal server bundle |
| Region | Auto (global edge) | CDN for static assets, serverless for SSR |
| Domain | `app.dockerclaw.com` | Custom domain |
| Deploy trigger | Push to `main` | Auto-deploy on merge |
| Environment | Production | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` |

### Redis: Cloud Memorystore

| Setting | Value | Rationale |
|---------|-------|-----------|
| Tier | Basic | Single node, no replication (MVP) |
| Memory | 1GB | Sufficient for caching + pub/sub + queues |
| Version | 7.x | Latest stable |
| Region | `europe-west1` | Same region as Cloud Run services |
| Authorized network | Default VPC | Cloud Run connects via VPC connector |

**Alternative (dev/staging):** Upstash Redis (serverless, free tier available, no VPC needed)

---

## 3. CI/CD Pipeline

### Current Pipeline (`cloudbuild.yaml`)

```yaml
# Current (v1) — builds and deploys API only
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/dockerclaw-backend:$SHORT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/dockerclaw-backend:$SHORT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'run'
      - 'deploy'
      - 'dockerclaw-backend'
      - '--image=gcr.io/$PROJECT_ID/dockerclaw-backend:$SHORT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--max-instances=10'
```

### Target Pipeline (`cloudbuild.yaml` — v2)

```yaml
steps:
  # Step 1: Install dependencies
  - name: 'node:22-slim'
    entrypoint: 'npm'
    args: ['ci']
    id: 'install'

  # Step 2: Run linting
  - name: 'node:22-slim'
    entrypoint: 'npm'
    args: ['run', 'lint']
    id: 'lint'
    waitFor: ['install']

  # Step 3: Run tests
  - name: 'node:22-slim'
    entrypoint: 'npm'
    args: ['test', '--', '--coverage', '--ci']
    id: 'test'
    waitFor: ['install']
    env:
      - 'DATABASE_URL=postgresql://test:test@localhost:5432/test'
      - 'REDIS_URL=redis://localhost:6379'

  # Step 4: Build API Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/dockerclaw-api:$SHORT_SHA', '-t', 'gcr.io/$PROJECT_ID/dockerclaw-api:latest', '.']
    id: 'build-api'
    waitFor: ['test', 'lint']

  # Step 5: Build WebSocket Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/dockerclaw-ws:$SHORT_SHA', '-t', 'gcr.io/$PROJECT_ID/dockerclaw-ws:latest', '-f', 'ws/Dockerfile', './ws']
    id: 'build-ws'
    waitFor: ['test', 'lint']

  # Step 6: Push images (parallel)
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/dockerclaw-api:$SHORT_SHA']
    id: 'push-api'
    waitFor: ['build-api']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/dockerclaw-ws:$SHORT_SHA']
    id: 'push-ws'
    waitFor: ['build-ws']

  # Step 7: Run database migrations
  - name: 'node:22-slim'
    entrypoint: 'npx'
    args: ['prisma', 'migrate', 'deploy']
    id: 'migrate'
    waitFor: ['push-api']
    env:
      - 'DATABASE_URL=${_DATABASE_URL}'

  # Step 8: Deploy API to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'dockerclaw-api'
      - '--image=gcr.io/$PROJECT_ID/dockerclaw-api:$SHORT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--max-instances=10'
      - '--min-instances=0'
      - '--concurrency=80'
      - '--timeout=300'
      - '--set-env-vars=NODE_ENV=production'
    id: 'deploy-api'
    waitFor: ['migrate']

  # Step 9: Deploy WebSocket to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'dockerclaw-ws'
      - '--image=gcr.io/$PROJECT_ID/dockerclaw-ws:$SHORT_SHA'
      - '--region=europe-west1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=256Mi'
      - '--cpu=1'
      - '--max-instances=5'
      - '--min-instances=1'
      - '--concurrency=1000'
      - '--timeout=3600'
      - '--cpu-boost'
      - '--session-affinity'
      - '--set-env-vars=NODE_ENV=production'
    id: 'deploy-ws'
    waitFor: ['push-ws']

  # Step 10: Smoke test
  - name: 'curlimages/curl'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        curl -f https://dockerclaw-api-${_REGION_HASH}.run.app/health || exit 1
        curl -f https://dockerclaw-ws-${_REGION_HASH}.run.app/health || exit 1
    id: 'smoke-test'
    waitFor: ['deploy-api', 'deploy-ws']

substitutions:
  _DATABASE_URL: ''
  _REGION_HASH: ''

options:
  logging: CLOUD_LOGGING_ONLY
```

### Frontend CI/CD (Vercel)

Vercel auto-deploys on push to `main`. No custom pipeline needed.

**Build Settings:**
- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `.next`
- Install command: `npm ci`

**Environment Variables (Vercel Dashboard):**

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.dockerclaw.com` | Production |
| `NEXT_PUBLIC_API_URL` | `https://dockerclaw-api-dev-....run.app` | Preview |
| `NEXT_PUBLIC_WS_URL` | `wss://ws.dockerclaw.com` | Production |
| `NEXT_PUBLIC_WS_URL` | `wss://dockerclaw-ws-dev-....run.app` | Preview |

---

## 4. Environment Variables Reference

### API Service (`dockerclaw-api`)

| Variable | Description | Example | Secret |
|----------|-------------|---------|--------|
| `NODE_ENV` | Environment mode | `production` | No |
| `PORT` | Server port | `8080` | No |
| `DATABASE_URL` | Supabase PostgreSQL connection string (pooled) | `postgresql://user:pass@db.supabase.co:6543/postgres` | Yes |
| `DIRECT_DATABASE_URL` | Direct connection (for migrations) | `postgresql://user:pass@db.supabase.co:5432/postgres` | Yes |
| `REDIS_URL` | Redis connection string | `redis://10.0.0.5:6379` | Yes |
| `GCS_BUCKET` | Google Cloud Storage bucket name | `dockerclaw-media-myproject` | No |
| `GCS_PROJECT_ID` | GCP project ID for storage | `my-gcp-project` | No |
| `WEBHOOK_HMAC_SALT` | Salt for webhook secret generation | `random-32-byte-hex` | Yes |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `https://app.dockerclaw.com,http://localhost:3000` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `60000` | No |
| `RATE_LIMIT_MAX` | Max requests per window | `1000` | No |
| `LOG_LEVEL` | Pino log level | `info` | No |

### WebSocket Service (`dockerclaw-ws`)

| Variable | Description | Example | Secret |
|----------|-------------|---------|--------|
| `NODE_ENV` | Environment mode | `production` | No |
| `PORT` | Server port | `8080` | No |
| `DATABASE_URL` | Supabase PostgreSQL (for snapshot persistence) | Same as API | Yes |
| `REDIS_URL` | Redis (for bridge subscription) | Same as API | Yes |
| `SNAPSHOT_INTERVAL_MS` | How often to persist Y.Doc | `30000` | No |
| `IDLE_TIMEOUT_MS` | Evict room after no connections | `300000` | No |
| `LOG_LEVEL` | Pino log level | `info` | No |

### Frontend (`frontend/`)

| Variable | Description | Example | Secret |
|----------|-------------|---------|--------|
| `NEXT_PUBLIC_API_URL` | REST API base URL | `https://api.dockerclaw.com` | No |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `wss://ws.dockerclaw.com` | No |

---

## 5. Custom Domains

### Cloud Run Custom Domain Mapping

```bash
# API
gcloud run domain-mappings create \
  --service dockerclaw-api \
  --domain api.dockerclaw.com \
  --region europe-west1

# WebSocket
gcloud run domain-mappings create \
  --service dockerclaw-ws \
  --domain ws.dockerclaw.com \
  --region europe-west1
```

**DNS Records Required:**
| Domain | Record Type | Value |
|--------|------------|-------|
| `api.dockerclaw.com` | CNAME | `ghs.googlehosted.com.` |
| `ws.dockerclaw.com` | CNAME | `ghs.googlehosted.com.` |
| `app.dockerclaw.com` | CNAME | `cname.vercel-dns.com.` |

Cloud Run auto-provisions SSL certificates via Let's Encrypt.

---

## 6. Local Development

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3001:8080'
    environment:
      - NODE_ENV=development
      - PORT=8080
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/dockerclaw
      - REDIS_URL=redis://redis:6379
      - GCS_BUCKET=dockerclaw-media-dev
      - CORS_ORIGINS=http://localhost:3000
      - LOG_LEVEL=debug
    depends_on:
      - db
      - redis
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma

  ws:
    build:
      context: ./ws
      dockerfile: Dockerfile
    ports:
      - '3002:8080'
    environment:
      - NODE_ENV=development
      - PORT=8080
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/dockerclaw
      - REDIS_URL=redis://redis:6379
      - SNAPSHOT_INTERVAL_MS=10000
      - LOG_LEVEL=debug
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: dockerclaw
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

### Development Workflow

```bash
# Start all services
docker-compose up -d

# Run migrations
npx prisma migrate deploy

# Start API in dev mode (with hot reload)
npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev

# Run tests
npm test

# View logs
docker-compose logs -f api ws
```

---

## 7. Monitoring & Observability

### Health Check Endpoints

**API:** `GET /health`
```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**WebSocket:** `GET /health`
```json
{
  "status": "ok",
  "rooms": 12,
  "connections": 45
}
```

### Cloud Monitoring Dashboards

| Metric | Service | Alert Threshold |
|--------|---------|----------------|
| Request latency (p99) | API | > 500ms for 5 min |
| Error rate (5xx) | API | > 1% for 5 min |
| Instance count | API | At max (10) for 10 min |
| Active connections | WS | > 4000 (80% of max capacity) |
| Memory utilization | Both | > 80% |
| Redis memory usage | Redis | > 80% |
| DB connections | API | > 80% of pool max |

### Structured Logging

All services use Pino with JSON output, compatible with Cloud Logging:

```json
{
  "level": "info",
  "time": 1708689600000,
  "msg": "Item created",
  "service": "dockerclaw-api",
  "requestId": "uuid",
  "boardId": "uuid",
  "itemId": "uuid",
  "itemType": "sticky",
  "latencyMs": 45,
  "apiKeyPrefix": "dc_a1b2"
}
```

### Uptime Checks

- `GET https://api.dockerclaw.com/health` — every 1 minute
- `GET https://ws.dockerclaw.com/health` — every 1 minute
- `GET https://app.dockerclaw.com` — every 5 minutes

---

## 8. Cost Estimate (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Cloud Run (API) | Scale to zero, avg 2 instances | ~$15-30 |
| Cloud Run (WS) | Min 1 instance, always allocated | ~$30-50 |
| Cloud Memorystore (Redis) | Basic 1GB | ~$35 |
| Supabase (PostgreSQL) | Pro plan | ~$25 |
| Cloud Storage | < 10GB | ~$1 |
| Cloud Build | < 120 min/month | Free tier |
| Vercel | Pro plan (if needed) | $0-20 |
| **Total** | | **~$106-161/month** |

**Alternative (budget):** Replace Cloud Memorystore with Upstash Redis ($0 free tier, ~$10 for 10K commands/day) → saves ~$25/month.
