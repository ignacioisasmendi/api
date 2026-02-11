# Logging Interceptor

## Descripción

El `LoggingInterceptor` es un interceptor global de NestJS que registra automáticamente todas las requests HTTP entrantes y salientes, incluyendo sus headers, body, y tiempos de respuesta.

## Características

### 🔍 Request Logging
- **Método HTTP**: GET, POST, PUT, DELETE, etc.
- **URL completa**: Ruta y query parameters
- **Headers**: Todos los headers de la request (sanitizados)
- **Body**: Contenido del body (sanitizado)
- **Query params**: Parámetros de consulta
- **Route params**: Parámetros de ruta
- **IP del cliente**: Dirección IP de origen
- **User-Agent**: Información del navegador/cliente

### ✅ Response Logging
- **Status code**: Con emoji visual (✅ 2xx, ⚠️ 4xx, ❌ 5xx)
- **Tiempo de respuesta**: En milisegundos
- **Response headers**: Headers de la respuesta
- **Response body**: Contenido de la respuesta (sanitizado)

### 🛡️ Seguridad y Sanitización

El interceptor automáticamente **oculta información sensible** de los logs:

#### Headers Sensibles (Sanitizados):
- `authorization`
- `cookie`
- `x-api-key`
- `x-auth-token`

#### Campos del Body Sensibles (Sanitizados):
- `password`
- `token`
- `secret`
- `apiKey` / `api_key`
- `accessToken` / `access_token`
- `refreshToken` / `refresh_token`
- `creditCard` / `credit_card`
- `ssn`

Todos estos campos se mostrarán como `[REDACTED]` en los logs.

## Instalación

El interceptor ya está configurado globalmente en `main.ts`:

```typescript
import { LoggingInterceptor } from './interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable logging interceptor globally
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  await app.listen(process.env.PORT ?? 5000);
}
```

## Ejemplo de Uso

Una vez configurado, el interceptor funciona automáticamente en todas las rutas.

### Request Example:

```
╔═══════════════════════════════════════════════════════════════
║ INCOMING REQUEST
╠═══════════════════════════════════════════════════════════════
║ Method:      POST
║ URL:         /api/publications
║ IP:          192.168.1.100
║ User-Agent:  Mozilla/5.0...
╠═══════════════════════════════════════════════════════════════
║ QUERY PARAMS:
║ {}
╠═══════════════════════════════════════════════════════════════
║ ROUTE PARAMS:
║ {}
╠═══════════════════════════════════════════════════════════════
║ HEADERS:
║ {
║   "content-type": "application/json",
║   "authorization": "[REDACTED]",
║   "user-agent": "Mozilla/5.0..."
║ }
╠═══════════════════════════════════════════════════════════════
║ BODY:
║ {
║   "title": "Mi publicación",
║   "content": "Contenido de ejemplo",
║   "password": "[REDACTED]"
║ }
╚═══════════════════════════════════════════════════════════════
```

### Response Example:

```
╔═══════════════════════════════════════════════════════════════
║ OUTGOING RESPONSE ✅
╠═══════════════════════════════════════════════════════════════
║ Method:        POST
║ URL:           /api/publications
║ Status Code:   201
║ Response Time: 145ms
╠═══════════════════════════════════════════════════════════════
║ RESPONSE HEADERS:
║ {
║   "content-type": "application/json",
║   "x-powered-by": "Express"
║ }
╠═══════════════════════════════════════════════════════════════
║ RESPONSE BODY:
║ {
║   "id": 123,
║   "title": "Mi publicación",
║   "createdAt": "2026-01-29T..."
║ }
╚═══════════════════════════════════════════════════════════════
```

## Deshabilitar el Interceptor

Si necesitas deshabilitar el logging temporalmente, simplemente comenta la línea en `main.ts`:

```typescript
// app.useGlobalInterceptors(new LoggingInterceptor());
```

## Personalización

### Añadir más campos sensibles

Edita los arrays `sensitiveHeaders` y `sensitiveFields` en `logging.interceptor.ts`:

```typescript
const sensitiveHeaders = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'tu-header-personalizado', // Añade aquí
];

const sensitiveFields = [
  'password',
  'token',
  'secret',
  'tu-campo-personalizado', // Añade aquí
];
```

### Cambiar el formato de logs

Puedes modificar los métodos `logRequest()`, `logResponse()`, y `logErrorResponse()` para cambiar el formato de salida.

### Usar en rutas específicas

Si prefieres aplicarlo solo a ciertos controladores o rutas:

```typescript
@Controller('publications')
@UseInterceptors(LoggingInterceptor)
export class PublicationController {
  // ...
}
```

## Consideraciones de Rendimiento

- El interceptor añade un overhead mínimo (~1-5ms) por request
- Para producción con alto tráfico, considera:
  - Usar un nivel de log apropiado (solo errores)
  - Implementar sampling (loggear solo 1 de cada N requests)
  - Usar un sistema de logging externo (Winston, Pino)

## Logger de NestJS

El interceptor usa el Logger nativo de NestJS con el contexto `HTTP`, que se puede configurar en `main.ts`:

```typescript
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

## Troubleshooting

### No veo los logs

1. Verifica que el interceptor esté registrado en `main.ts`
2. Comprueba el nivel de logging de tu aplicación
3. Verifica que no haya otros interceptors que capturen las requests primero

### Los logs son demasiado verbosos

Puedes modificar el interceptor para:
- Loggear solo ciertos métodos HTTP
- Loggear solo ciertos status codes
- Reducir la cantidad de información mostrada
