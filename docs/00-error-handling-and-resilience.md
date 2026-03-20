# Error Handling & Resilience Patterns

> **Document type:** Cross-cutting Architecture Specification
> **Version:** 1.0.0
> **Last updated:** 2026-03-19
> **Scope:** All phases (P1–P5)

---

## 1. Global Exception Filter

All NestJS controllers use a global `HttpExceptionFilter` that catches every thrown exception and returns the standard response envelope.

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = typeof body === 'object' ? (body as any).code ?? code : code;
      message = typeof body === 'object' ? (body as any).message ?? message : String(body);
    }

    // Log with correlation ID and tenant context
    this.logger.error({
      correlationId,
      statusCode: status,
      code,
      path: request.url,
      method: request.method,
      message: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      error: {
        code,
        message,
        statusCode: status,
        correlationId,
      },
    });
  }
}
```

Register globally in `main.ts`:
```typescript
app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));
```

---

## 2. Circuit Breaker for External Services

Starting from P3, the system calls external services (SendGrid, Twilio, S3). A circuit breaker prevents cascading failures when an external service is down.

**Library:** `opossum` (lightweight, Node.js native)

### Pattern

```typescript
// common/resilience/circuit-breaker.factory.ts
import CircuitBreaker from 'opossum';

export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  options?: Partial<CircuitBreaker.Options>,
): CircuitBreaker<any[], T> {
  const defaults: CircuitBreaker.Options = {
    timeout: 10000,            // 10s timeout per call
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000,       // Try again after 30s
    volumeThreshold: 5,        // Minimum 5 calls before evaluating
  };

  return new CircuitBreaker(fn, { ...defaults, ...options });
}
```

### Service-Specific Configuration

| Service | Timeout | Error threshold | Reset timeout | Fallback |
|---------|---------|----------------|---------------|----------|
| SendGrid (email) | 10s | 50% | 30s | Log to DLQ, retry via BullMQ |
| Twilio (SMS) | 10s | 50% | 60s | Log to DLQ, retry via BullMQ |
| S3 (file upload) | 30s | 30% | 30s | Return 503 to client, client retries |
| Strapi (webhook/fetch) | 5s | 60% | 15s | Serve cached ISR content |
| Stripe (billing) | 15s | 30% | 60s | Queue billing events, process when Stripe recovers |

### Usage in Adapter

```typescript
// notifications/adapters/email.adapter.ts
@Injectable()
export class EmailAdapter {
  private breaker: CircuitBreaker;

  constructor(private readonly sendgrid: SendGridService) {
    this.breaker = createCircuitBreaker(
      (msg: SendGridMessage) => this.sendgrid.send(msg),
      { timeout: 10000, resetTimeout: 30000 },
    );

    this.breaker.on('open', () =>
      this.logger.warn('SendGrid circuit OPEN — emails will be queued for retry'),
    );
  }

  async send(msg: SendGridMessage): Promise<void> {
    await this.breaker.fire(msg);
  }
}
```

---

## 3. Graceful Degradation Matrix

| Scenario | System behavior | User impact |
|----------|----------------|-------------|
| **Redis down** | JWT auth still works (stateless). Refresh token fails. WS disconnects. BullMQ pauses. | Users can continue viewing, cannot log in from new session. Notifications delayed. |
| **PostgreSQL down** | All write operations fail. Read caches (TanStack Query on FE) show stale data. | Users see stale data with error toasts. No new bookings possible. |
| **SendGrid down** | Email circuit opens. Jobs pile up in BullMQ DLQ. In-app notifications still work. | Users don't receive email confirmations but see in-app notifications. |
| **Twilio down** | SMS circuit opens. Jobs pile up in BullMQ DLQ. | No SMS reminders. Email + in-app still work. |
| **Strapi down** | ISR serves last cached HTML. Doctor profiles show NestJS data without CMS bio. | Minor — public pages slightly outdated. Protected features unaffected. |
| **S3 down** | Patient file upload returns 503. Video in-call file share unavailable. | Users see "Upload temporarily unavailable" toast. |
| **Stripe down** | Webhook processing pauses. Billing events queued. Current plan state continues. | No immediate user impact. Plan changes delayed. |

---

## 4. Health Check Endpoint

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgresql'),
      () => this.redis.pingCheck('redis'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('postgresql'),
      () => this.redis.pingCheck('redis'),
      // P3+: check BullMQ queue health
      // P4+: check Strapi reachability
      // P5+: check Stripe API reachability
    ]);
  }
}
```

**Endpoints:**
- `GET /health` — liveness probe (Kubernetes/Docker health check)
- `GET /health/ready` — readiness probe (all dependencies healthy)

---

## 5. Retry Strategy Summary

| Layer | Tool | Strategy |
|-------|------|----------|
| BullMQ email/SMS jobs | BullMQ built-in | 3 attempts, exponential backoff (2s, 4s, 8s) → DLQ |
| BullMQ video timeout jobs | BullMQ built-in | 2 attempts, fixed 10s delay |
| Database transactions | Application code | Optimistic locking retry (1 retry on version conflict) |
| HTTP to Strapi (webhook) | `opossum` circuit breaker | Circuit breaker + manual retry endpoint |
| HTTP to Stripe (webhook) | Stripe built-in | Stripe auto-retries for 72h with exponential backoff |
| Frontend API calls | TanStack Query | `retry: 3`, `retryDelay: exponentialDelay` |

---

## 6. Dead Letter Queue (DLQ) Handling

Jobs that exhaust all retries land in the DLQ. An admin can review and re-process them.

```typescript
// BullMQ DLQ setup per queue
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: { age: 7 * 24 * 60 * 60 },  // Keep failed jobs for 7 days
}
```

**Admin can:**
- View failed jobs in Bull Board (`/admin/queues`)
- Retry individual jobs via Bull Board UI
- Bulk retry all DLQ jobs via `POST /admin/queues/:name/retry-all` (P3+)
