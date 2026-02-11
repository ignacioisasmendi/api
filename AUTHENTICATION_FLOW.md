# 🔐 Flujo de Autenticación: Next.js ↔️ NestJS con Auth0

## 📋 Resumen Ejecutivo

Tu arquitectura actual funciona así:

```
Usuario → Next.js (Frontend + Backend) → NestJS API
           ↓                               ↓
      Auth0 Token                    Verifica Token
```

**Respuesta a tu pregunta**: **SÍ, debes enviar el token de Auth0 a esta API**. Es la mejor práctica y tu código ya está preparado para esto.

## ❓ Tu Pregunta

> "¿Necesito mandar el token de auth0 a esta API siendo que ya lo obtuvo Next.js?"

**Respuesta**: **Sí, debes forward el token**. Aquí está el por qué:

### ✅ Por qué SÍ debes enviar el token

1. **Identidad del usuario**: Sin el token, NestJS no sabe QUÉ usuario hizo la petición
2. **Seguridad**: NestJS no debe confiar ciegamente en Next.js
3. **Auto-provisioning**: Tu `Auth0Guard` auto-crea usuarios en la BD basándose en el token
4. **Auditoría**: Necesitas saber quién hizo cada acción para los logs
5. **Permisos**: Podrías implementar permisos granulares por usuario

### ❌ Por qué NO usar API Keys

```typescript
// ❌ MALO - Con API Key
headers: { 'X-API-Key': 'secret' }
// Todos los requests parecen del mismo "usuario" (Next.js)
```

```typescript
// ✅ BUENO - Con Token
headers: { 'Authorization': `Bearer ${userToken}` }
// Cada request se identifica con el usuario real
```

## 🔍 Cómo Funciona Actualmente

### Tu Auth0Guard

Tu `Auth0Guard` ya está configurado perfectamente:

```typescript:56:108:src/auth/auth0.guard.ts
    const request = context.switchToHttp().getRequest();
    console.log('request', request.headers['authorization']);

    
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
        email,
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
```

Este guard:
1. ✅ Extrae el token del header `Authorization`
2. ✅ Verifica la firma con Auth0 (usando JWKS)
3. ✅ Valida audience, issuer y expiración
4. ✅ Auto-provisiona el usuario en tu BD
5. ✅ Inyecta el usuario en el contexto

### ¿Qué Falta?

**Solo necesitas enviar el token desde Next.js**. Tu NestJS ya está 100% configurado.

## 🚀 Solución: Token Forwarding

### En Next.js

**App Router:**

```typescript
// app/api/publications/route.ts
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch('http://localhost:5000/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`, // ⭐ Aquí
    },
    body: JSON.stringify(await request.json()),
  });

  return Response.json(await response.json());
}
```

**Pages Router:**

```typescript
// pages/api/publications.ts
import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0';

export default withApiAuthRequired(async (req, res) => {
  const { accessToken } = await getAccessToken(req, res);

  const response = await fetch('http://localhost:5000/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`, // ⭐ Aquí
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.json(data);
});
```

### En NestJS

**Ya funciona!** Tu `Auth0Guard` automáticamente:

```typescript
// publication.controller.ts
@Controller('api/publications')
export class PublicationController {
  @Post()
  async create(
    @GetUser() user: User,  // ⭐ Usuario inyectado automáticamente
    @Body() createDto: CreatePublicationDto,
  ) {
    // user.id, user.email, user.auth0UserId están disponibles
    return this.publicationService.create(user.id, createDto);
  }
}
```

## 🔧 Configuración Necesaria

### 1. Variables de Entorno

**Next.js (.env.local)**:
```bash
AUTH0_SECRET='genera-con-openssl-rand-hex-32'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='tu_client_id'
AUTH0_CLIENT_SECRET='tu_client_secret'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ CRÍTICO
NESTJS_API_URL='http://localhost:5000'
```

**NestJS (.env)** - Ya lo tienes:
```bash
AUTH0_DOMAIN='YOUR_DOMAIN.auth0.com'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ MISMO que Next.js
AUTH0_ISSUER='https://YOUR_DOMAIN.auth0.com/'
```

### 2. El `AUTH0_AUDIENCE` es CRÍTICO

Debe ser:
- ✅ **Exactamente igual** en Next.js y NestJS
- ✅ El **Identifier** del API en Auth0 Dashboard
- ✅ Configurado en `@auth0/nextjs-auth0` para que incluya el token

Sin el `AUTH0_AUDIENCE` correcto:
- ❌ Next.js no obtendrá un `accessToken` válido
- ❌ El token no tendrá el audience correcto
- ❌ NestJS rechazará el token

## 🐛 Troubleshooting

### "No puedo verificar los tokens en esta API"

**Problema**: El `Auth0Guard` está rechazando los tokens.

**Causas posibles**:

1. **No estás enviando el token**:
```typescript
// ❌ MALO
fetch('http://localhost:5000/api/publications', {
  headers: { 'Content-Type': 'application/json' }
});

// ✅ BUENO
fetch('http://localhost:5000/api/publications', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }
});
```

2. **El `AUTH0_AUDIENCE` no coincide**:
```bash
# Next.js
AUTH0_AUDIENCE='https://api-v1.com'

# NestJS
AUTH0_AUDIENCE='https://api-v2.com'  # ❌ Diferente!
```

Solución: Deben ser idénticos.

3. **El `AUTH0_AUDIENCE` no está configurado en Next.js**:

Si no tienes `AUTH0_AUDIENCE` en Next.js, Auth0 no generará un access token para el API, solo un token para el usuario.

4. **Token expirado**:

Los tokens tienen un tiempo de expiración. `@auth0/nextjs-auth0` maneja el refresh automáticamente:

```typescript
const { accessToken } = await getAccessToken(req, res, {
  refresh: true, // Auto-refresh
});
```

### Ver el token en NestJS

Tu guard ya tiene un log (línea 56):

```typescript
console.log('request', request.headers['authorization']);
```

Deberías ver:
```
request Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6...
```

Si ves `undefined`, el token no está llegando.

### Decodificar el token

Usa https://jwt.io para inspeccionar el token:

```json
{
  "iss": "https://YOUR_DOMAIN.auth0.com/",
  "sub": "auth0|123456",
  "aud": "https://your-api-audience.com",  // ⭐ Debe coincidir
  "iat": 1234567890,
  "exp": 1234567890,
  "email": "user@example.com",
  "name": "User Name"
}
```

## 📚 Documentación Completa

He creado documentación exhaustiva en:

- **`NEXTJS_INTEGRATION_GUIDE.md`**: Guía completa de integración
- **`examples/nextjs-integration/`**:
  - `README.md`: Arquitectura y ejemplos
  - `nestjs-client.ts`: Cliente listo para usar
  - `complete-example.tsx`: Ejemplos copy-paste
  - `auth0-setup-guide.md`: Configuración de Auth0 paso a paso

## ✅ Checklist

Para que funcione correctamente:

- [ ] Auth0 API creado con Identifier (tu `AUTH0_AUDIENCE`)
- [ ] Next.js con `@auth0/nextjs-auth0` instalado
- [ ] `AUTH0_AUDIENCE` configurado en Next.js (.env.local)
- [ ] `AUTH0_AUDIENCE` idéntico en NestJS (.env)
- [ ] Token siendo enviado en header `Authorization: Bearer <token>`
- [ ] Verificar en logs que el token llega: `request Bearer eyJ...`
- [ ] Usuario siendo auto-provisionado en BD

## 🎯 Próximos Pasos

1. **Configura `AUTH0_AUDIENCE` en Next.js**
   ```bash
   # .env.local
   AUTH0_AUDIENCE='https://your-api-audience.com'
   ```

2. **Copia el cliente NestJS**
   ```bash
   cp examples/nextjs-integration/nestjs-client.ts tu-nextjs/lib/
   ```

3. **Crea un Route Handler o API Route**
   Ver ejemplos en `complete-example.tsx`

4. **Verifica en los logs**
   Deberías ver con el `LoggingInterceptor`:
   ```
   [HTTP] ║ HEADERS:
   [HTTP] ║   "authorization": "[REDACTED]"  ← ✅
   ```

5. **Test**
   ```bash
   # Terminal 1: NestJS
   npm run start:dev
   
   # Terminal 2: Next.js
   npm run dev
   
   # Browser: Login y prueba
   ```

## 💡 Resumen Final

**Tu pregunta**: ¿Necesito mandar el token?

**Respuesta**: **Sí, 100%**. Tu API NestJS está diseñada para esto:

1. ✅ Next.js obtiene el token de Auth0
2. ✅ Next.js forward el token a NestJS
3. ✅ NestJS verifica el token independientemente
4. ✅ NestJS auto-provisiona el usuario
5. ✅ Todo funciona end-to-end

**No es un proxy inútil**: Es la arquitectura correcta para preservar la identidad del usuario, implementar seguridad en capas, y mantener auditoría precisa.

Tu código de NestJS ya está perfecto. Solo necesitas enviar el token desde Next.js. 🚀
