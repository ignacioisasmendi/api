# Prisma Setup Guide

## Overview

This project uses Prisma as the ORM for managing the database schema and queries.

## Database Schema

The `Post` model is designed for scheduling social media posts with the following structure:

```prisma
model Post {
  id        String     @id @default(cuid())
  caption   String
  mediaUrl  String
  publishAt DateTime
  status    PostStatus @default(SCHEDULED)
  error     String?
  createdAt DateTime   @default(now())
}

enum PostStatus {
  SCHEDULED   // Post is scheduled for future publishing
  PUBLISHING  // Post is currently being published
  PUBLISHED   // Post has been successfully published
  ERROR       // An error occurred during publishing
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@prisma/client` - Prisma Client for database queries
- `prisma` - Prisma CLI (dev dependency)

### 2. Configure Database Connection

Create a `.env` file in the project root with your database connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/poster_db?schema=public"
```

**Supported Databases:**
- PostgreSQL (default in schema)
- MySQL
- SQLite
- SQL Server
- MongoDB
- CockroachDB

To change the database provider, edit `prisma/schema.prisma` and update the `provider` field in the `datasource` block.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

### 4. Run Database Migration

```bash
npm run prisma:migrate
```

This will:
- Create the database tables
- Apply the schema to your database
- Regenerate the Prisma Client

You'll be prompted to name your migration (e.g., "init", "add_posts_table", etc.)

### 5. (Optional) Open Prisma Studio

Prisma Studio is a GUI for viewing and editing data in your database:

```bash
npm run prisma:studio
```

## Available Prisma Scripts

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Create and apply migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:seed` - Run seed script (if implemented)

## Using Prisma in Your Code

The `PrismaService` is globally available and can be injected into any service:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async createPost(data: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        caption: data.caption,
        mediaUrl: data.mediaUrl,
        publishAt: data.publishAt,
        status: 'SCHEDULED',
      },
    });
  }

  async getScheduledPosts() {
    return this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        publishAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        publishAt: 'asc',
      },
    });
  }

  async updatePostStatus(id: string, status: 'PUBLISHING' | 'PUBLISHED' | 'ERROR', error?: string) {
    return this.prisma.post.update({
      where: { id },
      data: {
        status,
        error,
      },
    });
  }
}
```

## Database Connection Examples

### PostgreSQL
```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

### MySQL
```
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
```

### SQLite
```
DATABASE_URL="file:./dev.db"
```

## Notes

- The `PrismaModule` is marked as `@Global()`, so you don't need to import it in every module
- The service automatically connects on module initialization and disconnects on module destruction
- Indexes are added on `publishAt` and `status` fields for query optimization
- The `error` field is optional and only used when status is 'ERROR'
