import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private safeStringify(value: any): string {
    try {
      if (value === null || value === undefined) {
        return 'N/A';
      }
      return JSON.stringify(value, null, 2) || 'N/A';
    } catch (error) {
      return 'Unable to stringify';
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorName = 'UnknownError';
    let stack = 'No stack trace available';

    // Handle HttpException (NestJS exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorName = exception.name || 'HttpException';
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = exceptionResponse;
      }
      
      if (exception.stack) {
        stack = exception.stack;
      }
    } 
    // Handle standard Error objects
    else if (exception instanceof Error) {
      errorName = exception.name || 'Error';
      message = exception.message || 'Unknown error';
      if (exception.stack) {
        stack = exception.stack;
      }
    }
    // Handle other types of exceptions
    else if (typeof exception === 'string') {
      message = exception;
    } else if (exception && typeof exception === 'object') {
      try {
        message = JSON.stringify(exception) || 'Unknown exception';
      } catch {
        message = 'Unable to serialize exception';
      }
    }

    // Safely get request details
    const method = request?.method || 'UNKNOWN';
    const url = request?.url || 'UNKNOWN';
    const ip = request?.ip || 'UNKNOWN';
    const userAgent = request?.get ? (request.get('user-agent') || 'N/A') : 'N/A';
    
    // Format message for logging
    const messageStr = typeof message === 'string' ? message : this.safeStringify(message);
    const bodyStr = this.safeStringify(request?.body);
    const queryStr = this.safeStringify(request?.query);
    const paramsStr = this.safeStringify(request?.params);

    // Log the error with full details
    this.logger.error('╔════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ 🔴 EXCEPTION CAUGHT');
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error(`║ Error Name:    ${errorName}`);
    this.logger.error(`║ Status Code:   ${status}`);
    this.logger.error(`║ Method:        ${method}`);
    this.logger.error(`║ Path:          ${url}`);
    this.logger.error(`║ IP:            ${ip}`);
    this.logger.error(`║ User Agent:    ${userAgent}`);
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ Message:');
    this.logger.error(`║ ${messageStr}`);
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ Request Body:');
    this.logger.error(`║ ${bodyStr}`);
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ Request Query:');
    this.logger.error(`║ ${queryStr}`);
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ Request Params:');
    this.logger.error(`║ ${paramsStr}`);
    this.logger.error('╠════════════════════════════════════════════════════════════════════════════');
    this.logger.error('║ Stack Trace:');
    this.logger.error(`║ ${stack}`);
    this.logger.error('╚════════════════════════════════════════════════════════════════════════════');

    // Send error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: url,
      method: method,
      message: message,
      error: errorName,
    };

    try {
      response.status(status).json(errorResponse);
    } catch (responseError) {
      this.logger.error('Failed to send error response', responseError);
    }
  }
}
