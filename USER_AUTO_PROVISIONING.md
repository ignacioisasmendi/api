# Auto-Provisioning de Usuarios

## 📝 ¿Qué es Auto-Provisioning?

El **auto-provisioning** (también conocido como "just-in-time provisioning") es un patrón donde los usuarios se crean automáticamente en la base de datos local la primera vez que se autentican con Auth0, sin necesidad de un proceso de registro separado.

## 🔄 Flujo Completo

```
1. Usuario se autentica en Auth0 (frontend)
   ↓
2. Auth0 devuelve un token JWT al frontend
   ↓
3. Frontend envía request a la API con el token
   ↓
4. Auth0Guard intercepta el request
   ↓
5. Guard valida el token con Auth0 (JWKS)
   ↓
6. Guard extrae información del usuario del token:
   - sub (auth0UserId)
   - email
   - name
   - picture
   ↓
7. Guard llama a UserService.findOrCreateUser()
   ↓
8. UserService busca el usuario en la BD por auth0UserId
   ↓
9. Si NO existe → Crea el usuario
   Si SÍ existe → Opcionalmente actualiza info si cambió
   ↓
10. Guard guarda el usuario completo (de la BD) en CLS
   ↓
11. Controller obtiene el usuario con @GetUser()
   ↓
12. Servicio usa user.id para operaciones de BD
```

## 💻 Implementación

### 1. UserService

El `UserService` tiene el método `findOrCreateUser()` que:

```typescript
async findOrCreateUser(userData: CreateUserData): Promise<User> {
  // 1. Buscar usuario por auth0UserId
  let user = await this.prisma.user.findUnique({
    where: { auth0UserId: userData.auth0UserId },
  });

  if (user) {
    // 2. Si existe, actualizar info si cambió
    const needsUpdate = /* verificar cambios */;
    if (needsUpdate) {
      user = await this.prisma.user.update({ ... });
    }
    return user;
  }

  // 3. Si no existe, crear nuevo usuario
  user = await this.prisma.user.create({
    data: {
      auth0UserId: userData.auth0UserId,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
    },
  });

  return user;
}
```

### 2. Auth0Guard

El guard ahora llama a `UserService` antes de guardar el usuario en CLS:

```typescript
// Extraer info del token
const auth0UserId = payload.sub;
const email = payload.email;
const name = payload.name;
const picture = payload.picture;

// Buscar o crear el usuario en la BD
const user = await this.userService.findOrCreateUser({
  auth0UserId,
  email,
  name,
  avatar: picture,
});

// Guardar el usuario completo (de la BD) en CLS
this.cls.set('user', user);
```

### 3. Decorador @GetUser()

Ahora retorna el tipo completo `User` de Prisma (no solo datos del token):

```typescript
export const GetUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): User | null => {
    const cls = ClsServiceManager.getClsService();
    return cls.get('user') || null;
  },
);
```

### 4. Controllers

Los controllers ahora reciben el usuario completo de la BD:

```typescript
@Post()
async create(@GetUser() user: User, @Body() dto: CreatePublicationDto) {
  // user.id es el ID de la base de datos
  // user.auth0UserId es el ID de Auth0
  return this.publicationService.createPublication(dto, user.id);
}
```

## ✅ Ventajas

1. **Experiencia de usuario fluida**: No hay proceso de registro separado
2. **Sincronización automática**: La info del usuario se actualiza automáticamente
3. **Consistencia**: Siempre trabajas con el usuario de la BD, no solo con datos del token
4. **Seguridad**: El usuario siempre está validado contra Auth0 antes de crearse/actualizarse

## 📊 Base de Datos

### Tabla User

```prisma
model User {
  id           String   @id @default(cuid())
  auth0UserId  String   @unique  // ← Clave para encontrar/crear usuario
  email        String   @unique
  name         String?
  avatar       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  contents       Content[]
  socialAccounts SocialAccount[]
}
```

### Índices Importantes

- `auth0UserId` - **UNIQUE**: Garantiza un usuario por cuenta de Auth0
- `email` - **UNIQUE**: Evita duplicados por email

## 🔍 Ejemplo Práctico

### Primera vez que el usuario entra:

**Request:**
```
GET /publications
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token payload:**
```json
{
  "sub": "auth0|123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://avatars.com/john.jpg"
}
```

**Lo que sucede en la BD:**
```sql
-- Guard llama a findOrCreateUser()
-- No encuentra usuario, entonces ejecuta:
INSERT INTO "User" (id, auth0UserId, email, name, avatar, createdAt, updatedAt)
VALUES (
  'clxy123abc',
  'auth0|123456789',
  'user@example.com',
  'John Doe',
  'https://avatars.com/john.jpg',
  NOW(),
  NOW()
);
```

**Response:**
```json
{
  "publications": [...]
}
```

### Segunda vez que el usuario entra:

**Lo que sucede en la BD:**
```sql
-- Guard llama a findOrCreateUser()
-- Encuentra usuario, verifica si necesita actualización
SELECT * FROM "User" WHERE auth0UserId = 'auth0|123456789';

-- Si la info cambió en Auth0 (ej: nuevo nombre o avatar):
UPDATE "User" 
SET name = 'John Doe Updated', avatar = 'new-url', updatedAt = NOW()
WHERE auth0UserId = 'auth0|123456789';
```

## 🎯 Endpoints de Usuario

Ahora también tienes endpoints para gestionar el perfil:

### GET /users/me
Obtiene el perfil del usuario autenticado:

```typescript
@Get('me')
async getProfile(@GetUser() user: User) {
  return user;
}
```

**Response:**
```json
{
  "id": "clxy123abc",
  "auth0UserId": "auth0|123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://avatars.com/john.jpg",
  "createdAt": "2026-01-29T00:00:00Z",
  "updatedAt": "2026-01-29T00:00:00Z"
}
```

### GET /users/me/full
Obtiene el perfil con todas las cuentas sociales:

```typescript
@Get('me/full')
async getFullProfile(@GetUser() user: User) {
  return this.userService.getUserWithSocialAccounts(user.id);
}
```

**Response:**
```json
{
  "id": "clxy123abc",
  "auth0UserId": "auth0|123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://avatars.com/john.jpg",
  "socialAccounts": [
    {
      "id": "clxy456def",
      "platform": "INSTAGRAM",
      "username": "johndoe",
      "isActive": true,
      "createdAt": "2026-01-29T00:00:00Z"
    },
    {
      "id": "clxy789ghi",
      "platform": "FACEBOOK",
      "username": "john.doe",
      "isActive": true,
      "createdAt": "2026-01-29T00:00:00Z"
    }
  ]
}
```

### PUT /users/me
Actualiza el perfil del usuario:

```typescript
@Put('me')
async updateProfile(@GetUser() user: User, @Body() dto: UpdateUserDto) {
  return this.userService.updateUser(user.id, dto);
}
```

**Request:**
```json
{
  "name": "John Doe Updated",
  "avatar": "https://new-avatar.com/john.jpg"
}
```

## 🔐 Diferencia con el flujo anterior

### ❌ Antes (sin auto-provisioning):

```typescript
// Guard solo guardaba datos del token
const user = {
  auth0UserId: payload.sub,
  email: payload.email,
  name: payload.name,
  picture: payload.picture,
};
this.cls.set('user', user);

// Controller recibía objeto plano
@Post()
async create(@GetUser() user: AuthUser, ...) {
  // user.auth0UserId no estaba en la BD
  // Había que crear el usuario manualmente
}
```

### ✅ Ahora (con auto-provisioning):

```typescript
// Guard crea/actualiza usuario en BD
const user = await this.userService.findOrCreateUser({
  auth0UserId: payload.sub,
  email: payload.email,
  name: payload.name,
  avatar: payload.picture,
});
this.cls.set('user', user);

// Controller recibe usuario de la BD
@Post()
async create(@GetUser() user: User, ...) {
  // user.id es el ID de la BD
  // El usuario ya existe en la BD
  // Puedo usarlo directamente en relaciones
}
```

## 📝 Notas Importantes

1. **El usuario siempre existe en la BD**: No necesitas verificar si existe antes de usarlo
2. **user.id vs user.auth0UserId**: 
   - `user.id`: ID de la base de datos local (usar en relaciones FK)
   - `user.auth0UserId`: ID de Auth0 (para lookup/debugging)
3. **Actualización automática**: Si el usuario cambia su nombre/email/avatar en Auth0, se actualiza automáticamente en el próximo login
4. **Performance**: La búsqueda por `auth0UserId` es rápida gracias al índice único

## 🚀 Próximos Pasos

Con este sistema en su lugar, ahora puedes:

1. ✅ Implementar endpoints para conectar cuentas sociales
2. ✅ Crear publicaciones asociadas al usuario
3. ✅ Filtrar contenido por usuario
4. ✅ Implementar permisos y ownership de recursos
5. ✅ Crear dashboards personalizados por usuario

¡El sistema de usuarios está completamente funcional! 🎉
