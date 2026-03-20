# Configuration Validation & Management

> **Document type:** Cross-cutting Engineering Standard
> **ADR:** ADR-020
> **Version:** 1.0.0
> **Last updated:** 2026-03-20
> **Scope:** All phases (P1–P5)

---

## 1. Overview

All environment configuration is managed through `@nestjs/config` with **Joi schema validation at startup**. The application must **fail fast** — if any required variable is missing or invalid, NestJS will refuse to boot and print a clear validation error.

**Never access `process.env` directly.** Use `ConfigService` or injected namespaced config objects.

---

## 2. Config Module Setup

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { appConfig } from './config/app.config';
import { envValidationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,                    // Available in all modules without importing
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,                // Stop on first error — clearer error messages
        allowUnknown: true,              // Allow other env vars (Docker, system)
      },
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
    }),
    // ...
  ],
})
export class AppModule {}
```

---

## 3. Namespaced Configuration Files

Each domain has its own config file using `registerAs()` for type-safe, namespaced access.

### Directory Structure

```
src/config/
├── app.config.ts              # Application-level settings
├── database.config.ts         # PostgreSQL connection
├── redis.config.ts            # Redis connection
├── jwt.config.ts              # JWT secrets and expiry
├── sendgrid.config.ts         # P3: Email provider
├── twilio.config.ts           # P3: SMS provider
├── s3.config.ts               # P3: File storage
├── strapi.config.ts           # P4: CMS connection
├── stripe.config.ts           # P5: Billing provider
├── observability.config.ts    # P5: Prometheus, Loki, OTEL
└── validation.schema.ts       # Joi schema for ALL env vars
```

### 3.1 `app.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
}));

export interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  apiPrefix: string;
}
```

### 3.2 `database.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNC === 'true',   // NEVER true in production
}));

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  synchronize: boolean;
}
```

### 3.3 `redis.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
}));

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}
```

### 3.4 `jwt.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
}));

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  bcryptRounds: number;
}
```

---

## 4. Validation Schema

All environment variables across all phases are validated at startup.

```typescript
// config/validation.schema.ts
import * as Joi from 'joi';

// ─── P1: Core ──────────────────────────────────────────────
const coreSchema = {
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
};

// ─── P1: Database ──────────────────────────────────────────
const databaseSchema = {
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SYNC: Joi.boolean().default(false),
};

// ─── P1: Redis ─────────────────────────────────────────────
const redisSchema = {
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
};

// ─── P1: JWT ───────────────────────────────────────────────
const jwtSchema = {
  JWT_ACCESS_SECRET: Joi.string().min(32).required()
    .messages({ 'string.min': 'JWT_ACCESS_SECRET must be at least 32 characters for security' }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required()
    .messages({ 'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters for security' }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
};

// ─── P3: SendGrid ──────────────────────────────────────────
const sendgridSchema = {
  SENDGRID_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'test', then: Joi.optional(), otherwise: Joi.optional(),
    // Required from P3+ — uncomment when P3 is active:
    // otherwise: Joi.required(),
  }),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  SENDGRID_FROM_NAME: Joi.string().optional(),
};

// ─── P3: Twilio ────────────────────────────────────────────
const twilioSchema = {
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),
  TWILIO_TURN_USERNAME: Joi.string().optional(),
  TWILIO_TURN_CREDENTIAL: Joi.string().optional(),
};

// ─── P3: S3 ────────────────────────────────────────────────
const s3Schema = {
  S3_BUCKET: Joi.string().optional(),
  S3_ACCESS_KEY: Joi.string().optional(),
  S3_SECRET_KEY: Joi.string().optional(),
  S3_REGION: Joi.string().optional(),
  S3_ENDPOINT: Joi.string().uri().optional(),   // MinIO for local dev
};

// ─── P4: Strapi ────────────────────────────────────────────
const strapiSchema = {
  STRAPI_URL: Joi.string().uri().optional(),
  STRAPI_API_TOKEN: Joi.string().optional(),
  STRAPI_WEBHOOK_SECRET: Joi.string().optional(),
  REVALIDATION_SECRET: Joi.string().optional(),
};

// ─── P5: Stripe ────────────────────────────────────────────
const stripeSchema = {
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PRICE_BASIC_MONTHLY: Joi.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: Joi.string().optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: Joi.string().optional(),
  PLATFORM_DOMAIN: Joi.string().optional(),
};

// ─── P5: Observability ─────────────────────────────────────
const observabilitySchema = {
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
  LOKI_URL: Joi.string().uri().optional(),
  PROMETHEUS_PORT: Joi.number().optional(),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
};

// ─── Combined ──────────────────────────────────────────────
export const envValidationSchema = Joi.object({
  ...coreSchema,
  ...databaseSchema,
  ...redisSchema,
  ...jwtSchema,
  ...sendgridSchema,
  ...twilioSchema,
  ...s3Schema,
  ...strapiSchema,
  ...stripeSchema,
  ...observabilitySchema,
});
```

**Key design choice:** P3–P5 env vars are `optional()` in P1. When each phase activates, uncomment the `required()` constraint. This allows the same validation schema to evolve without breaking earlier phases.

---

## 5. Type-Safe Access in Services

### Using `ConfigService` (simple)

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async login(user: User) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
  }
}
```

### Using Injected Namespaced Config (recommended)

```typescript
import { Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { jwtConfig } from '../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {}

  async login(user: User) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwt.accessSecret,      // Full type inference!
      expiresIn: this.jwt.accessExpiresIn, // No string key needed
    });
  }
}
```

---

## 6. TypeORM Async Configuration

```typescript
// app.module.ts — TypeORM uses ConfigService, not process.env
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    username: config.get<string>('database.user'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.name'),
    synchronize: config.get<boolean>('database.synchronize'),
    autoLoadEntities: true,
    logging: config.get<string>('app.environment') === 'development',
  }),
}),
```

---

## 7. Phase-by-Phase Config Activation

| Phase | Config files to load | Required env vars |
|-------|---------------------|-------------------|
| P1 | `app`, `database`, `redis`, `jwt` | `DB_*`, `REDIS_*`, `JWT_*` |
| P2 | (no new config) | (no new vars) |
| P3 | + `sendgrid`, `twilio`, `s3` | + `SENDGRID_*`, `TWILIO_*`, `S3_*` |
| P4 | + `strapi` | + `STRAPI_*`, `REVALIDATION_SECRET` |
| P5 | + `stripe`, `observability` | + `STRIPE_*`, `OTEL_*`, `LOKI_URL` |

When activating a new phase, update the `load` array in `ConfigModule.forRoot()` and change the corresponding Joi rules from `optional()` to `required()`.

---

## 8. ADR-020: Centralized Config Validation with `@nestjs/config`

**Decision:** Use `@nestjs/config` with Joi validation schema for all environment configuration. Access via namespaced `registerAs()` configs, never via `process.env` directly.

**Rationale:** Without startup validation, a missing `JWT_ACCESS_SECRET` will crash the app at the first JWT sign operation — not at boot. In production, this means the app appears healthy (passes health checks) but fails on the first auth request. Failing fast at startup is safer and cheaper to debug.

**Consequences:**
- All team members must use `ConfigService` or injected config objects — `process.env` access is an ESLint error
- New env vars require updating both the config file and the Joi schema
- The validation schema grows with each phase but unused vars remain `optional()`
