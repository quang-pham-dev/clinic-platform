# Observability & Infrastructure
### P5: Multi-Clinic SaaS Platform

> **Document type:** DevOps & Infrastructure Design
> **Version:** 1.0.0

---

## 1. Observability Stack

```
NestJS API
  └── OpenTelemetry SDK
        ├── Traces   ──► Jaeger / Tempo
        ├── Metrics  ──► Prometheus ──► Grafana
        └── Logs     ──► Loki ──► Grafana

Nginx
  └── Access logs  ──► Promtail ──► Loki
```

**Key principle:** `tenant_id` is a mandatory label on every metric, log line, and trace span. Without it, multi-tenant debugging is impossible.

---

## 2. Prometheus Metrics

### Setup in NestJS

```typescript
// main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

app.use('/metrics', async (req, res) => {
  // Protect metrics endpoint — internal only
  if (req.headers['x-metrics-token'] !== process.env.METRICS_TOKEN) {
    return res.status(403).end();
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Custom metrics

```typescript
// common/metrics/metrics.service.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status', 'tenant_id', 'plan'],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'tenant_id'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const bookingsTotal = new Counter({
  name: 'bookings_total',
  help: 'Total bookings created',
  labelNames: ['tenant_id', 'plan', 'status'],
});

export const activeTenantsGauge = new Gauge({
  name: 'active_tenants_total',
  help: 'Number of active tenants',
  labelNames: ['plan'],
});

export const quotaUsagePct = new Gauge({
  name: 'tenant_quota_usage_pct',
  help: 'Booking quota usage percentage per tenant',
  labelNames: ['tenant_id', 'plan'],
});
```

### Metrics interceptor (records per-request metrics)

```typescript
// common/interceptors/metrics.interceptor.ts
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const tenantId = req.headers['x-tenant-id'] ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = context.switchToHttp().getResponse().statusCode;
          const plan = req.tenantCtx?.plan ?? 'unknown';

          httpRequestsTotal.inc({ method: req.method, path: req.route?.path ?? req.path, status, tenant_id: tenantId, plan });
          httpRequestDurationMs.observe({ method: req.method, path: req.route?.path ?? req.path, tenant_id: tenantId }, duration);
        },
        error: (err) => {
          httpRequestsTotal.inc({ method: req.method, path: req.path, status: err.status ?? 500, tenant_id: tenantId, plan: 'unknown' });
        },
      })
    );
  }
}
```

---

## 3. Structured Logging with Loki

### NestJS logger setup

```typescript
// config/logger.config.ts
import { WinstonModule, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),            // Loki-friendly structured JSON
      ),
    }),
  ],
});
```

### Log format (every line must include these fields)

```json
{
  "level": "info",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "message": "Booking created",
  "tenant_id": "tenant-abc-uuid",
  "tenant_slug": "clinic-abc",
  "plan": "pro",
  "user_id": "user-uuid",
  "request_id": "req-uuid",
  "duration_ms": 42
}
```

### Logging interceptor (injects tenant context)

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const requestId = uuidv4();
    req.requestId = requestId;

    const tenantId = req.headers['x-tenant-id'] ?? 'unknown';

    this.logger.log({
      message: `${req.method} ${req.path}`,
      tenant_id: tenantId,
      request_id: requestId,
      user_agent: req.headers['user-agent'],
    });

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.logger.log({
          message: `${req.method} ${req.path} completed`,
          tenant_id: tenantId,
          request_id: requestId,
          duration_ms: Date.now() - start,
        }),
        error: (err) => this.logger.error({
          message: `${req.method} ${req.path} error: ${err.message}`,
          tenant_id: tenantId,
          request_id: requestId,
          duration_ms: Date.now() - start,
          stack: err.stack,
        }),
      })
    );
  }
}
```

---

## 4. Grafana Dashboards

Three Grafana dashboards are pre-built:

### 4.1 Platform overview (super admin)

- Total active tenants by plan (pie chart)
- Request rate by tenant (time series, top 10)
- p95 latency by tenant (heat map)
- Error rate by tenant (time series)
- Booking volume across all tenants (total counter)
- Quota exhaustion alerts (gauge per tenant)

**Loki query example:**
```logql
{job="nestjs"} | json | tenant_id != "" | level = "error"
| line_format "{{.tenant_id}} {{.message}}"
```

### 4.2 Per-tenant dashboard (clinic admin — Enterprise plan only)

- My booking volume this month (gauge vs limit)
- My API response time p95 (time series)
- My error rate (time series)
- Notification delivery success rate (donut)
- Active video sessions (real-time counter)

### 4.3 Infrastructure health

- PostgreSQL connection pool usage
- Redis memory usage
- BullMQ queue depths (pending jobs per queue)
- Nginx request rate and 5xx rate
- Docker container CPU/memory per service

---

## 5. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: clinic_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: secret
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration     # Includes tenant isolation test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:latest
            ghcr.io/${{ github.repository }}/api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Docker Swarm
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            docker service update \
              --image ghcr.io/${{ github.repository }}/api:${{ github.sha }} \
              clinic_api
            # Run tenant schema migrations after deploy
            docker exec $(docker ps -qf "name=clinic_api") \
              node dist/scripts/run-all-tenant-migrations.js
```

---

## 6. Infrastructure as Code

### Development (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on: [api]

  api:
    build: ./apps/api
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    depends_on: [postgres, redis]
    deploy:
      replicas: 2          # 2 API instances behind Nginx

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: clinic_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-strapi:
    image: postgres:16
    environment:
      POSTGRES_DB: strapi_clinic
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: ${STRAPI_DB_PASSWORD}

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  strapi:
    build: ./apps/strapi
    environment:
      DATABASE_HOST: postgres-strapi
    depends_on: [postgres-strapi]

  prometheus:
    image: prom/prometheus
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports: ["3100:3000"]
    volumes:
      - grafana_data:/var/lib/grafana
      - ./observability/grafana/dashboards:/etc/grafana/provisioning/dashboards

  loki:
    image: grafana/loki:2.9.0
    volumes:
      - ./observability/loki-config.yml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - ./observability/promtail-config.yml:/etc/promtail/config.yml

volumes:
  postgres_data:
  strapi_postgres_data:
  grafana_data:
```

### Production path (Docker Swarm)

```yaml
# docker-stack.yml (Docker Swarm)
version: '3.8'
services:
  api:
    image: ghcr.io/org/clinic-api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first     # Zero-downtime rolling update
      rollback_config:
        parallelism: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    secrets:
      - stripe_secret_key
      - db_password
      - jwt_access_secret

secrets:
  stripe_secret_key:
    external: true
  db_password:
    external: true
  jwt_access_secret:
    external: true
```

**Kubernetes:** For teams ready for Kubernetes, Helm chart templates are available in `infra/helm/clinic-saas/`. Covers: `Deployment`, `Service`, `Ingress` with cert-manager, `ConfigMap`, `Secret`, `HorizontalPodAutoscaler`.

---

## 7. Tenant Schema Migration Runner

When a new DB migration is added (P1–P4 bug fix or feature), it must be applied to every existing tenant schema:

```typescript
// scripts/run-all-tenant-migrations.ts
async function runAllTenantMigrations() {
  const tenants = await tenantsRepo.find({ where: { status: 'active' } });

  for (const tenant of tenants) {
    console.log(`Migrating tenant: ${tenant.slug}`);
    try {
      await dataSource.query(`SET search_path = "${tenant.schemaName}", public`);
      await dataSource.runMigrations({ transaction: 'each' });
      console.log(`✓ ${tenant.slug}`);
    } catch (err) {
      console.error(`✗ ${tenant.slug}: ${err.message}`);
      // Log failure but continue with other tenants
    }
  }
}
```

**Run time estimate:** ~500ms per tenant. For 100 tenants → ~50 seconds total. For 1,000 tenants, parallelise with `Promise.allSettled` in batches of 10.

**CI/CD integration:** The `deploy` job in GitHub Actions calls this script after deploying the new API image, ensuring all tenants are migrated before traffic is routed to the new version.
