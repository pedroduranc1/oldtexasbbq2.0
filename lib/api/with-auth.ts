/**
 * Higher-Order Function para proteger API Routes
 * Old Texas BBQ - CRM
 *
 * Proporciona autenticación y autorización por roles para API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { type Rol } from '@/lib/types/firestore';

/**
 * Información del usuario extraída de los headers (poblados por middleware)
 */
export interface AuthUser {
  userId: string;
  email: string;
  nombre: string;
  rol: Rol;
}

/**
 * Request extendido con información de autenticación
 */
export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

/**
 * Opciones para el wrapper de autenticación
 */
export interface WithAuthOptions {
  /** Roles permitidos para acceder a esta ruta */
  roles?: Rol[];
}

/**
 * Handler de API route con autenticación
 */
type AuthHandler = (
  request: NextRequest,
  user: AuthUser,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

/**
 * Extrae la información del usuario de los headers de la request
 * Los headers son poblados por el middleware después de verificar el JWT
 */
export function getUserFromRequest(request: NextRequest): AuthUser | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const nombre = request.headers.get('x-user-nombre');
  const rol = request.headers.get('x-user-rol') as Rol;

  if (!userId || !email || !nombre || !rol) {
    return null;
  }

  return { userId, email, nombre, rol };
}

/**
 * HOF para proteger API routes con autenticación y autorización
 *
 * @example
 * // Requiere autenticación (cualquier rol)
 * export const GET = withAuth(async (req, user) => {
 *   return NextResponse.json({ data: 'protected' });
 * });
 *
 * @example
 * // Requiere rol específico
 * export const POST = withAuth(
 *   async (req, user) => {
 *     return NextResponse.json({ data: 'admin only' });
 *   },
 *   { roles: ['admin'] }
 * );
 */
export function withAuth(handler: AuthHandler, options?: WithAuthOptions) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    // Obtener usuario de headers (poblados por middleware)
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar rol si se especificaron roles permitidos
    if (options?.roles && options.roles.length > 0) {
      if (!options.roles.includes(user.rol)) {
        return NextResponse.json(
          {
            error: 'No autorizado',
            message: `Se requiere uno de los siguientes roles: ${options.roles.join(', ')}`,
          },
          { status: 403 }
        );
      }
    }

    // Ejecutar el handler con el usuario autenticado
    return handler(request, user, context);
  };
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(user: AuthUser, allowedRoles: Rol[]): boolean {
  return allowedRoles.includes(user.rol);
}

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(user: AuthUser): boolean {
  return user.rol === 'admin';
}

/**
 * Verifica si el usuario puede gestionar productos
 */
export function canManageProducts(user: AuthUser): boolean {
  return hasRole(user, ['admin', 'encargado']);
}

/**
 * Verifica si el usuario puede gestionar pedidos
 */
export function canManageOrders(user: AuthUser): boolean {
  return hasRole(user, ['admin', 'encargado', 'cajera']);
}

/**
 * Verifica si el usuario puede ver reportes
 */
export function canViewReports(user: AuthUser): boolean {
  return hasRole(user, ['admin', 'encargado']);
}
