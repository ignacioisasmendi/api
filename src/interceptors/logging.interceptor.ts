import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
  ) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode;
          const responseTime = Date.now() - startTime;
          const userEmail = (this.cls.get('user') as any)?.email;

          const logData = { method, url: originalUrl, statusCode, responseTime, userEmail };

          if (statusCode >= 400) {
            this.logger.warn(logData, 'http response');
          } else {
            this.logger.info(logData, 'http response');
          }
        },
        error: (error: any) => {
          const statusCode = error?.status || error?.response?.status || 500;
          const responseTime = Date.now() - startTime;
          const userEmail = (this.cls.get('user') as any)?.email;

          this.logger.error(
            {
              method,
              url: originalUrl,
              statusCode,
              responseTime,
              userEmail,
              error: this.extractErrorMessage(error),
            },
            'http error',
          );
        },
      }),
    );
  }

  private extractErrorMessage(error: any): string {
    if (error?.isAxiosError) {
      return `${error.message} (upstream: ${error.response?.status} ${error.response?.statusText})`;
    }
    if (error?.response?.message) {
      const msg = error.response.message;
      return Array.isArray(msg) ? msg.join(', ') : msg;
    }
    return error?.message || 'Unknown error';
  }
}
