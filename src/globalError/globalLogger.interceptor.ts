import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class GlobalLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    console.log(`Request made at ${now}`);
    return next.handle().pipe(
      tap(() => console.log(`Response sent at ${Date.now()}. Execution time: ${Date.now() - now}ms`)),
    );
  }
}