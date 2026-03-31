import * as Joi from 'joi';

// ─── P1: Core App ──────────────────────────────────────────
const coreSchema = {
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().allow('').default(''),
};

// ─── P1: Database ──────────────────────────────────────────
const databaseSchema = {
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
};

// ─── P1: Redis ─────────────────────────────────────────────
const redisSchema = {
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
};

// ─── P1: JWT ───────────────────────────────────────────────
const jwtSchema = {
  JWT_ACCESS_SECRET: Joi.string().min(32).required().messages({
    'string.min':
      'JWT_ACCESS_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_ACCESS_SECRET is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min':
      'JWT_REFRESH_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_REFRESH_SECRET is required',
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
};

// ─── P1: Cookie ────────────────────────────────────────────
const cookieSchema = {
  COOKIE_NAME: Joi.string().default('refresh_token'),
  COOKIE_SECRET: Joi.string().allow('').default(''),
};

// ─── P3: SendGrid (optional until P3 activates) ────────────
const sendgridSchema = {
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  SENDGRID_FROM_NAME: Joi.string().optional(),
};

// ─── P3: Twilio (optional until P3 activates) ──────────────
const twilioSchema = {
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),
  TWILIO_TURN_USERNAME: Joi.string().optional(),
  TWILIO_TURN_CREDENTIAL: Joi.string().optional(),
};

// ─── P3: S3/MinIO (optional until P3 activates) ────────────
const s3Schema = {
  S3_BUCKET: Joi.string().optional(),
  S3_ACCESS_KEY: Joi.string().optional(),
  S3_SECRET_KEY: Joi.string().optional(),
  S3_REGION: Joi.string().optional(),
  S3_ENDPOINT: Joi.string().uri().optional(),
};

// ─── P4: Strapi (optional until P4 activates) ──────────────
const strapiSchema = {
  STRAPI_URL: Joi.string().uri().optional(),
  STRAPI_API_TOKEN: Joi.string().optional(),
  STRAPI_WEBHOOK_SECRET: Joi.string().optional(),
  REVALIDATION_SECRET: Joi.string().optional(),
};

// ─── P5: Stripe (optional until P5 activates) ──────────────
const stripeSchema = {
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PRICE_BASIC_MONTHLY: Joi.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: Joi.string().optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: Joi.string().optional(),
  PLATFORM_DOMAIN: Joi.string().optional(),
};

// ─── P5: Observability (optional until P5 activates) ───────
const observabilitySchema = {
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
  LOKI_URL: Joi.string().uri().optional(),
  PROMETHEUS_PORT: Joi.number().optional(),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
};

// ─── P5: Bull Board (optional) ─────────────────────────────
const bullSchema = {
  BULL_BOARD_ENABLED: Joi.boolean().default(false),
};

// ─── Combined ──────────────────────────────────────────────
export const envValidationSchema = Joi.object({
  ...coreSchema,
  ...databaseSchema,
  ...redisSchema,
  ...jwtSchema,
  ...cookieSchema,
  ...sendgridSchema,
  ...twilioSchema,
  ...s3Schema,
  ...strapiSchema,
  ...stripeSchema,
  ...observabilitySchema,
  ...bullSchema,
});
