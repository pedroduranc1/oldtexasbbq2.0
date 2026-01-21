/**
 * API Route: /api/auth/me
 * Old Texas BBQ - CRM
 *
 * GET: Obtener información del usuario actual desde la sesión
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/auth/me
 * Retorna la información del usuario autenticado
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Retornar datos del usuario (sin información sensible)
    return NextResponse.json({
      userId: session.userId,
      email: session.email,
      nombre: session.nombre,
      rol: session.rol,
    });
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
