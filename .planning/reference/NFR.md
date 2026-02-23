# Non-Functional Requirements

## 1. Performance

| Metric | Target | Priority | Measurement Method |
|--------|--------|----------|-------------------|
| API p50 latency (single item) | < 50ms | P0 | Cloud Monitoring request metrics |
| API p95 latency (single item) | < 200ms | P0 | Cloud Monitoring request metrics |
| API p99 latency (single item) | < 500ms | P1 | Cloud Monitoring request metrics |
| Batch 100 items create | < 10s | P1 | Integration test with timer |
| Canvas initial load (cold) | < 3s | P1 | Lighthouse CI / Web Vitals |
| Canvas initial load (warm) | < 1s | P2 | Lighthouse CI / Web Vitals |
| Real-time propagation (same region) | < 200ms | P1 | E2E test with timestamps |
| Real-time propagation (cross-region) | < 500ms | P2 | E2E test with timestamps |
| WebSocket reconnection | < 5s | P1 | E2E test with network interruption |
| Image upload (5MB) | < 5s | P1 | Integration test with timer |
| Webhook first delivery attempt | < 5s after event | P1 | Integration test with mock server |
| Snapshot persistence | < 2s | P2 | Y.Doc save timer measurement |

### Performance Budget

| Resource | Budget | Measurement |
|----------|--------|-------------|
| Frontend JS bundle (initial) | < 300KB gzipped | Webpack bundle analyzer |
| Frontend JS bundle (canvas page) | < 800KB gzipped (includes tldraw) | Webpack bundle analyzer |
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Total Blocking Time | < 200ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

---

## 2. Reliability

| Metric | Target | Priority |
|--------|--------|----------|
| API uptime | 99.5% (36h downtime/year) | P0 |
| WebSocket uptime | 99% (87h downtime/year) | P1 |
| Data durability | Zero data loss on acknowledged writes | P0 |
| Error rate (5xx) | < 0.5% of total requests | P0 |
| Mean time to recovery (MTTR) | < 15 minutes | P1 |

### Graceful Degradation

| Failure Scenario | Expected Behavior |
|-----------------|-------------------|
| Redis down | API continues (no caching, no rate limiting, log warning) |
| WebSocket service down | Canvas loads in read-only mode (REST-based item loading) |
| GCS down | Image upload fails with 503; existing images cached via CDN |
| Supabase overloaded | API returns 503 with retry-after; queued webhook jobs wait |
| Cloud Run scaling | Auto-scale 0→10 instances; requests queued during cold start |

---

## 3. Scalability

| Metric | Target (MVP) | Target (Scale) |
|--------|-------------|----------------|
| Concurrent boards | 100 active | 1,000 active |
| Items per board | 5,000 (tested) / 10,000 (soft limit) | 50,000 |
| API requests per second | 500 RPS sustained | 5,000 RPS |
| WebSocket connections (total) | 500 | 5,000 |
| WebSocket connections per board | 20 | 100 |
| Boards in database | 10,000 | 1,000,000 |
| Total items in database | 1,000,000 | 100,000,000 |
| Webhook deliveries per minute | 100 | 10,000 |
| Media storage | 10GB | 1TB |

### Scaling Strategy

| Bottleneck | Solution |
|-----------|----------|
| API throughput | Cloud Run auto-scale (0→10 → configurable max) |
| WebSocket connections | Multiple WS instances with Redis pub/sub for cross-instance sync |
| Database connections | PgBouncer (Supabase built-in), connection pooling in Prisma |
| Database reads | Read replicas (Supabase Pro plan) |
| Database writes | Vertical scaling (Supabase plan upgrade) |
| Redis memory | Upstash auto-scaling or Memorystore tier upgrade |
| Media storage | GCS scales automatically |

---

## 4. Security

| Requirement | Target | Priority |
|------------|--------|----------|
| API keys hashed at rest | SHA-256, never stored in plaintext | P0 |
| HTTPS everywhere | TLS 1.2+ on all endpoints | P0 |
| CORS restricted | Allowlist of known origins | P0 |
| Rate limiting | Per-key limits with 429 response | P0 |
| Request body size limit | 1MB standard, 5MB batch, 10MB upload | P0 |
| Webhook SSRF protection | Reject private/localhost URLs | P1 |
| Webhook HMAC signatures | SHA-256 signature on all deliveries | P1 |
| API key rotation | Zero-downtime key rotation supported | P1 |
| Structured logging (no PII) | API keys redacted in logs | P0 |
| Security headers | CSP, HSTS, X-Frame-Options via helmet | P1 |
| Dependency scanning | npm audit in CI pipeline | P2 |

See [SECURITY_MODEL.md](SECURITY_MODEL.md) for full details.

---

## 5. Developer Experience

| Requirement | Target | Priority |
|------------|--------|----------|
| Local dev setup | `docker-compose up` → working env in < 60s | P0 |
| Test execution | `npm test` in < 30s | P1 |
| Deployment time | Push → production in < 5 min | P0 |
| Rollback time | < 2 min (Cloud Run traffic splitting) | P1 |
| API documentation | Auto-generated Swagger UI at `/v1/docs` | P1 |
| Error messages | Machine-readable JSON with error codes | P0 |
| SDK quickstart | Functional in < 10 lines of Python | P1 |
| SDK type safety | Full type hints, IDE autocomplete | P1 |
| OpenAPI spec | Always in sync with implementation | P1 |

---

## 6. Operational

| Requirement | Target | Priority |
|------------|--------|----------|
| Structured logging | JSON format, Cloud Logging compatible | P0 |
| Log retention | 30 days | P1 |
| Uptime monitoring | `/health` checked every 1 min | P0 |
| Alerting | Slack/email on p99 > 500ms, error rate > 1%, instance at max | P1 |
| Database backups | Daily automated (Supabase built-in) | P0 |
| Backup retention | 7 days (Supabase Pro) | P1 |
| Incident response | Runbook for common failure scenarios | P2 |
| Cost monitoring | GCP billing alerts at $100, $200, $500 | P1 |

---

## 7. Compatibility

| Requirement | Target |
|------------|--------|
| Browser support | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ |
| tldraw compatibility | Latest stable release |
| Node.js | 22 LTS |
| PostgreSQL | 15+ |
| Python SDK | Python 3.10+ |
| API versioning | `/v1/` prefix, backward compat for 90 days on breaking changes |
