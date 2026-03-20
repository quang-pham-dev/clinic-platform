import { createLogger } from './core';
import pinoHttp, { type Options as PinoHttpOptions } from 'pino-http';

export const createHttpLogger = (options: PinoHttpOptions = {}) => {
  return pinoHttp({
    logger: createLogger(),
    ...options,
  });
};

export type { PinoHttpOptions };
