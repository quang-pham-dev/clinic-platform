import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, url } = req;
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      crypto.randomUUID();
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const startTime = Date.now();

    // Attach correlationId to response headers for traceability
    res.setHeader('x-correlation-id', correlationId);

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} → ${statusCode} | ${duration}ms | correlation=${correlationId} | ua=${userAgent}`,
          );
        },
        error: (err: { status?: number }) => {
          const statusCode = err?.status ?? 500;
          const duration = Date.now() - startTime;

          this.logger.warn(
            `${method} ${url} → ${statusCode} | ${duration}ms | correlation=${correlationId} | ERROR`,
          );
        },
      }),
    );
  }
}
