import pino, { type LoggerOptions } from 'pino';

const getDefaultTransport = () => {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  } as const;
};

export const createLogger = (options: LoggerOptions = {}) => {
  const transport = options.transport ?? getDefaultTransport();

  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    ...options,
    transport,
  });
};

export const logger = createLogger();
export type { LoggerOptions };
