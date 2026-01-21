/**
 * Middleware de Next.js
 * Old Texas BBQ - CRM
 *
 * Protección de rutas y verificación de sesión JWT
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Nombre de la cookie de sesión
const SESSION_COOKIE_NAME = 'session';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/login(?:\/)??$/,
  /^\/unauthorized(?:\/)??$/,
  /^\/public\//,
  /^\/api\/auth\//, // API de auth es pública
];

// Rutas de API que requieren autenticación
const PROTECTED_API_PATHS: RegExp[] = [
  /^\/api\/productos/,
  /^\/api\/upload/,
  /^\/api\/pedidos/,
  /^\/api\/clientes/,
  /^\/api\/caja/,
];

// Rutas /dev/* solo permitidas en desarrollo
const DEV_PATHS: RegExp[] = [/^\/dev\//];

/**
 * Obtiene la clave secreta para verificar JWTs
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      return new TextEncoder().encode('dev-secret-key-no-usar-en-produccion');
    }
    throw new Error('SESSION_SECRET no está configurado');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Verifica el token de sesión
 */
async function verifyToken(token: string) {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'old-texas-bbq-crm',
      audience: 'old-texas-bbq-crm',
    });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bloquear rutas /dev/* en producción
  if (DEV_PATHS.some((re) => re.test(pathname))) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return NextResponse.next();
  }

  // Permitir rutas públicas
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  // Obtener token de sesión
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const token = sessionCookie?.value;

  // Verificar si es una ruta de API protegida
  const isProtectedAPI = PROTECTED_API_PATHS.some((re) => re.test(pathname));

  if (isProtectedAPI) {
    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Sesión inválida o expirada' },
        { status: 401 }
      );
    }

    // Agregar información del usuario a los headers para las API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', payload.email as string);
    requestHeaders.set('x-user-nombre', payload.nombre as string);
    requestHeaders.set('x-user-rol', payload.rol as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Para rutas de páginas protegidas
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Token inválido, redirigir a login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    // Eliminar cookie inválida
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};
