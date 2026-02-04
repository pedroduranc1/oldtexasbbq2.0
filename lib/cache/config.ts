/**
 * Configuración de estrategias de caché para Old Texas BBQ CRM
 *
 * Estrategias implementadas:
 * 1. Static assets (JS, CSS, imágenes) - Cache inmutable (1 año)
 * 2. API responses - Cache con revalidación
 * 3. Firestore queries - Cache en memoria con Zustand
 * 4. Imágenes de Cloudinary - Cache con CDN
 */

// ================================================
// Constantes de tiempo de caché
// ================================================

export const CacheTTL = {
  // Sin caché
  NONE: 0,

  // Muy corto (datos en tiempo real)
  REALTIME: 0,

  // Corto (1 minuto) - para datos que cambian frecuentemente
  SHORT: 60,

  // Medio (5 minutos) - para listados
  MEDIUM: 300,

  // Largo (1 hora) - para datos semi-estáticos
  LONG: 3600,

  // Muy largo (24 horas) - para configuraciones
  VERY_LONG: 86400,

  // Inmutable (1 año) - para assets estáticos
  IMMUTABLE: 31536000,
} as const;

// ================================================
// Headers de caché para API routes
// ================================================

export function getCacheHeaders(
  ttl: number,
  options?: {
    private?: boolean;
    staleWhileRevalidate?: number;
    staleIfError?: number;
  }
): HeadersInit {
  if (ttl === 0) {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    };
  }

  const directives: string[] = [];

  // Público o privado
  directives.push(options?.private ? 'private' : 'public');

  // Max age
  directives.push(`max-age=${ttl}`);

  // Stale while revalidate (servir contenido viejo mientras se actualiza)
  if (options?.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  // Stale if error (servir contenido viejo si hay error)
  if (options?.staleIfError) {
    directives.push(`stale-if-error=${options.staleIfError}`);
  }

  return {
    'Cache-Control': directives.join(', '),
  };
}

// ================================================
// Presets de caché para diferentes tipos de datos
// ================================================

export const CachePresets = {
  // Sin caché - para datos sensibles o en tiempo real
  noCache: () => getCacheHeaders(CacheTTL.NONE),

  // Datos de usuario (privados, corta duración)
  userData: () =>
    getCacheHeaders(CacheTTL.SHORT, {
      private: true,
      staleWhileRevalidate: CacheTTL.MEDIUM,
    }),

  // Listados (públicos, media duración)
  listData: () =>
    getCacheHeaders(CacheTTL.MEDIUM, {
      staleWhileRevalidate: CacheTTL.LONG,
    }),

  // Productos (públicos, larga duración)
  productData: () =>
    getCacheHeaders(CacheTTL.LONG, {
      staleWhileRevalidate: CacheTTL.VERY_LONG,
    }),

  // Configuraciones (muy larga duración)
  configData: () =>
    getCacheHeaders(CacheTTL.VERY_LONG, {
      staleWhileRevalidate: CacheTTL.IMMUTABLE,
    }),

  // Assets estáticos (inmutable)
  staticAsset: () =>
    getCacheHeaders(CacheTTL.IMMUTABLE),
};

// ================================================
// Cache en memoria simple para cliente
// ================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number = CacheTTL.MEDIUM): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convertir a milisegundos
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia singleton
export const memoryCache = new MemoryCache();

// Limpiar caché cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => memoryCache.cleanup(), 5 * 60 * 1000);
}

// ================================================
// Helper para fetch con caché
// ================================================

export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit & { cacheTTL?: number }
): Promise<T> {
  const cacheKey = `fetch:${url}`;
  const { cacheTTL = CacheTTL.MEDIUM, ...fetchOptions } = options || {};

  // Intentar obtener de caché
  const cached = memoryCache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Hacer fetch
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  // Guardar en caché
  memoryCache.set(cacheKey, data, cacheTTL);

  return data;
}

// ================================================
// Revalidación de caché (para Next.js)
// ================================================

export const revalidateTags = {
  productos: 'productos',
  pedidos: 'pedidos',
  usuarios: 'usuarios',
  configuracion: 'configuracion',
  turnos: 'turnos',
  reportes: 'reportes',
} as const;

export type RevalidateTag = (typeof revalidateTags)[keyof typeof revalidateTags];
