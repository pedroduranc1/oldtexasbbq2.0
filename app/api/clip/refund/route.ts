/**
 * API Route: Reembolsos con Clip
 * POST /api/clip/refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { clipService, ClipApiError } from '@/lib/clip';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo admin y encargado pueden hacer reembolsos
    if (!['admin', 'encargado'].includes(session.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar reembolsos' },
        { status: 403 }
      );
    }

    // Obtener datos del cuerpo
    const body = await request.json();

    const { paymentId, amount, reason } = body;

    // Validar campos requeridos
    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json(
        { error: 'El ID del pago es requerido' },
        { status: 400 }
      );
    }

    // Crear reembolso
    const refund = await clipService.createRefund({
      paymentId,
      amount, // Si no se envía, es reembolso total
      reason: reason || 'Reembolso solicitado por el cliente',
    });

    return NextResponse.json({
      success: refund.status === 'approved',
      refund,
    });

  } catch (error) {
    console.error('Error procesando reembolso Clip:', error);

    if (error instanceof ClipApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
