# Observability & Logging Conventions

> **Document type:** Cross-cutting Engineering Standard
> **Version:** 1.0.0
> **Last updated:** 2026-03-19
> **Scope:** All phases (P1–P5)

---

## 1. Logger Library

**Decision:** Use **pino** via `nestjs-pino` for structured JSON logging.

**Why pino over winston:**
- 5–10x faster (pino uses worker threads for serialization)
- JSON output by default (no configuration needed for structured logging)
- `pino-pretty` for human-readable local output
- Native integration with NestJS via `nestjs-pino`

### Setup

```typescript
// main.ts
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // ...
}
```

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        genReqId: (req) => req.headers['x-correlation-id'] ?? randomUUID(),
        customProps: (req) => ({
          correlationId: req.id,
          tenantId: req.headers['x-tenant-id'] ?? null,       // P5
          userId: (req as any).user?.sub ?? null,              // After auth
        }),
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            // Never log body (may contain PII/passwords)
          }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
      },
    }),
  ],
})
export class AppModule {}
```

---

## 2. Correlation ID Lifecycle

```
Request Flow:
  Client → Nginx → NestJS → Service → BullMQ Worker → External Service

Correlation ID Propagation:
  1. Nginx generates X-Correlation-ID (or passes through if client sends one)
  2. pino picks it up via genReqId → attaches to all log lines in that request
  3. When enqueuing a BullMQ job, pass correlationId in job data
  4. Worker reads correlationId from job data and sets it in the worker log context
  5. When calling external services, forward X-Correlation-ID header
```

### Nginx Header Injection

```nginx
# nginx.conf — Generate correlation ID if not present
map $http_x_correlation_id $correlation_id {
    default $http_x_correlation_id;
    ""      $request_id;
}

proxy_set_header X-Correlation-ID $correlation_id;
```

### BullMQ Worker Propagation

```typescript
// queue/workers/email.worker.ts
@Processor('email-queue')
export class EmailWorker {
  constructor(private readonly logger: PinoLogger) {}

  @Process()
  async handleJob(job: Job<EmailJobData>) {
    // Set correlation ID context for this worker execution
    this.logger.assign({ correlationId: job.data.correlationId });
    this.logger.info('Processing email job');
    // ...
  }
}
```

---

## 3. Log Format

Every log line is a JSON object with these standard fields:

```jsonc
{
  "level": 30,                                    // pino level (30=info, 40=warn, 50=error)
  "time": 1710835200000,                          // Unix timestamp (ms)
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenantId": "clinic-abc",                        // null in P1–P4, set in P5
  "userId": "550e8400-e29b-41d4-a716-446655440000", // null if pre-auth
  "module": "BookingsService",                     // NestJS class or module name
  "msg": "Booking created successfully",           // Human-readable message
  "context": {                                     // Structured domain data
    "appointmentId": "uuid",
    "patientId": "uuid",
    "slotId": "uuid",
    "status": "pending"
  },
  "req": { "method": "POST", "url": "/api/v1/bookings" },
  "res": { "statusCode": 201 },
  "responseTime": 45                               // ms
}
```

### What to log

| Level | When | Example |
|-------|------|---------|
| `error` | Unrecoverable failure, exception caught | DB connection lost, unhandled exception |
| `warn` | Recoverable issue, degraded service | Circuit breaker opened, rate limit approaching |
| `info` | Significant business event | Booking created, user logged in, shift assigned |
| `debug` | Developer troubleshooting detail | SQL query, Redis command, JWT payload decoded |
| `trace` | Extremely verbose (local dev only) | Every function entry/exit |

### What NEVER to log

| Data | Why |
|------|-----|
| Passwords / password hashes | Security |
| Full JWT tokens | Security |
| Patient names, emails, phones | PII/GDPR — use `userId` only |
| Request bodies (by default) | May contain PII |
| Credit card numbers | PCI compliance |
| Medical record content | HIPAA / healthcare data |

---

## 4. Logging in Services

```typescript
// bookings.service.ts
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class BookingsService {
  constructor(
    @InjectPinoLogger(BookingsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateBookingDto, patientId: string): Promise<Appointment> {
    this.logger.info({ slotId: dto.slotId, patientId }, 'Creating booking');

    // ... business logic ...

    this.logger.info(
      { appointmentId: saved.id, status: saved.status },
      'Booking created successfully',
    );
    return saved;
  }
}
```

---

## 5. P5 Observability Stack Integration

| Tool | Purpose | Log/metric source |
|------|---------|-------------------|
| **Loki** | Log aggregation | pino JSON → Promtail → Loki |
| **Prometheus** | Metrics collection | NestJS `/metrics` endpoint (via `prom-client`) |
| **Grafana** | Dashboard & alerting | Queries Loki + Prometheus |
| **OpenTelemetry** | Distributed tracing | `@opentelemetry/sdk-node` auto-instrumentation |

### Key Labels (P5)

Every metric and log line carries these labels for multi-tenant filtering:

| Label | Source | Example |
|-------|--------|---------|
| `tenant_id` | `TenantMiddleware` → `AsyncLocalStorage` | `clinic-abc` |
| `correlation_id` | `X-Correlation-ID` header | `uuid` |
| `service` | Process name | `nestjs-api`, `email-worker` |
| `environment` | `NODE_ENV` | `production`, `staging` |

---

## 6. ADR-018: Structured JSON Logging with pino

**Decision:** Use `pino` via `nestjs-pino` for all application logging. Output is structured JSON in production, pretty-printed in development.

**Rationale:** Structured JSON logs are machine-parseable by Loki, Elasticsearch, or CloudWatch without regex-based parsing. pino is the fastest Node.js logger and integrates cleanly with NestJS. Starting with structured logging from P1 ensures P5's observability stack has clean data from day one.

**Consequences:**
- All team members must use the injected `PinoLogger` rather than `console.log`
- ESLint rule `no-console` should be enforced to prevent accidental `console.log` calls
- Log volume in production must be managed — set `LOG_LEVEL=info` (not `debug`)
