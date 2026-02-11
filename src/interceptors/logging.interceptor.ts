import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    const { method, originalUrl, body, query } = request;

    // Log incoming request
    this.logger.log(
      `Request: ${JSON.stringify({
        method,
        url: originalUrl,
        query: Object.keys(query).length > 0 ? query : undefined,
        body: this.sanitizeBody(body),
      }, null, 2)}`
    );

    return next.handle().pipe(
      tap({
        next: (responseBody: any) => {
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          // Log successful response
          this.logger.log(
            `Response: ${JSON.stringify({
              method,
              url: originalUrl,
              statusCode,
              responseTime: `${responseTime}ms`,
              body: this.sanitizeBody(responseBody),
            }, null, 2)}`
          );
        },
        error: (error: any) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error?.status || error?.response?.status || 500;

          // Extract safe error details, avoiding axios circular references
          let errorDetails;
          
          // Check if it's an axios error
          if (error?.isAxiosError || error?.config) {
            // For axios errors, extract only the relevant response data
            errorDetails = {
              message: error.message,
              code: error.code,
              responseData: error.response?.data,
              responseStatus: error.response?.status,
              responseStatusText: error.response?.statusText,
            };
          } else if (error?.response && typeof error.response === 'object') {
            // If it's a structured response (like from NestJS validation)
            errorDetails = error.response;
          } else if (error?.message) {
            errorDetails = error.message;
          } else {
            errorDetails = 'Unknown error';
          }

          // Log error response with circular reference handling
          try {
            this.logger.error(
              `Error: ${this.safeStringify({
                method,
                url: originalUrl,
                statusCode,
                responseTime: `${responseTime}ms`,
                message: error?.message || 'Unknown error',
                error: errorDetails,
              })}`
            );
          } catch (stringifyError) {
            // Fallback to basic logging if stringify still fails
            this.logger.error(
              `Error: ${method} ${originalUrl} - Status: ${statusCode} - ${error?.message || 'Unknown error'}`
            );
          }
        },
      }),
    );
  }

  /**
   * Safely stringify an object, handling circular references
   */
  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  }

  /**
   * Sanitize sensitive information from body
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
    ];

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      const result = { ...obj };
      Object.keys(result).forEach((key) => {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof result[key] === 'object') {
          result[key] = sanitizeObject(result[key]);
        }
      });

      return result;
    };

    return sanitizeObject(body);
  }
}
