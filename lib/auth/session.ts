/**
 * Gestión de Sesiones Server-Side
 * Old Texas BBQ - CRM
 *
 * Maneja cookies de sesión httpOnly para seguridad
 */

import { cookies } from 'next/headers';
import { createSessionToken, verifySessionToken, type SessionPayload } from './jwt';
import { type Rol } from '@/lib/types/firestore';

// Nombre de la cookie de sesión
const SESSION_COOKIE_NAME = 'session';

// Configuración de la cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 días en segundos
};

/**
 * Datos requeridos para crear una sesión
 */
export interface CreateSessionData {
  userId: string;
  email: string;
  nombre: string;
  rol: Rol;
  [key: string]: string; // Index signature para compatibilidad con JWTPayload
}

/**
 * Crea una sesión y guarda la cookie
 */
export async function createSession(data: CreateSessionData): Promise<void> {
  const token = await createSessionToken(data);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Obtiene la sesión actual desde las cookies
 * Retorna null si no hay sesión válida
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySessionToken(sessionCookie.value);
}

/**
 * Destruye la sesión (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Verifica si hay una sesión activa
 */
export async function hasActiveSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Obtiene el token de sesión raw (para casos especiales)
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  return sessionCookie?.value || null;
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export async function hasRole(allowedRoles: Rol[]): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  return allowedRoles.includes(session.rol);
}

/**
 * Verifica si el usuario es administrador
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(['admin']);
}

/**
 * Verifica si el usuario puede gestionar productos
 */
export async function canManageProducts(): Promise<boolean> {
  return hasRole(['admin', 'encargado']);
}
