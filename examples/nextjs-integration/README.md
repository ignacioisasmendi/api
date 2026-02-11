# Integración Next.js ↔️ NestJS con Auth0

Este directorio contiene ejemplos y utilidades para integrar tu frontend Next.js con esta API de NestJS.

## 📋 Índice

1. [Arquitectura](#arquitectura)
2. [Setup Rápido](#setup-rápido)
3. [Archivos Incluidos](#archivos-incluidos)
4. [Configuración Paso a Paso](#configuración-paso-a-paso)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [FAQ](#faq)

## 🏗️ Arquitectura

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
│                     (Navegador Web)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 1. Login con Auth0
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH0 TENANT                                │
│  • Autentica usuario                                             │
│  • Genera JWT con claims (sub, email, name, etc)                │
│  • Token válido para audience: "https://your-api.com"            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 2. Devuelve JWT
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NEXT.JS (Frontend + Backend)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Frontend (React)                                        │   │
│  │  • Muestra UI                                            │   │
│  │  • Hace fetch a /api/publications (Next.js API)          │   │
│  └───────────────┬──────────────────────────────────────────┘   │
│                  │                                               │
│  ┌───────────────▼──────────────────────────────────────────┐   │
│  │  Backend (API Routes / Server Actions)                   │   │
│  │  • getSession() obtiene el JWT de la sesión              │   │
│  │  • Extrae accessToken                                    │   │
│  │  • Forward el token a NestJS API                         │   │
│  └───────────────┬──────────────────────────────────────────┘   │
└──────────────────┼──────────────────────────────────────────────┘
                   │
                   │ 3. HTTP Request con header:
                   │    Authorization: Bearer <JWT>
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NESTJS API (Este Proyecto)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Auth0Guard                                              │   │
│  │  1. Extrae token del header Authorization               │   │
│  │  2. Decodifica JWT (sin verificar) para obtener kid     │   │
│  │  3. Obtiene clave pública de Auth0 JWKS                 │   │
│  │  4. Verifica firma, audience, issuer, expiration        │   │
│  │  5. Extrae claims (sub, email, name)                    │   │
│  └───────────────┬──────────────────────────────────────────┘   │
│                  │ ✅ Token válido                               │
│  ┌───────────────▼──────────────────────────────────────────┐   │
│  │  UserService.findOrCreateUser()                          │   │
│  │  • Busca usuario por auth0UserId en BD                   │   │
│  │  • Si no existe, lo crea (auto-provisioning)            │   │
│  │  • Retorna objeto User completo                          │   │
│  └───────────────┬──────────────────────────────────────────┘   │
│                  │                                               │
│  ┌───────────────▼──────────────────────────────────────────┐   │
│  │  Controller (con @GetUser decorator)                     │   │
│  │  • Recibe User inyectado                                 │   │
│  │  • user.id, user.email, user.auth0UserId disponibles     │   │
│  │  • Ejecuta lógica de negocio                             │   │
│  └───────────────┬──────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
                   │ 4. Response con datos
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEXT.JS                                    │
│  • Recibe respuesta                                              │
│  • Retorna al frontend                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 5. Muestra resultado
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
└─────────────────────────────────────────────────────────────────┘
```

## ⚡ Setup Rápido

### 1. Configurar Next.js

```bash
cd tu-proyecto-nextjs
npm install @auth0/nextjs-auth0
```

```bash
# .env.local
AUTH0_SECRET='use [openssl rand -hex 32] para generar'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='tu_client_id'
AUTH0_CLIENT_SECRET='tu_client_secret'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ MISMO QUE NESTJS
NESTJS_API_URL='http://localhost:5000'
```

### 2. Configurar Auth0 en Next.js

**App Router (Next.js 13+):**

```typescript
// app/api/auth/[auth0]/route.ts
import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();
```

**Pages Router:**

```typescript
// pages/api/auth/[...auth0].ts
import { handleAuth } from '@auth0/nextjs-auth0';

export default handleAuth();
```

### 3. Copiar el Cliente NestJS

Copia `nestjs-client.ts` a tu proyecto Next.js:

```bash
cp nestjs-client.ts /ruta/a/tu/nextjs/lib/nestjs-client.ts
```

### 4. Usar el Cliente

**App Router:**

```typescript
// app/api/publications/route.ts
import { NextResponse } from 'next/server';
import { NestJSClient, APIError } from '@/lib/nestjs-client';

export async function POST(request: Request) {
  try {
    const client = await NestJSClient.fromSession();
    const body = await request.json();
    
    const publication = await client.post('/api/publications', body);
    
    return NextResponse.json(publication);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

**Pages Router:**

```typescript
// pages/api/publications/create.ts
import { withApiAuthRequired } from '@auth0/nextjs-auth0';
import { nestjsRequest, APIError } from '@/lib/nestjs-client';

export default withApiAuthRequired(async (req, res) => {
  try {
    const publication = await nestjsRequest(
      req,
      res,
      '/api/publications',
      {
        method: 'POST',
        body: JSON.stringify(req.body),
      },
    );

    return res.status(201).json(publication);
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

## 📁 Archivos Incluidos

```
examples/nextjs-integration/
├── README.md                  # Este archivo
└── nestjs-client.ts          # Cliente para integración con NestJS
```

## 🔧 Configuración Paso a Paso

### Paso 1: Auth0 Dashboard

1. Ve a **Applications → APIs**
2. Crea un nuevo API (si no existe)
   - Name: "Planner API"
   - Identifier: `https://your-api-audience.com` (puede ser cualquier URL, no necesita existir)
3. En **Settings → Token Settings**:
   - ✅ Enable RBAC
   - ✅ Add Permissions in the Access Token
4. En **Applications**, asegúrate de que tu aplicación Next.js:
   - Tenga Grant Type: Authorization Code, Refresh Token
   - Esté autorizada para este API

### Paso 2: Variables de Entorno

**Next.js (.env.local):**
```bash
AUTH0_SECRET='un-string-aleatorio-de-32-caracteres'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://dev-xxx.us.auth0.com'
AUTH0_CLIENT_ID='tu_app_client_id'
AUTH0_CLIENT_SECRET='tu_app_client_secret'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐
NESTJS_API_URL='http://localhost:5000'
```

**NestJS (.env):**
```bash
AUTH0_DOMAIN='dev-xxx.us.auth0.com'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ MISMO
AUTH0_ISSUER='https://dev-xxx.us.auth0.com/'
```

### Paso 3: Verificar el Token

En NestJS, puedes ver el token en los logs:

```typescript
// Ya configurado en auth0.guard.ts
console.log('request', request.headers['authorization']);
```

O usando el `LoggingInterceptor` (ya instalado):

```
╔═══════════════════════════════════════════════════════════════
║ INCOMING REQUEST
╠═══════════════════════════════════════════════════════════════
║ HEADERS:
║ {
║   "authorization": "[REDACTED]",  # ← Token llegando ✅
║   ...
║ }
╚═══════════════════════════════════════════════════════════════
```

## 🧪 Ejemplos de Uso

Ver `nestjs-client.ts` para ejemplos completos de:

- ✅ Server Components (App Router)
- ✅ Server Actions (App Router)
- ✅ Route Handlers (App Router)
- ✅ API Routes (Pages Router)
- ✅ Client Components

## ❓ FAQ

### ¿Por qué no usar API Keys?

```typescript
// ❌ MAL - Todos los requests parecen del mismo usuario
headers: {
  'X-API-Key': 'secret-key'
}
```

**Problemas:**
- No sabes QUÉ usuario hizo la acción
- No puedes implementar permisos por usuario
- Logs y auditoría inútiles

```typescript
// ✅ BIEN - Preservas la identidad del usuario
headers: {
  'Authorization': `Bearer ${userToken}`
}
```

**Beneficios:**
- Sabes exactamente qué usuario (email, ID, etc.)
- Permisos granulares por usuario
- Auditoría y logs precisos

### ¿Next.js puede verificar los tokens también?

**Sí**, pero no es necesario. Next.js ya confía en Auth0 para autenticar al usuario. La verificación en NestJS es para:

1. **Seguridad**: NestJS no confía ciegamente en Next.js
2. **Múltiples clientes**: Podrías tener mobile apps, otros backends, etc.
3. **Auditoría**: Verificación independiente en cada servicio

### ¿Qué pasa si el token expira?

```typescript
// @auth0/nextjs-auth0 maneja esto automáticamente
const { accessToken } = await getAccessToken(req, res, {
  refresh: true, // Auto-refresh si expiró
});
```

Si el refresh token también expiró, el usuario debe hacer login de nuevo.

### ¿Puedo llamar directamente desde el frontend?

**Técnicamente sí, pero NO es recomendado:**

```typescript
// ❌ NO RECOMENDADO
// Frontend -> NestJS directamente
const response = await fetch('http://localhost:5000/api/publications', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**Problemas:**
- Token expuesto en el cliente
- CORS más complejo
- No puedes agregar lógica en el medio (caching, rate limiting, etc.)

**Mejor práctica:**
```typescript
// ✅ RECOMENDADO
// Frontend -> Next.js API -> NestJS
const response = await fetch('/api/publications'); // Next.js proxy
```

### ¿Cómo debugging cuando no funciona?

1. **Verificar que el token llega:**
```typescript
// En auth0.guard.ts (ya existe)
console.log('Token:', request.headers['authorization']);
```

2. **Verificar el token en jwt.io:**
   - Copia el token (sin "Bearer ")
   - Pégalo en https://jwt.io
   - Verifica `aud` (audience), `exp` (expiration), `iss` (issuer)

3. **Verificar configuración:**
```typescript
// En NestJS
console.log('Expected audience:', process.env.AUTH0_AUDIENCE);
console.log('Token audience:', payload.aud);
```

4. **Ver logs del LoggingInterceptor:**
   - Headers entrantes
   - Status code de respuesta
   - Errores

### ¿Funciona con Server Actions?

**Sí!** (Next.js 13+ App Router)

```typescript
// app/actions/publications.ts
'use server';

import { NestJSClient } from '@/lib/nestjs-client';

export async function createPublication(formData: FormData) {
  const client = await NestJSClient.fromSession();
  
  return await client.post('/api/publications', {
    title: formData.get('title'),
    content: formData.get('content'),
  });
}
```

```typescript
// app/components/Form.tsx
'use client';

import { createPublication } from '@/app/actions/publications';

export default function Form() {
  return (
    <form action={createPublication}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  );
}
```

## 🚀 Testing

### Test en Next.js:

```bash
curl -X POST http://localhost:3000/api/publications \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Testing"}'
```

### Ver en NestJS logs:

```
[HTTP] ╔═══════════════════════════════════════════════════════════════
[HTTP] ║ INCOMING REQUEST
[HTTP] ╠═══════════════════════════════════════════════════════════════
[HTTP] ║ Method:      POST
[HTTP] ║ URL:         /api/publications
[HTTP] ║ HEADERS:
[HTTP] ║   "authorization": "[REDACTED]"  ← Token ✅
```

## ✅ Checklist

- [ ] Auth0 API creado con Audience
- [ ] Next.js instalado `@auth0/nextjs-auth0`
- [ ] Variables de entorno configuradas (MISMO audience)
- [ ] `nestjs-client.ts` copiado a Next.js
- [ ] Route Handler o API Route creado
- [ ] Token siendo forwardeado
- [ ] Logs en NestJS muestran `[REDACTED]` en authorization
- [ ] Usuario siendo auto-provisionado en BD

## 📚 Recursos

- [NestJS Integration Guide](../../NEXTJS_INTEGRATION_GUIDE.md)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Auth0 API Authorization](https://auth0.com/docs/get-started/apis)
- [NestJS Guards](https://docs.nestjs.com/guards)

## 🆘 Troubleshooting

Ver sección "Troubleshooting" en [NEXTJS_INTEGRATION_GUIDE.md](../../NEXTJS_INTEGRATION_GUIDE.md)
