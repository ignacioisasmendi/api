# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev          # Watch mode with auto-reload
npm run start:debug        # Debug mode with inspector

# Build
npm run build              # prisma generate && nest build → /dist

# Testing
npm run test               # Jest unit tests
npm run test -- --testPathPattern=users   # Run tests matching pattern
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests (test/jest-e2e.json)

# Code quality
npm run lint               # ESLint with --fix
npm run format             # Prettier

# Database
npm run prisma:migrate     # Run migrations (dev mode)
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:studio      # Prisma Studio UI
```

## Architecture

NestJS 11 API for a social media scheduling platform. Multi-tenant: User → Clients → SocialAccounts/Content/Calendars.

### Request lifecycle (global providers)

1. **Auth0Guard** (APP_GUARD) — validates JWT via Auth0 JWKS, auto-provisions users on first login. Bypass with `@IsPublic()`.
2. **ThrottlerGuard** (APP_GUARD) — 60 req/min, 1000 req/hour.
3. **LoggingInterceptor** (APP_INTERCEPTOR) — logs method, URL, status, duration, user email.
4. **ClientInterceptor** (APP_INTERCEPTOR) — reads `X-Client-Id` header, validates ownership, stores in CLS. Falls back to user's first client. Bypass with `@SkipClientValidation()`.
5. **ValidationPipe** (global) — `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

### Key decorators (src/decorators/)

- `@IsPublic()` — bypass Auth0Guard
- `@SkipClientValidation()` — bypass ClientInterceptor
- `@GetUser()` — inject User from CLS context
- `@GetClientId()` — inject client ID from CLS context

### Multi-tenancy ownership pattern

Always use relation filters instead of two queries:
```typescript
this.prisma.publication.findFirst({ where: { id, content: { clientId } } })
```

### Pagination

All list endpoints use `PaginationDto` from `src/common/dto/pagination.dto.ts`. Response shape: `{ data: T[], meta: { total, page, limit, totalPages } }`.

### Publishers

`IPlatformPublisher.publish(publication)` receives full relations — never re-fetch from DB inside a publisher. `PublicationWithRelations` and `PUBLICATION_FULL_INCLUDE` exported from `src/publications/publication.service.ts`. `PUBLICATION_SELECT` strips tokens for API responses.

### Module structure

Each feature follows: `module.ts`, `service.ts`, `controller.ts`, `dto/*.dto.ts`. Tests colocated as `*.spec.ts`.

### Key modules

- `src/publishers/` — platform publisher interface + factory
- `src/cron/` — scheduled publishing (batch size via `CRON_BATCH_SIZE` env) + share link cleanup
- `src/shared/storage/` — Cloudflare R2 presigned URLs (global module)
- `src/oauth/instagram/`, `src/oauth/tiktok/` — OAuth callback flows
- `src/public-share/` — public calendar view (no auth, `@IsPublic()`)
- `src/analytics-report/` — POST `/analytics-report`, generates PDF with IG insights + charts → R2 signed URL
- `src/instagram-insights/` — Instagram Insights API wrapper (exports `InstagramInsightsService`)
- `src/engagement/` — engagement tracking
- `src/kanban-columns/` — kanban board column management
- `src/campaigns/` — campaign management
- `src/pexels/` — Pexels stock media search

### Global prefix

The `/v1` global prefix is **commented out** in `src/main.ts`. All routes have **no prefix**.

### Configuration

Namespaced configs in `src/config/`: `app`, `auth`, `database`, `instagram`, `tiktok`, `cron`, `encryption`, `facebook`, `pexels`, `x`. Access via `configService.get<T>('namespace.key')`. CORS origins are comma-separated in `CORS_ORIGINS` env.

## Code style

- Prettier: single quotes, trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` is off
- DTOs use `class-validator` + `class-transformer` decorators
