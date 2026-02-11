# Guía de Autenticación con Auth0

Esta aplicación utiliza **Auth0** para la autenticación y **nestjs-cls** para manejar el contexto del usuario en cada request.

## 🔧 Configuración

### 1. Variables de entorno

Agrega las siguientes variables en tu archivo `.env`:

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_ISSUER=https://your-tenant.auth0.com/
```

### 2. Configurar Auth0

1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Crea una nueva aplicación (tipo: Single Page Application o Native)
3. Crea una API en Auth0:
   - Ve a Applications > APIs > Create API
   - El "Identifier" será tu `AUTH0_AUDIENCE`
4. Copia el dominio de tu tenant para `AUTH0_DOMAIN`

## 🚀 Uso en Controllers

### Rutas Protegidas (por defecto)

Todas las rutas están protegidas por defecto. Solo necesitas usar el decorador `@GetUser()`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { GetUser, AuthUser } from './auth';

@Controller('publications')
export class PublicationController {
  @Get()
  async getMyPublications(@GetUser() user: AuthUser) {
    // user contiene:
    // - auth0UserId: string
    // - email: string
    // - name?: string
    // - picture?: string
    
    console.log('User ID:', user.auth0UserId);
    return this.publicationService.findByUserId(user.auth0UserId);
  }
}
```

### Rutas Públicas

Para hacer una ruta pública (sin autenticación), usa el decorador `@Public()`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

## 📦 Cómo funciona

### 1. Guard Global (Auth0Guard)

El `Auth0Guard` está configurado como guard global en `app.module.ts`:

- **Valida automáticamente** todos los requests (excepto los marcados con `@Public()`)
- **Verifica el JWT** usando las claves públicas de Auth0 (JWKS)
- **Extrae información del usuario** del token
- **Guarda el usuario en CLS** (Context Local Storage) para acceso global en esa request

### 2. nestjs-cls (Context Local Storage)

CLS permite guardar información de la request (como el usuario autenticado) y acceder a ella desde cualquier lugar sin pasar parámetros manualmente.

```typescript
// En el guard se guarda:
this.cls.set('user', user);

// En cualquier lugar de la request se puede obtener:
const user = this.cls.get('user');
```

### 3. Decorador @GetUser()

El decorador `@GetUser()` es una forma conveniente de obtener el usuario autenticado:

```typescript
export const GetUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): AuthUser | null => {
    const cls = ClsServiceManager.getClsService();
    return cls.get('user') || null;
  },
);
```

## 🔐 Seguridad

### Tokens de Acceso

Los usuarios deben incluir el token de Auth0 en el header `Authorization`:

```
Authorization: Bearer <token>
```

### Validación del Token

El guard verifica:
- ✅ Firma del token (usando JWKS de Auth0)
- ✅ Audience (debe coincidir con `AUTH0_AUDIENCE`)
- ✅ Issuer (debe coincidir con `AUTH0_ISSUER`)
- ✅ Algoritmo (debe ser RS256)
- ✅ Expiración del token

## 🧪 Pruebas

### Obtener un token de Auth0

Para pruebas, puedes obtener un token de varias formas:

**Opción 1: Auth0 Dashboard**
1. Ve a Applications > APIs > Tu API > Test
2. Copia el token de acceso

**Opción 2: Usando cURL**

```bash
curl --request POST \
  --url https://YOUR_DOMAIN.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id":"YOUR_CLIENT_ID",
    "client_secret":"YOUR_CLIENT_SECRET",
    "audience":"YOUR_AUDIENCE",
    "grant_type":"client_credentials"
  }'
```

### Probar endpoint protegido

```bash
# Sin token (debe fallar)
curl http://localhost:5000/me

# Con token (debe funcionar)
curl http://localhost:5000/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Probar endpoint público

```bash
# Funciona sin token
curl http://localhost:5000
```

## 📚 Ejemplos de Uso

### Ejemplo 1: Crear contenido para el usuario autenticado

```typescript
@Post()
async create(
  @GetUser() user: AuthUser,
  @Body() createContentDto: CreateContentDto,
) {
  return this.contentService.create({
    ...createContentDto,
    userId: user.auth0UserId,
  });
}
```

### Ejemplo 2: Verificar que el usuario sea dueño de un recurso

```typescript
@Get(':id')
async findOne(
  @GetUser() user: AuthUser,
  @Param('id') id: string,
) {
  const content = await this.contentService.findOne(id);
  
  if (content.userId !== user.auth0UserId) {
    throw new ForbiddenException('You do not own this resource');
  }
  
  return content;
}
```

### Ejemplo 3: Usar el usuario en un servicio

Si necesitas el usuario en un servicio (no en un controller), puedes inyectar `ClsService`:

```typescript
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuthUser } from '../auth';

@Injectable()
export class MyService {
  constructor(private readonly cls: ClsService) {}

  doSomething() {
    const user = this.cls.get<AuthUser>('user');
    console.log('Current user:', user.email);
  }
}
```

## 🔄 Flujo de Autenticación

```
1. Cliente obtiene token de Auth0
   ↓
2. Cliente envía request con header: Authorization: Bearer <token>
   ↓
3. Auth0Guard intercepta el request
   ↓
4. Guard valida el token con las claves públicas de Auth0 (JWKS)
   ↓
5. Guard extrae información del usuario del payload del token
   ↓
6. Guard guarda el usuario en CLS: cls.set('user', user)
   ↓
7. Controller obtiene el usuario con @GetUser()
   ↓
8. Lógica de negocio se ejecuta con el usuario autenticado
```

## 🛠️ Troubleshooting

### Error: "AUTH0_DOMAIN is not configured"

- Asegúrate de tener las variables de entorno configuradas
- Verifica que el archivo `.env` esté en la raíz del proyecto

### Error: "Invalid or expired token"

- El token puede estar expirado (los tokens tienen un tiempo de vida limitado)
- Verifica que el `AUTH0_AUDIENCE` y `AUTH0_ISSUER` sean correctos
- Asegúrate de que el token sea para la API correcta

### Error: "No token provided"

- Verifica que el header `Authorization` esté presente
- El formato debe ser: `Bearer <token>` (con espacio)

### Error: "Unable to verify token signature"

- El token puede ser inválido o manipulado
- Verifica que el dominio de Auth0 sea correcto
