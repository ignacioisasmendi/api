import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_CLIENT_VALIDATION_KEY } from '../decorators/skip-client-validation.decorator';

@Injectable()
export class ClientInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ClientInterceptor.name);

  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Skip for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    // Skip if decorator says so
    const skipClient = this.reflector.getAllAndOverride<boolean>(
      SKIP_CLIENT_VALIDATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipClient) {
      return next.handle();
    }

    const user = this.cls.get('user');
    if (!user) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    let clientId = request.headers['x-client-id'];

    // Fallback: auto-select user's first client if no header provided
    if (!clientId) {
      const defaultClient = await this.prisma.client.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultClient) {
        throw new BadRequestException(
          'No client found. Create a client first.',
        );
      }

      clientId = defaultClient.id;
      this.logger.debug(
        `No X-Client-Id header, using default client ${clientId} for user ${user.id}`,
      );
    } else {
      // Verify client belongs to user
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
      });

      if (!client) {
        throw new ForbiddenException('Client not found or access denied');
      }
    }

    // Store in CLS for downstream use
    this.cls.set('clientId', clientId);

    return next.handle();
  }
}
