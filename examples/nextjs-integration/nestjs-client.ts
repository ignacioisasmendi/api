/**
 * NestJS API Client for Next.js
 * 
 * Este archivo va en tu proyecto de Next.js
 * Ubicación sugerida: lib/nestjs-client.ts o utils/api-client.ts
 */

import { getAccessToken, getSession } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

// ============================================================================
// Para App Router (Next.js 13+)
// ============================================================================

/**
 * Cliente API para App Router
 * Automáticamente incluye el token de Auth0 en las peticiones
 */
export class NestJSClient {
  private baseUrl: string;
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.baseUrl = NESTJS_API_URL;
    this.accessToken = accessToken;
  }

  /**
   * Crear una instancia del cliente con el token de la sesión actual
   */
  static async fromSession(): Promise<NestJSClient> {
    const session = await getSession();
    
    if (!session) {
      throw new Error('No session found. User must be authenticated.');
    }

    return new NestJSClient(session.accessToken);
  }

  /**
   * Hacer una petición al API de NestJS
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && {
          'Authorization': `Bearer ${this.accessToken}`,
        }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new APIError(error.message || 'Request failed', response.status, error);
    }

    return response.json();
  }

  // Métodos de conveniencia
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Error personalizado para errores del API
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// ============================================================================
// Para Pages Router (Next.js tradicional)
// ============================================================================

/**
 * Helper para hacer peticiones al NestJS API desde Pages Router
 */
export async function nestjsRequest<T = any>(
  req: NextApiRequest,
  res: NextApiResponse,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    // Obtener el access token del usuario autenticado
    const { accessToken } = await getAccessToken(req, res);

    const url = `${NESTJS_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new APIError(error.message || 'Request failed', response.status, error);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error',
      500,
    );
  }
}

// ============================================================================
// Ejemplos de Uso
// ============================================================================

/**
 * EJEMPLO 1: App Router - Server Component
 * 
 * app/publications/page.tsx
 */
/*
import { NestJSClient } from '@/lib/nestjs-client';

export default async function PublicationsPage() {
  const client = await NestJSClient.fromSession();
  const publications = await client.get('/api/publications');

  return (
    <div>
      {publications.map((pub: any) => (
        <div key={pub.id}>{pub.title}</div>
      ))}
    </div>
  );
}
*/

/**
 * EJEMPLO 2: App Router - Server Action
 * 
 * app/actions/publications.ts
 */
/*
'use server';

import { NestJSClient } from '@/lib/nestjs-client';

export async function createPublication(formData: FormData) {
  const client = await NestJSClient.fromSession();
  
  const publication = await client.post('/api/publications', {
    title: formData.get('title'),
    content: formData.get('content'),
    platforms: ['facebook', 'instagram'],
  });

  return publication;
}
*/

/**
 * EJEMPLO 3: App Router - Route Handler
 * 
 * app/api/publications/route.ts
 */
/*
import { NextResponse } from 'next/server';
import { NestJSClient } from '@/lib/nestjs-client';

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
*/

/**
 * EJEMPLO 4: Pages Router - API Route
 * 
 * pages/api/publications/create.ts
 */
/*
import { withApiAuthRequired } from '@auth0/nextjs-auth0';
import { nestjsRequest } from '@/lib/nestjs-client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withApiAuthRequired(async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
*/

/**
 * EJEMPLO 5: Client Component con Route Handler
 * 
 * app/components/CreatePublicationForm.tsx
 */
/*
'use client';

import { useState } from 'react';

export default function CreatePublicationForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Llamar a tu Route Handler de Next.js
      const response = await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          content: formData.get('content'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create publication');
      }

      const publication = await response.json();
      console.log('Created:', publication);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Publication'}
      </button>
    </form>
  );
}
*/
