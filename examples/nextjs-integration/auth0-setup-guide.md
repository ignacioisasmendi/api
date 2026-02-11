# Guía de Configuración de Auth0

Esta guía te ayudará a configurar Auth0 correctamente para que funcione con Next.js y NestJS.

## 📋 Tabla de Contenidos

1. [Crear Auth0 Tenant](#crear-auth0-tenant)
2. [Configurar Application (Next.js)](#configurar-application-nextjs)
3. [Configurar API (NestJS)](#configurar-api-nestjs)
4. [Conectar Application con API](#conectar-application-con-api)
5. [Verificar Configuración](#verificar-configuración)

## 🆕 Crear Auth0 Tenant

Si ya tienes un Auth0 tenant, salta este paso.

1. Ve a https://auth0.com
2. Crea una cuenta o inicia sesión
3. Crea un nuevo tenant (si es necesario)
   - Nombre: `dev-tuapp` (ejemplo)
   - Región: Elige la más cercana a tus usuarios

## 🖥️ Configurar Application (Next.js)

### Paso 1: Crear Application

1. Ve a **Applications → Applications**
2. Click en **Create Application**
3. Configuración:
   - **Name**: `Planner Frontend` (o el nombre que prefieras)
   - **Application Type**: **Regular Web Application**
4. Click **Create**

### Paso 2: Configurar Settings

En la pestaña **Settings** de tu aplicación:

#### Basic Information
- **Client ID**: Cópialo para usar en `AUTH0_CLIENT_ID`
- **Client Secret**: Cópialo para usar en `AUTH0_CLIENT_SECRET`
- **Domain**: Cópialo para usar en `AUTH0_ISSUER_BASE_URL`

#### Application URIs

**Allowed Callback URLs**:
```
http://localhost:3000/api/auth/callback
```

Para producción, agrega también:
```
https://tudominio.com/api/auth/callback
```

**Allowed Logout URLs**:
```
http://localhost:3000
```

Para producción:
```
https://tudominio.com
```

**Allowed Web Origins**:
```
http://localhost:3000
```

Para producción:
```
https://tudominio.com
```

#### Advanced Settings

Ve a **Advanced Settings → OAuth**:

**Grant Types** (selecciona estos):
- ✅ Authorization Code
- ✅ Refresh Token
- ✅ Implicit (opcional)

### Paso 3: Guardar

Click **Save Changes** al final de la página.

## 🔌 Configurar API (NestJS)

### Paso 1: Crear API

1. Ve a **Applications → APIs**
2. Click en **Create API**
3. Configuración:
   - **Name**: `Planner API` (o el nombre que prefieras)
   - **Identifier**: `https://planner-api.com` (⭐ IMPORTANTE)
     - Este es tu `AUTH0_AUDIENCE`
     - Puede ser cualquier URL, no necesita existir
     - NO puede cambiar después de crear el API
     - Ejemplo: `https://api.miapp.com`
   - **Signing Algorithm**: `RS256`
4. Click **Create**

### Paso 2: Configurar Settings

En la pestaña **Settings** del API:

#### General Settings
- **Identifier**: Este es tu `AUTH0_AUDIENCE` ⭐
- **Token Expiration**: 86400 (24 horas, puedes ajustar)
- **Token Expiration For Browser Flows**: 7200 (2 horas)

#### Token Settings
- ✅ **Enable RBAC**: Activar
- ✅ **Add Permissions in the Access Token**: Activar

#### Access Settings
- **Allow Skipping User Consent**: Puedes activarlo para desarrollo
- **Allow Offline Access**: Activar para refresh tokens

### Paso 3: Permisos (Opcional)

Si quieres implementar permisos granulares:

1. Ve a la pestaña **Permissions**
2. Agrega permisos, por ejemplo:
   - `read:publications`
   - `write:publications`
   - `delete:publications`

### Paso 4: Guardar

Click **Save** si hiciste cambios.

## 🔗 Conectar Application con API

### Paso 1: Autorizar el Application

1. Ve a **Applications → APIs → Tu API**
2. Click en la pestaña **Machine to Machine Applications**
3. Busca tu Application (`Planner Frontend`)
4. Activa el toggle a la derecha
5. Selecciona los permisos que quieres otorgar (o todos)
6. Click **Update**

### Paso 2: Verificar en Application

1. Ve a **Applications → Applications → Tu Application**
2. Click en la pestaña **APIs**
3. Deberías ver tu API listada
4. Click en el API para expandir
5. Verifica los permisos otorgados

## ✅ Verificar Configuración

### Checklist

- [ ] **Application creado** con Client ID y Secret
- [ ] **Callback URLs configuradas** (incluyendo `/api/auth/callback`)
- [ ] **Logout URLs configuradas**
- [ ] **Grant Types** incluyen Authorization Code y Refresh Token
- [ ] **API creado** con Identifier (Audience)
- [ ] **RBAC activado** en el API
- [ ] **Application autorizado** para usar el API

### Variables de Entorno

Ahora deberías tener todos los valores necesarios:

**Next.js (.env.local)**:
```bash
AUTH0_SECRET='[genera con: openssl rand -hex 32]'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://[TU_DOMAIN].auth0.com'
AUTH0_CLIENT_ID='[de Application Settings]'
AUTH0_CLIENT_SECRET='[de Application Settings]'
AUTH0_AUDIENCE='[de API Identifier]'  # ⭐ Por ejemplo: https://planner-api.com
NESTJS_API_URL='http://localhost:5000'
```

**NestJS (.env)**:
```bash
AUTH0_DOMAIN='[TU_DOMAIN].auth0.com'
AUTH0_AUDIENCE='[de API Identifier]'  # ⭐ MISMO que Next.js
AUTH0_ISSUER='https://[TU_DOMAIN].auth0.com/'
DATABASE_URL='postgresql://...'
# ... otras variables
```

### Test de Configuración

#### 1. Verificar que el token se genera correctamente

En Next.js, crea un endpoint de prueba:

```typescript
// app/api/test-token/route.ts
import { getSession } from '@auth0/nextjs-auth0';

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ error: 'Not authenticated' });
  }

  // Decodificar el token (solo para debugging)
  const [header, payload, signature] = session.accessToken.split('.');
  const decodedPayload = JSON.parse(
    Buffer.from(payload, 'base64').toString()
  );

  return Response.json({
    user: session.user,
    tokenPayload: decodedPayload,
  });
}
```

Visita: `http://localhost:3000/api/test-token`

Deberías ver:
```json
{
  "user": {
    "sub": "auth0|...",
    "email": "user@example.com",
    ...
  },
  "tokenPayload": {
    "iss": "https://YOUR_DOMAIN.auth0.com/",
    "sub": "auth0|...",
    "aud": "https://planner-api.com",  ← ⭐ Tu API Audience
    "iat": 1234567890,
    "exp": 1234567890,
    "scope": "openid profile email",
    ...
  }
}
```

**⚠️ IMPORTANTE**: Verifica que `aud` (audience) sea correcto.

#### 2. Verificar que NestJS acepta el token

En NestJS, el `LoggingInterceptor` mostrará:

```
[HTTP] ╔═══════════════════════════════════════════════════════════════
[HTTP] ║ INCOMING REQUEST
[HTTP] ╠═══════════════════════════════════════════════════════════════
[HTTP] ║ HEADERS:
[HTTP] ║   "authorization": "[REDACTED]"  ← Token llegando ✅
```

Y el `Auth0Guard` debería validarlo sin errores.

## 🐛 Troubleshooting

### Error: "Audience is invalid"

```json
{
  "error": "invalid_grant",
  "error_description": "Audience is invalid"
}
```

**Solución**:
- Verifica que `AUTH0_AUDIENCE` en Next.js coincida con el Identifier del API en Auth0
- Verifica que el Application esté autorizado para usar ese API

### Error: "Grant type not allowed"

```json
{
  "error": "unauthorized_client",
  "error_description": "Grant type 'authorization_code' not allowed"
}
```

**Solución**:
- Ve a Application → Advanced Settings → OAuth
- Activa **Authorization Code** y **Refresh Token**

### Error: "Invalid callback URL"

```json
{
  "error": "invalid_request",
  "error_description": "The redirect URI is wrong"
}
```

**Solución**:
- Verifica que la Callback URL en Auth0 coincida exactamente con tu URL
- Debe ser `http://localhost:3000/api/auth/callback` (con `/api/auth/callback`)

### Token no incluye el campo "email"

**Solución**:
- Ve a Application → Connections
- Asegúrate de que al menos una connection esté activada (ej: Username-Password-Authentication)
- En la connection, ve a Settings
- Verifica que los atributos necesarios (email, name) estén mapeados

### NestJS rechaza el token: "Unable to verify token signature"

**Solución**:
- Verifica que `AUTH0_DOMAIN` en NestJS sea correcto (sin https://)
- Verifica conectividad a `https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json`
- El token puede haber expirado, intenta obtener uno nuevo

### NestJS rechaza el token: "Invalid audience"

**Solución**:
```bash
# En NestJS .env
AUTH0_AUDIENCE='https://planner-api.com'  # Debe ser EXACTO al API Identifier

# En Next.js .env.local
AUTH0_AUDIENCE='https://planner-api.com'  # Debe ser EXACTO al API Identifier
```

Ambos deben ser idénticos al **Identifier** del API en Auth0 Dashboard.

## 🔐 Mejores Prácticas de Seguridad

### Desarrollo

- ✅ Usa `.env.local` (no committear)
- ✅ Valores de prueba separados
- ✅ Tenant de desarrollo separado

### Producción

- ✅ Variables de entorno del hosting (Vercel, Railway, etc.)
- ✅ `AUTH0_SECRET` diferente y más fuerte
- ✅ Tenant de producción separado
- ✅ HTTPS obligatorio
- ✅ URLs de callback/logout de producción configuradas
- ✅ Rate limiting activado en Auth0

### General

- ✅ Nunca expongas `AUTH0_CLIENT_SECRET` en el frontend
- ✅ Nunca committees archivos `.env`
- ✅ Usa permisos granulares (RBAC)
- ✅ Monitorea logs de Auth0 Dashboard
- ✅ Configura MFA (Multi-Factor Authentication) para usuarios

## 📚 Recursos Adicionales

- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Auth0 API Authentication](https://auth0.com/docs/get-started/apis)
- [Auth0 RBAC](https://auth0.com/docs/manage-users/access-control/rbac)
- [JWT.io](https://jwt.io) - Debugging de tokens

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs en Auth0 Dashboard → Monitoring → Logs
2. Revisa los logs de NestJS (LoggingInterceptor)
3. Usa jwt.io para inspeccionar el token
4. Verifica que todas las URLs coincidan exactamente
5. Verifica que el audience sea idéntico en todos lados
