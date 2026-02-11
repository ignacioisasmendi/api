# 🚀 START HERE

## Tu Pregunta

> "¿Necesito mandar el token de Auth0 a esta API siendo que ya lo obtuvo Next.js?"

## Respuesta Corta

**SÍ** ✅

```typescript
// Next.js obtiene el token
const { accessToken } = session;

// Y lo envía a NestJS
fetch('http://localhost:5000/api/publications', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // ⭐ ESTO
  }
});
```

## Por Qué

```
❌ SIN TOKEN:
Next.js → NestJS → "¿Quién hizo esto?"
                   "No sé, alguien desde Next.js"

✅ CON TOKEN:
Next.js → NestJS → "user@email.com (ID: 123) hizo esto"
    ↓               ↓
  Token         Verifica + Auto-provisiona
```

## Ventajas

1. ✅ **Identidad**: Sabes exactamente QUÉ usuario hizo la acción
2. ✅ **Seguridad**: NestJS verifica el token independientemente
3. ✅ **Auto-provisioning**: Usuario se crea automáticamente en BD
4. ✅ **Auditoría**: Logs precisos por usuario
5. ✅ **Permisos**: Puedes implementar permisos por usuario

## Cómo Funciona (30 segundos)

```
┌─────────┐
│ Usuario │ Login en Auth0
└────┬────┘
     ↓
┌─────────────────┐
│    Next.js      │ 1. getSession() obtiene token
│  (Frontend +    │ 2. Forward token a NestJS
│   Backend)      │    Authorization: Bearer <token>
└────┬────────────┘
     ↓
┌─────────────────┐
│   NestJS API    │ 1. Auth0Guard verifica token
│  (Este proyecto)│ 2. Busca/crea usuario en BD
│                 │ 3. Inyecta user en controller
└─────────────────┘    @GetUser() user: User
```

## Setup Rápido (5 minutos)

### 1. En Next.js

```bash
npm install @auth0/nextjs-auth0
```

```bash
# .env.local
AUTH0_SECRET='genera-con-openssl-rand-hex-32'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='tu_client_id'
AUTH0_CLIENT_SECRET='tu_client_secret'
AUTH0_AUDIENCE='https://your-api-audience.com'  # ⭐ CRÍTICO
NESTJS_API_URL='http://localhost:5000'
```

### 2. Auth Route

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

### 3. Proxy al API

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
      'Authorization': `Bearer ${session.accessToken}`,  // ⭐
    },
    body: JSON.stringify(await request.json()),
  });

  return Response.json(await response.json());
}
```

### 4. ¡Listo!

Tu NestJS **ya está configurado**. El `Auth0Guard` automáticamente:
- ✅ Verifica el token
- ✅ Valida firma, audience, expiración
- ✅ Busca/crea el usuario en BD
- ✅ Lo inyecta en tus controllers

```typescript
@Post()
create(@GetUser() user: User, @Body() dto: CreateDto) {
  // user.email, user.id, user.auth0UserId disponibles ✅
}
```

## Verificar que Funciona

### En NestJS logs deberías ver:

```
[HTTP] ╔═══════════════════════════════════════════════════════════════
[HTTP] ║ INCOMING REQUEST
[HTTP] ╠═══════════════════════════════════════════════════════════════
[HTTP] ║ HEADERS:
[HTTP] ║   "authorization": "[REDACTED]"  ← ✅ Token llegando
```

## El Único Punto Crítico

**`AUTH0_AUDIENCE` debe ser IDÉNTICO**:

```bash
# Next.js .env.local
AUTH0_AUDIENCE='https://planner-api.com'

# NestJS .env
AUTH0_AUDIENCE='https://planner-api.com'  # ⭐ MISMO

# Auth0 Dashboard → APIs → Tu API → Identifier
Identifier: 'https://planner-api.com'     # ⭐ MISMO
```

Sin esto, Auth0 no generará el token correcto.

## Troubleshooting

| Error | Solución |
|-------|----------|
| "No token provided" | Estás enviando el header `Authorization`? |
| "Invalid audience" | `AUTH0_AUDIENCE` debe ser idéntico en todos lados |
| `accessToken` undefined | Falta configurar `AUTH0_AUDIENCE` en Next.js |
| "Unable to verify token" | Verifica `AUTH0_DOMAIN` en NestJS |

## Documentación Completa

1. **[AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)** - Explicación completa
2. **[examples/nextjs-integration/QUICK_START.md](./examples/nextjs-integration/QUICK_START.md)** - Más ejemplos
3. **[NEXTJS_INTEGRATION_GUIDE.md](./NEXTJS_INTEGRATION_GUIDE.md)** - Guía exhaustiva
4. **[examples/nextjs-integration/complete-example.tsx](./examples/nextjs-integration/complete-example.tsx)** - Código copy-paste
5. **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Índice de toda la documentación

## Archivos Útiles

- `examples/nextjs-integration/nestjs-client.ts` - Cliente listo para usar
- `examples/nextjs-integration/.env.nextjs.example` - Variables de entorno
- `examples/nextjs-integration/auth0-setup-guide.md` - Configurar Auth0

## Próximos Pasos

1. ✅ Configura `AUTH0_AUDIENCE` en Next.js
2. ✅ Copia `nestjs-client.ts` a tu proyecto Next.js
3. ✅ Crea un Route Handler o API Route (ver ejemplos)
4. ✅ Verifica en los logs que el token llega
5. ✅ Test: Login → Crear publicación → ¡Funciona!

---

## 🎯 Resumen

**Tu duda**: ¿Por qué usar Next.js como proxy si ya tengo el token?

**Respuesta**: No es solo un proxy. Es la arquitectura correcta que:
- Preserva la identidad del usuario
- Implementa seguridad en capas (Next.js auth + NestJS verification)
- Permite auditoría precisa
- Habilita permisos granulares

**Tu NestJS ya está perfecto**. Solo envía el token desde Next.js. 🚀

---

**¿Necesitas ayuda?** Lee `AUTHENTICATION_FLOW.md` para la explicación completa.
