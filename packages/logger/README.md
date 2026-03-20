# @clinic-platform/logger

Pino-based logger helpers for the Clinic Platform monorepo.

## Install

```bash
pnpm add @clinic-platform/logger
```

## Usage

```ts
import { createLogger, logger } from '@clinic-platform/logger';

logger.info('App started');

const apiLogger = createLogger({ level: 'debug' });
apiLogger.debug({ route: '/health' }, 'health check');
```

## Notes

- Uses `LOG_LEVEL` env var by default.
- Pretty transport is enabled in non-production.
