import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as jwksClient from 'jwks-rsa';
import { ClsService } from 'nestjs-cls';
import { promisify } from 'util';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserService } from '../users/user.service';

@Injectable()
export class Auth0Guard implements CanActivate {
  private readonly logger = new Logger(Auth0Guard.name);
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {
    const auth0Domain = this.configService.get<string>('auth.auth0Domain');
    
    if (!auth0Domain) {
      throw new Error('AUTH0_DOMAIN is not configured');
    }

    this.jwksClient = jwksClient({
      jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Decodificar el token sin verificar para obtener el kid (key id)
      const decoded = this.jwtService.decode(token, { complete: true }) as any;

      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token structure');
      }

      // Obtener la clave pública desde Auth0
      const key = await this.getSigningKey(decoded.header.kid);

      // Verificar el token con la clave pública
      const payload = this.jwtService.verify(token, {
        secret: key,
        audience: this.configService.get<string>('auth.auth0Audience'),
        issuer: this.configService.get<string>('auth.auth0Issuer'),
        algorithms: ['RS256'],
      });

      // Extraer información del usuario del token
      const auth0UserId = payload.sub; // El "sub" es el ID de Auth0
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      // Buscar o crear el usuario en la base de datos (auto-provisioning)
      const user = await this.userService.findOrCreateUser({
        auth0UserId,
        email: email || '',
        name,
        avatar: picture,
      });

      // Guardar el usuario completo (de la BD) en el contexto de CLS
      this.cls.set('user', user);

      // También lo adjuntamos al request por si acaso (opcional)
      request.user = user;

      return true;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private async getSigningKey(kid: string): Promise<string> {
    const getSigningKey = promisify(this.jwksClient.getSigningKey).bind(
      this.jwksClient,
    );

    try {
      const key = await getSigningKey(kid);
      const publicKey = 'publicKey' in key ? key.publicKey : key.rsaPublicKey;
      return publicKey;
    } catch (error) {
      this.logger.error('Failed to get signing key', error);
      throw new UnauthorizedException('Unable to verify token signature');
    }
  }
}
