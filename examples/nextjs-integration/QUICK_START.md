# 🚀 Quick Start: Integración Next.js → NestJS

## TL;DR

```typescript
// 1️⃣ En Next.js: Obtén el token
const session = await getSession();
const token = session.accessToken;

// 2️⃣ Envíalo a NestJS
fetch('http://localhost:5000/api/publications', {
  headers: {
    'Authorization': `Bearer ${token}`,  // ⭐ ESTO
  }
});

// 3️⃣ NestJS lo verifica automáticamente (ya configurado)
// ✅ Listo!
```

## 📦 Instalación Rápida

### Next.js

```bash
npm install @auth0/nextjs-auth0
```

```bash
# .env.local
AUTH0_SECRET='[openssl rand -hex 32]'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='your_client_id'
AUTH0_CLIENT_SECRET='your_client_secret'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ IMPORTANTE
NESTJS_API_URL='http://localhost:5000'
```

### Auth0 Route

**App Router:**
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

### Proxy al API

**App Router:**
```typescript
// app/api/publications/route.ts
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const response = await fetch('http://localhost:5000/api/publications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
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
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  res.json(await response.json());
});
```

## ✅ Verificar que Funciona

### 1. En Next.js logs:
```bash
npm run dev
```

### 2. En NestJS logs:
```bash
npm run start:dev
```

Deberías ver:
```
[HTTP] ╔═══════════════════════════════════════════════════════════════
[HTTP] ║ INCOMING REQUEST
[HTTP] ╠═══════════════════════════════════════════════════════════════
[HTTP] ║ HEADERS:
[HTTP] ║   "authorization": "[REDACTED]"  ← ✅ Token llegando
```

### 3. Test:

```bash
# Login en http://localhost:3000/api/auth/login
# Luego llama a tu API desde el frontend
```

## 🐛 Problemas Comunes

### ❌ "No token provided"

```typescript
// ❌ Olvidaste enviar el token
fetch('http://localhost:5000/api/publications')

// ✅ Incluye el header
fetch('http://localhost:5000/api/publications', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### ❌ "Invalid audience"

```bash
# Asegúrate que sean IDÉNTICOS

# Next.js .env.local
AUTH0_AUDIENCE='https://api.com'

# NestJS .env
AUTH0_AUDIENCE='https://api.com'  # ⭐ MISMO
```

### ❌ "accessToken is undefined"

Falta configurar `AUTH0_AUDIENCE` en Next.js:

```bash
# .env.local
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ AGREGAR ESTO
```

Sin esto, Auth0 no genera un token para tu API.

## 📚 Documentación Completa

- **`AUTHENTICATION_FLOW.md`**: Explicación del flujo completo
- **`NEXTJS_INTEGRATION_GUIDE.md`**: Guía detallada
- **`examples/nextjs-integration/README.md`**: Arquitectura y ejemplos
- **`examples/nextjs-integration/complete-example.tsx`**: Código copy-paste
- **`examples/nextjs-integration/auth0-setup-guide.md`**: Configurar Auth0

## 🎯 El Punto Clave

**Tu pregunta**: ¿Necesito enviar el token a NestJS?

**Respuesta**: **SÍ**

```
❌ Sin Token:
Next.js → NestJS
         "Quién eres?"

✅ Con Token:
Next.js → NestJS
   Token → "Eres user@email.com (ID: 123)"
           → Auto-provisiona en BD
           → Retorna datos del usuario
```

**NestJS ya está configurado perfectamente**. Solo envía el token desde Next.js. 🚀
