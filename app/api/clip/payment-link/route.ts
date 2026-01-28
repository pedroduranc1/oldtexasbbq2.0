/**
 * API Route: Crear Link de Pago con Clip
 * POST /api/clip/payment-link
 * GET /api/clip/payment-link?id=xxx
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

    // Obtener datos del cuerpo
    const body = await request.json();

    const { amount, description, orderId, customerEmail, expiresAt, redirectUrl } = body;

    // Validar campos requeridos
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'El monto es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    // Crear link de pago
    const paymentLink = await clipService.createPaymentLink({
      amount,
      description,
      orderId,
      customerEmail,
      expiresAt,
      redirectUrl,
      metadata: {
        userId: session.userId,
        source: 'crm_web',
      },
    });

    return NextResponse.json({
      success: true,
      paymentLink,
    });

  } catch (error) {
    console.error('Error creando link de pago Clip:', error);

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

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener ID del link
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'El ID del link es requerido' },
        { status: 400 }
      );
    }

    // Obtener estado del link
    const paymentLink = await clipService.getPaymentLink(linkId);

    return NextResponse.json({
      success: true,
      paymentLink,
    });

  } catch (error) {
    console.error('Error obteniendo link de pago Clip:', error);

    if (error instanceof ClipApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
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
