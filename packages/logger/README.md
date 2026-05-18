<p align="center">
  <img src="https://avatars.githubusercontent.com/u/23048140" width="100" alt="Pino Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">🪵 Clinic Platform Logger</h1>

<p align="center">
  <strong>Pino-based logger helpers for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Pino-687634?logo=pino&logoColor=white" alt="Pino" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

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
