/**
 * API Route: /api/auth/session
 * Old Texas BBQ - CRM
 *
 * POST: Crear sesión después de login con Firebase Auth
 * DELETE: Destruir sesión (logout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession } from '@/lib/auth/session';
import { type Rol } from '@/lib/types/firestore';

// Roles válidos
const VALID_ROLES: Rol[] = ['admin', 'encargado', 'cajera', 'cocina', 'repartidor'];

/**
 * POST /api/auth/session
 * Crea una nueva sesión después de login exitoso con Firebase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, nombre, rol } = body;

    // Validar campos requeridos
    if (!userId || !email || !nombre || !rol) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: userId, email, nombre, rol' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validar rol
    if (!VALID_ROLES.includes(rol)) {
      return NextResponse.json(
        { error: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Crear sesión
    await createSession({
      userId,
      email,
      nombre,
      rol,
    });

    return NextResponse.json(
      { success: true, message: 'Sesión creada correctamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creando sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Destruye la sesión actual (logout)
 */
export async function DELETE() {
  try {
    await destroySession();

    return NextResponse.json(
      { success: true, message: 'Sesión cerrada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
