# Next.js Integration Guide - Token Forwarding

## Arquitectura Recomendada: Token Forwarding

Esta API está configurada para recibir tokens JWT de Auth0 directamente. La arquitectura correcta es:

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Usuario   │─────▶│  Next.js (F+B)   │─────▶│  NestJS API     │
└─────────────┘      └──────────────────┘      └─────────────────┘
      │                      │                          │
      │  1. Login           │  2. Forward Token        │  3. Verify Token
      │  Auth0              │  Authorization: Bearer   │  with Auth0 JWKS
      └─────────────────────┘                          │
                                                        │  4. Auto-provision
                                                        │  User in DB
```

## ✅ Implementación Correcta

### 1. **En Next.js - Obtener el Token**

#### Con App Router (Next.js 13+):

```typescript
// app/api/publications/route.ts
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(request: Request) {
  // Obtener la sesión del usuario
  const session = await getSession();
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Obtener el access token de Auth0
  const accessToken = session.accessToken;
  
  const body = await request.json();

  // Llamar a tu NestJS API con el token
  const response = await fetch('http://localhost:5000/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`, // ⭐ Forward el token
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return Response.json(data);
}
```

#### Con Pages Router (Next.js tradicional):

```typescript
// pages/api/publications.ts
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withApiAuthRequired(async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // Obtener el access token del usuario
    const { accessToken } = await getAccessToken(req, res);

    // Llamar a tu NestJS API con el token
    const response = await fetch('http://localhost:5000/api/publications', {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // ⭐ Forward el token
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error forwarding request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

### 2. **Configurar Auth0 en Next.js**

```bash
# .env.local en Next.js
AUTH0_SECRET='your-secret-key-here'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='YOUR_CLIENT_ID'
AUTH0_CLIENT_SECRET='YOUR_CLIENT_SECRET'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ IMPORTANTE
```

**⚠️ CRÍTICO**: El `AUTH0_AUDIENCE` debe ser el mismo que el configurado en esta API NestJS.

### 3. **Verificar Configuración de Auth0**

En tu archivo `.env` de NestJS debe coincidir:

```bash
# .env en NestJS
AUTH0_DOMAIN='YOUR_DOMAIN.auth0.com'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ Mismo que Next.js
AUTH0_ISSUER='https://YOUR_DOMAIN.auth0.com/'
```

### 4. **Configurar el API en Auth0 Dashboard**

1. Ve a **Applications → APIs** en Auth0 Dashboard
2. Asegúrate de tener un API creado con el Audience correcto
3. En **Settings → Token Settings**:
   - ✅ Enable RBAC
   - ✅ Add Permissions in the Access Token

## 🔍 Cómo Verificar que Funciona

### Test desde Next.js:

```typescript
// app/test-api/page.tsx
'use client';

export default function TestAPI() {
  const handleTest = async () => {
    const response = await fetch('/api/publications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Publication',
        content: 'Testing token forwarding',
      }),
    });
    
    console.log('Response:', await response.json());
  };

  return <button onClick={handleTest}>Test API</button>;
}
```

### Ver en los Logs de NestJS:

Con el `LoggingInterceptor` que acabamos de crear, deberías ver:

```
╔═══════════════════════════════════════════════════════════════
║ INCOMING REQUEST
╠═══════════════════════════════════════════════════════════════
║ Method:      POST
║ URL:         /api/publications
║ HEADERS:
║ {
║   "authorization": "[REDACTED]",  # ← El token está llegando
║   ...
║ }
╚═══════════════════════════════════════════════════════════════
```

## ❓ Preguntas Frecuentes

### ¿Por qué no usar API Keys entre Next.js y NestJS?

**Opción API Key:**
```typescript
// ❌ NO RECOMENDADO (pierdes identidad del usuario)
headers: {
  'X-API-Key': 'secret-key-123',
}
```

**Problemas:**
- ❌ No sabes QUÉ usuario hizo la acción
- ❌ No puedes implementar permisos por usuario
- ❌ Todos los requests parecen del mismo "usuario" (Next.js)
- ❌ Auditoría y logs inútiles

**Con Token Forwarding:**
- ✅ Sabes exactamente qué usuario (auth0_user_id, email, name)
- ✅ El `Auth0Guard` auto-provisiona el usuario en tu DB
- ✅ Puedes implementar permisos granulares
- ✅ Logs y auditoría precisos

### ¿Cómo se verifica el token en NestJS?

Tu `Auth0Guard` ya hace todo automáticamente:

1. **Extrae el token** del header `Authorization: Bearer xxx`
2. **Obtiene la clave pública** de Auth0 (JWKS)
3. **Verifica la firma** del JWT
4. **Valida audience e issuer**
5. **Auto-provisiona el usuario** en tu DB
6. **Guarda el usuario** en el contexto (CLS)

```typescript
// En tus controladores, el usuario ya está disponible:
@Get()
async getPublications(@GetUser() user: User) {
  // user es el objeto completo de tu DB
  console.log(user.email, user.auth0UserId);
}
```

### ¿Next.js necesita las claves de Auth0?

**SÍ**, Next.js necesita:
- ✅ `AUTH0_CLIENT_ID`
- ✅ `AUTH0_CLIENT_SECRET`
- ✅ `AUTH0_AUDIENCE` (⭐ CRÍTICO)
- ✅ `AUTH0_ISSUER_BASE_URL`

**NO** puede simplemente obtener el token del usuario y reenviarlo sin la configuración correcta.

### ¿Qué pasa si el token expira?

```typescript
// Next.js debe manejar el refresh
import { getAccessToken } from '@auth0/nextjs-auth0';

try {
  const { accessToken } = await getAccessToken(req, res, {
    refresh: true, // ⭐ Auto-refresh si expiró
  });
} catch (error) {
  // Token expirado, redirigir a login
  return res.status(401).json({ error: 'Session expired' });
}
```

## 🛠️ Troubleshooting

### Error: "Invalid audience"

```
❌ Error: Invalid token - audience mismatch
```

**Solución:**
Verifica que `AUTH0_AUDIENCE` en Next.js sea EXACTAMENTE igual a `AUTH0_AUDIENCE` en NestJS.

### Error: "No token provided"

```
❌ Error: No token provided
```

**Solución:**
Verifica que estás enviando el header:
```typescript
'Authorization': `Bearer ${accessToken}`
```

### Error: "Unable to verify token signature"

```
❌ Error: Unable to verify token signature
```

**Solución:**
1. Verifica que `AUTH0_DOMAIN` sea correcto
2. Verifica que el token sea válido (no expirado)
3. Verifica conectividad a `https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json`

### No puedo obtener el accessToken en Next.js

```
❌ accessToken is undefined
```

**Solución:**
En Auth0 Dashboard, ve a **Applications → Tu App → Settings → Advanced Settings → OAuth**:
- ✅ Grant Types: Authorization Code, Refresh Token
- En **APIs**, asigna el API a tu aplicación

## 📊 Diagrama Completo de Flujo

```
1. Usuario hace login
   ↓
2. Auth0 genera JWT con:
   - sub: auth0|123
   - email: user@example.com
   - aud: https://your-api-audience.com
   - exp: 1234567890
   ↓
3. Next.js almacena el token en sesión
   ↓
4. Usuario hace acción (crear publicación)
   ↓
5. Next.js API Route:
   - Obtiene accessToken de sesión
   - Hace fetch a NestJS con header Authorization
   ↓
6. NestJS Auth0Guard:
   - Verifica firma con Auth0 JWKS
   - Valida audience y expiration
   - Busca/crea usuario en DB
   - Inyecta user en contexto
   ↓
7. Controller de NestJS:
   - Recibe user completo de DB
   - Ejecuta lógica de negocio
   - Retorna respuesta
   ↓
8. Next.js API Route retorna a frontend
```

## 🚀 Ejemplo Completo

### Next.js API Route:

```typescript
// app/api/publications/route.ts
import { getSession } from '@auth0/nextjs-auth0';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const response = await fetch(`${NESTJS_API_URL}/api/publications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    return Response.json(error, { status: response.status });
  }

  const data = await response.json();
  return Response.json(data);
}
```

### Tu NestJS Controller (ya funciona):

```typescript
// publication.controller.ts
@Controller('api/publications')
export class PublicationController {
  @Post()
  async create(
    @GetUser() user: User,  // ⭐ Usuario auto-inyectado por Auth0Guard
    @Body() createDto: CreatePublicationDto,
  ) {
    // user.auth0UserId, user.email, user.name ya disponibles
    return this.publicationService.create(user.id, createDto);
  }
}
```

## ✅ Checklist de Configuración

- [ ] Auth0 API creado con Audience correcto
- [ ] `AUTH0_AUDIENCE` igual en Next.js y NestJS
- [ ] `AUTH0_DOMAIN` configurado en ambos
- [ ] Next.js usando `@auth0/nextjs-auth0`
- [ ] Token siendo forwardeado en header `Authorization`
- [ ] `Auth0Guard` aplicado globalmente en NestJS
- [ ] Logs muestran `[REDACTED]` en authorization header
- [ ] Usuario siendo auto-provisionado en BD

## 🎯 Resultado Final

Con esta configuración:
- ✅ Autenticación segura end-to-end
- ✅ Identidad del usuario preservada
- ✅ NestJS verifica tokens automáticamente
- ✅ Auto-provisioning de usuarios
- ✅ Permisos y auditoría funcional
- ✅ No necesitas API keys adicionales
