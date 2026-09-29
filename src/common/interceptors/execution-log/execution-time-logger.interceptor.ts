import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, throwError } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

@Injectable()
export class ExecutionTimeLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ExecutionTimeLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;
    const start = performance.now();

    let responseBody: unknown;

    return next.handle().pipe(
      tap((body) => {
        responseBody = body;
      }),
      catchError((error: Error) => {
        responseBody = { error: error.message };
        return throwError(() => error);
      }),
      finalize(() => {
        const handler = context.getHandler().name;
        const executionTime = performance.now() - start;
        const requestBody = JSON.stringify(request.body as unknown);
        const { statusCode } = response;
        const responsePart = responseBody
          ? ` | Response: ${this.formatResponseBody(responseBody)}`
          : '';
        const message = `[${method}] ${url} | Body: ${requestBody} | [${statusCode}] ${handler} in ${executionTime.toFixed(0)}ms${responsePart}`;

        if (statusCode < 400) {
          this.logger.verbose(message);
        } else if (statusCode >= 500) {
          this.logger.error(message);
        } else {
          this.logger.warn(message);
        }
      }),
    );
  }

  private formatResponseBody(body: unknown): string {
    if (body instanceof StreamableFile) {
      const { type, length } = body.getHeaders();
      return JSON.stringify({ stream: true, type, length });
    }

    if (Buffer.isBuffer(body)) {
      return JSON.stringify({ buffer: true, length: body.length });
    }

    return JSON.stringify(body);
  }
}
