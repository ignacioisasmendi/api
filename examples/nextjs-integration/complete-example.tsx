/**
 * Ejemplo Completo de Integración Next.js → NestJS
 * 
 * Este archivo contiene ejemplos completos y funcionales para ambos routers de Next.js.
 * Copia las secciones que necesites a tu proyecto.
 */

// ============================================================================
// CONFIGURACIÓN INICIAL
// ============================================================================

/**
 * 1. Instalar dependencias:
 * 
 * npm install @auth0/nextjs-auth0
 */

/**
 * 2. Configurar variables de entorno (.env.local):
 * 
 * AUTH0_SECRET='genera-con-openssl-rand-hex-32'
 * AUTH0_BASE_URL='http://localhost:3000'
 * AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
 * AUTH0_CLIENT_ID='tu_client_id'
 * AUTH0_CLIENT_SECRET='tu_client_secret'
 * AUTH0_AUDIENCE='https://your-api-audience.com'
 * NESTJS_API_URL='http://localhost:5000'
 */

// ============================================================================
// APP ROUTER (Next.js 13+)
// ============================================================================

// ----------------------------------------------------------------------------
// app/api/auth/[auth0]/route.ts
// Maneja el login, logout y callback de Auth0
// ----------------------------------------------------------------------------

import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();

// ----------------------------------------------------------------------------
// lib/nestjs-client.ts
// Cliente para hacer peticiones al API de NestJS
// (Copia el archivo nestjs-client.ts completo aquí)
// ----------------------------------------------------------------------------

// Ver: nestjs-client.ts en este directorio

// ----------------------------------------------------------------------------
// app/api/publications/route.ts
// Route Handler para proxy de peticiones al NestJS API
// ----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

// GET /api/publications
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(`${NESTJS_API_URL}/api/publications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching publications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/publications
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${NESTJS_API_URL}/api/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating publication:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// app/api/publications/[id]/route.ts
// Route Handler para operaciones sobre una publicación específica
// ----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

// GET /api/publications/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${NESTJS_API_URL}/api/publications/${params.id}`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching publication:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/publications/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${NESTJS_API_URL}/api/publications/${params.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating publication:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${NESTJS_API_URL}/api/publications/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json({ message: 'Publication deleted' });
  } catch (error) {
    console.error('Error deleting publication:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// app/actions/publications.ts
// Server Actions para manejo de publicaciones
// ----------------------------------------------------------------------------

'use server';

import { NestJSClient } from '@/lib/nestjs-client';
import { revalidatePath } from 'next/cache';

export async function getPublications() {
  const client = await NestJSClient.fromSession();
  return await client.get('/api/publications');
}

export async function getPublication(id: string) {
  const client = await NestJSClient.fromSession();
  return await client.get(`/api/publications/${id}`);
}

export async function createPublication(formData: FormData) {
  const client = await NestJSClient.fromSession();
  
  const publication = await client.post('/api/publications', {
    title: formData.get('title'),
    content: formData.get('content'),
    platforms: formData.getAll('platforms'),
    scheduledFor: formData.get('scheduledFor'),
  });

  revalidatePath('/publications');
  return publication;
}

export async function updatePublication(id: string, formData: FormData) {
  const client = await NestJSClient.fromSession();
  
  const publication = await client.put(`/api/publications/${id}`, {
    title: formData.get('title'),
    content: formData.get('content'),
    platforms: formData.getAll('platforms'),
    scheduledFor: formData.get('scheduledFor'),
  });

  revalidatePath('/publications');
  revalidatePath(`/publications/${id}`);
  return publication;
}

export async function deletePublication(id: string) {
  const client = await NestJSClient.fromSession();
  await client.delete(`/api/publications/${id}`);
  revalidatePath('/publications');
}

// ----------------------------------------------------------------------------
// app/publications/page.tsx
// Página que lista todas las publicaciones (Server Component)
// ----------------------------------------------------------------------------

import { getPublications } from '@/app/actions/publications';
import PublicationCard from '@/components/PublicationCard';

export default async function PublicationsPage() {
  const publications = await getPublications();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Publicaciones</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {publications.map((publication: any) => (
          <PublicationCard key={publication.id} publication={publication} />
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// components/CreatePublicationForm.tsx
// Formulario para crear publicaciones (Client Component)
// ----------------------------------------------------------------------------

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePublicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      
      const response = await fetch('/api/publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.get('title'),
          content: formData.get('content'),
          platforms: formData.getAll('platforms'),
          scheduledFor: formData.get('scheduledFor'),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create publication');
      }

      const publication = await response.json();
      console.log('Created publication:', publication);
      
      // Redirigir a la lista de publicaciones
      router.push('/publications');
      router.refresh();
    } catch (err) {
      console.error('Error creating publication:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Título
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Título de la publicación"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-2">
          Contenido
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={6}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Escribe tu contenido aquí..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Plataformas
        </label>
        <div className="space-y-2">
          {['facebook', 'instagram', 'tiktok', 'x'].map((platform) => (
            <label key={platform} className="flex items-center">
              <input
                type="checkbox"
                name="platforms"
                value={platform}
                className="mr-2"
              />
              <span className="capitalize">{platform}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="scheduledFor" className="block text-sm font-medium mb-2">
          Programar para (opcional)
        </label>
        <input
          type="datetime-local"
          id="scheduledFor"
          name="scheduledFor"
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Creando...' : 'Crear Publicación'}
      </button>
    </form>
  );
}

// ============================================================================
// PAGES ROUTER (Next.js tradicional)
// ============================================================================

// ----------------------------------------------------------------------------
// pages/api/auth/[...auth0].ts
// Maneja el login, logout y callback de Auth0
// ----------------------------------------------------------------------------

import { handleAuth } from '@auth0/nextjs-auth0';

export default handleAuth();

// ----------------------------------------------------------------------------
// pages/api/publications/index.ts
// API Route para listar y crear publicaciones
// ----------------------------------------------------------------------------

import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Obtener el access token del usuario autenticado
    const { accessToken } = await getAccessToken(req, res);

    if (req.method === 'GET') {
      // Listar publicaciones
      const response = await fetch(`${NESTJS_API_URL}/api/publications`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Crear publicación
      const response = await fetch(`${NESTJS_API_URL}/api/publications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
      }

      const data = await response.json();
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in publications API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withApiAuthRequired(handler);

// ----------------------------------------------------------------------------
// pages/api/publications/[id].ts
// API Route para operaciones sobre una publicación específica
// ----------------------------------------------------------------------------

import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';

const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:5000';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const { accessToken } = await getAccessToken(req, res);

    const url = `${NESTJS_API_URL}/api/publications/${id}`;

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: req.method !== 'GET' && req.method !== 'DELETE'
        ? JSON.stringify(req.body)
        : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    if (req.method === 'DELETE') {
      return res.status(200).json({ message: 'Publication deleted' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in publication API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withApiAuthRequired(handler);

// ----------------------------------------------------------------------------
// pages/publications/index.tsx
// Página que lista todas las publicaciones
// ----------------------------------------------------------------------------

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PublicationsPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
      return;
    }

    if (user) {
      fetchPublications();
    }
  }, [user, isLoading]);

  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/publications');
      if (response.ok) {
        const data = await response.json();
        setPublications(data);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Publicaciones</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {publications.map((publication) => (
          <div key={publication.id} className="border rounded p-4">
            <h2 className="text-xl font-semibold">{publication.title}</h2>
            <p className="text-gray-600">{publication.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HOOKS ÚTILES
// ============================================================================

// ----------------------------------------------------------------------------
// hooks/usePublications.ts
// Hook para manejar publicaciones en Client Components
// ----------------------------------------------------------------------------

import { useState, useEffect } from 'react';

export function usePublications() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/publications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch publications');
      }

      const data = await response.json();
      setPublications(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createPublication = async (data: any) => {
    const response = await fetch('/api/publications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create publication');
    }

    const publication = await response.json();
    setPublications([...publications, publication]);
    return publication;
  };

  const updatePublication = async (id: string, data: any) => {
    const response = await fetch(`/api/publications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update publication');
    }

    const updated = await response.json();
    setPublications(publications.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deletePublication = async (id: string) => {
    const response = await fetch(`/api/publications/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete publication');
    }

    setPublications(publications.filter(p => p.id !== id));
  };

  return {
    publications,
    loading,
    error,
    fetchPublications,
    createPublication,
    updatePublication,
    deletePublication,
  };
}
