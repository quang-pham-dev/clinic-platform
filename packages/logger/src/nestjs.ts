import { Logger, LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

/**
 * Pre-configured LoggerModule for NestJS apps.
 * Reuses the shared pino transport/level defaults from @clinic-platform/logger.
 */
export const createNestLoggerModule = (overrides: Params = {}) => {
  const defaultParams: Params = {
    pinoHttp: {
      level:
        process.env.LOG_LEVEL ??
        (process.env.NODE_ENV !== 'production' ? 'debug' : 'info'),
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            }
          : undefined,
      autoLogging: false,
      ...((overrides.pinoHttp as object) ?? {}),
    },
  };

  return PinoLoggerModule.forRoot(defaultParams);
};

export { PinoLoggerModule as LoggerModule, Logger };
export type { Params as LoggerModuleParams };
