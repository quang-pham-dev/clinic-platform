import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseData<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseData<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If the response already has { data, meta } shape, pass through
        if (data !== null && typeof data === 'object' && 'data' in data) {
          return data as ResponseData<T>;
        }
        return { data: data as T };
      }),
    );
  }
}
