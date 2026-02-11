# 📚 Índice de Documentación - Planner API

## 🎯 Documentación Principal

### Autenticación y Integración

1. **[AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)** ⭐ **COMIENZA AQUÍ**
   - Respuesta directa a tu pregunta sobre tokens
   - Explicación del flujo completo
   - Troubleshooting

2. **[NEXTJS_INTEGRATION_GUIDE.md](./NEXTJS_INTEGRATION_GUIDE.md)**
   - Guía completa de integración con Next.js
   - Token forwarding explicado
   - Ejemplos de implementación
   - Configuración paso a paso

3. **[AUTH_GUIDE.md](./AUTH_GUIDE.md)**
   - Guía general de autenticación
   - Configuración de Auth0
   - Guards y decorators

4. **[AUTH_IMPLEMENTATION_SUMMARY.md](./AUTH_IMPLEMENTATION_SUMMARY.md)**
   - Resumen de la implementación de autenticación
   - Auto-provisioning de usuarios

### Arquitectura y Configuración

5. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - Arquitectura general del proyecto
   - Módulos y estructura

6. **[CONFIGURATION.md](./CONFIGURATION.md)**
   - Variables de entorno
   - Configuración general

7. **[FLOW_DIAGRAMS.md](./FLOW_DIAGRAMS.md)**
   - Diagramas de flujo del sistema

### Base de Datos

8. **[PRISMA_SETUP.md](./PRISMA_SETUP.md)**
   - Configuración de Prisma
   - Migraciones

9. **[USER_AUTO_PROVISIONING.md](./USER_AUTO_PROVISIONING.md)**
   - Auto-provisioning de usuarios
   - Integración con Auth0

### Funcionalidades

10. **[LINK_STORAGE_GUIDE.md](./LINK_STORAGE_GUIDE.md)**
    - Almacenamiento de links de publicaciones
    - Gestión de URLs de redes sociales

11. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
    - Resumen de implementación general

### Quick Start

12. **[QUICKSTART.md](./QUICKSTART.md)**
    - Inicio rápido
    - Comandos básicos

13. **[README.md](./README.md)**
    - Introducción al proyecto
    - Instalación y setup

## 🚀 Ejemplos e Integración con Next.js

### Directorio: `examples/nextjs-integration/`

1. **[QUICK_START.md](./examples/nextjs-integration/QUICK_START.md)** ⚡
   - Integración más rápida (5 minutos)
   - Código mínimo necesario
   - Troubleshooting común

2. **[README.md](./examples/nextjs-integration/README.md)**
   - Arquitectura detallada con diagramas
   - Explicación del flujo completo
   - Ejemplos de uso
   - FAQ exhaustivo

3. **[nestjs-client.ts](./examples/nextjs-integration/nestjs-client.ts)**
   - Cliente listo para usar en Next.js
   - Funciona con App Router y Pages Router
   - Manejo de errores incluido
   - TypeScript types

4. **[complete-example.tsx](./examples/nextjs-integration/complete-example.tsx)**
   - Ejemplos copy-paste completos
   - App Router (Next.js 13+)
   - Pages Router (Next.js tradicional)
   - Hooks y componentes

5. **[auth0-setup-guide.md](./examples/nextjs-integration/auth0-setup-guide.md)**
   - Configuración de Auth0 paso a paso
   - Screenshots y explicaciones
   - Troubleshooting de Auth0

6. **[.env.nextjs.example](./examples/nextjs-integration/.env.nextjs.example)**
   - Variables de entorno para Next.js
   - Comentarios explicativos
   - Valores de ejemplo

## 🎯 Guía de Lectura Recomendada

### Para tu pregunta específica:

```
1. AUTHENTICATION_FLOW.md          ← Lee ESTO primero
   ↓
2. QUICK_START.md                  ← Implementación rápida
   ↓
3. nestjs-client.ts                ← Copia este archivo
   ↓
4. complete-example.tsx            ← Usa estos ejemplos
```

### Para entender toda la arquitectura:

```
1. README.md                       ← Introducción
   ↓
2. ARCHITECTURE.md                 ← Estructura general
   ↓
3. AUTHENTICATION_FLOW.md          ← Flujo de autenticación
   ↓
4. NEXTJS_INTEGRATION_GUIDE.md     ← Integración completa
   ↓
5. examples/nextjs-integration/    ← Ejemplos prácticos
```

### Para configurar desde cero:

```
1. QUICKSTART.md                   ← Setup del proyecto
   ↓
2. PRISMA_SETUP.md                 ← Base de datos
   ↓
3. auth0-setup-guide.md            ← Auth0 Dashboard
   ↓
4. CONFIGURATION.md                ← Variables de entorno
   ↓
5. QUICK_START.md                  ← Integración Next.js
```

## 🔍 Buscar por Tema

### Autenticación
- `AUTHENTICATION_FLOW.md` - Flujo completo
- `AUTH_GUIDE.md` - Guía general
- `auth0-setup-guide.md` - Configuración Auth0

### Next.js
- `NEXTJS_INTEGRATION_GUIDE.md` - Guía completa
- `QUICK_START.md` - Inicio rápido
- `complete-example.tsx` - Ejemplos

### Base de Datos
- `PRISMA_SETUP.md` - Configuración Prisma
- `USER_AUTO_PROVISIONING.md` - Auto-provisioning

### Publicaciones
- `LINK_STORAGE_GUIDE.md` - Almacenamiento de links
- `FLOW_DIAGRAMS.md` - Flujos de publicación

### Configuración
- `CONFIGURATION.md` - Variables de entorno
- `.env.nextjs.example` - Ejemplo Next.js
- `.env.example` - Ejemplo NestJS (si existe)

## 📝 Interceptor de Logging

### Documentación:
- `src/interceptors/README.md` - Logging interceptor

El interceptor de logging ya está configurado y registra:
- ✅ Requests entrantes (headers, body, query params)
- ✅ Responses salientes (headers, body, status code)
- ✅ Tiempos de respuesta
- ✅ Sanitización de información sensible

## 🆘 Troubleshooting

### Token no llega a NestJS
👉 `AUTHENTICATION_FLOW.md` → Sección "Troubleshooting"

### Error "Invalid audience"
👉 `NEXTJS_INTEGRATION_GUIDE.md` → Sección "Troubleshooting"

### No puedo configurar Auth0
👉 `auth0-setup-guide.md` → Paso a paso completo

### Error en Next.js
👉 `QUICK_START.md` → Sección "Problemas Comunes"

### Error de Prisma
👉 `PRISMA_SETUP.md`

## 🎓 Conceptos Clave

### Token Forwarding
Ver: `AUTHENTICATION_FLOW.md`, `NEXTJS_INTEGRATION_GUIDE.md`

### Auto-provisioning
Ver: `USER_AUTO_PROVISIONING.md`, `AUTH_IMPLEMENTATION_SUMMARY.md`

### Guards y Decorators
Ver: `AUTH_GUIDE.md`

### Prisma y Base de Datos
Ver: `PRISMA_SETUP.md`

## 📊 Archivos de Código

### Autenticación
- `src/auth/auth0.guard.ts` - Guard de Auth0
- `src/auth/auth.module.ts` - Módulo de autenticación
- `src/decorators/get-user.decorator.ts` - Decorator para obtener usuario
- `src/decorators/public.decorator.ts` - Decorator para rutas públicas

### Usuarios
- `src/users/user.service.ts` - Servicio de usuarios
- `src/users/user.controller.ts` - Controller de usuarios
- `src/users/user.module.ts` - Módulo de usuarios

### Publicaciones
- `src/publications/publication.service.ts` - Servicio de publicaciones
- `src/publications/publication.controller.ts` - Controller de publicaciones
- `src/publications/publication.module.ts` - Módulo de publicaciones

### Interceptors
- `src/interceptors/logging.interceptor.ts` - Logging interceptor

### Configuración
- `src/config/auth.config.ts` - Configuración de Auth0
- `src/config/database.config.ts` - Configuración de base de datos
- `src/main.ts` - Punto de entrada

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Base de datos
npx prisma migrate dev
npx prisma studio
npx prisma generate

# Tests
npm run test
npm run test:e2e

# Linting
npm run lint
npm run format
```

## 🎯 Para Responder Tu Pregunta

> "Estoy usando Next.js como frontend. Los llamados a esta API están siendo desde la parte de backend de Next.js, entonces el token lo obtengo desde el backend de Next.js. Mi pregunta es, ¿necesito mandar el token de auth0 a esta API siendo que ya lo obtuvo Next.js? ¿Cuál es la buena práctica?"

**Respuesta rápida**: 
**SÍ, debes enviar el token**. Lee `AUTHENTICATION_FLOW.md` para la explicación completa.

**Implementación rápida**: 
`QUICK_START.md` → 5 minutos

**Guía completa**: 
`NEXTJS_INTEGRATION_GUIDE.md` → Todo lo que necesitas saber

---

## 📞 Estructura de Archivos Creados

```
planer/api/
├── AUTHENTICATION_FLOW.md          ⭐ Lee esto primero
├── NEXTJS_INTEGRATION_GUIDE.md     ⭐ Guía completa
├── DOCS_INDEX.md                   ← Estás aquí
├── examples/
│   └── nextjs-integration/
│       ├── QUICK_START.md          ⭐ Inicio rápido
│       ├── README.md               
│       ├── nestjs-client.ts        ⭐ Copia este archivo
│       ├── complete-example.tsx    ⭐ Ejemplos copy-paste
│       ├── auth0-setup-guide.md    
│       └── .env.nextjs.example     
└── src/
    └── interceptors/
        ├── logging.interceptor.ts  ← Nuevo interceptor
        ├── index.ts                
        └── README.md               ← Documentación del interceptor
```

## ✅ Todo Listo

Tu API de NestJS ya está completamente configurada con:
- ✅ Auth0Guard funcionando
- ✅ Auto-provisioning de usuarios
- ✅ Logging interceptor
- ✅ Documentación completa
- ✅ Ejemplos de integración con Next.js

**Solo necesitas**: Enviar el token desde Next.js usando los ejemplos proporcionados. 🚀
