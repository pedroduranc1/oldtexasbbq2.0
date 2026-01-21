/**
 * JWT Utilities para Autenticación Server-Side
 * Old Texas BBQ - CRM
 *
 * Usa jose para firmar y verificar JWTs sin Firebase Admin
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { type Rol } from '@/lib/types/firestore';

// Tipo del payload de sesión
export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: Rol;
}

// Tiempo de expiración: 7 días
const EXPIRATION_TIME = '7d';

/**
 * Obtiene la clave secreta para firmar JWTs
 * En producción debe ser una variable de entorno segura
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    // En desarrollo, usar una clave por defecto (NO usar en producción)
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ SESSION_SECRET no configurado. Usando clave por defecto (solo desarrollo)'
      );
      return new TextEncoder().encode('dev-secret-key-no-usar-en-produccion');
    }
    throw new Error('SESSION_SECRET no está configurado');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Crea un JWT firmado con los datos de sesión del usuario
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>
): Promise<string> {
  const secret = getSecretKey();

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    nombre: payload.nombre,
    rol: payload.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION_TIME)
    .setIssuer('old-texas-bbq-crm')
    .setAudience('old-texas-bbq-crm')
    .sign(secret);

  return token;
}

/**
 * Verifica y decodifica un JWT
 * Retorna el payload si es válido, null si no
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getSecretKey();

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'old-texas-bbq-crm',
      audience: 'old-texas-bbq-crm',
    });

    // Validar que tiene los campos requeridos
    if (
      !payload.userId ||
      !payload.email ||
      !payload.nombre ||
      !payload.rol
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch (error) {
    // Token inválido o expirado
    return null;
  }
}

/**
 * Decodifica un JWT sin verificar (para debug)
 * NO usar para autenticación
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    return payload;
  } catch {
    return null;
  }
}
