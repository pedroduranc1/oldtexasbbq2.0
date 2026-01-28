/**
 * API Route: Procesar Pago con Clip
 * POST /api/clip/payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { clipService, ClipPaymentRequest, ClipApiError } from '@/lib/clip';
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

    // Validar campos requeridos
    const { amount, cardToken, description, orderId, customerEmail, customerPhone, use3ds, returnUrl, installments } = body;

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'El monto es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!cardToken || typeof cardToken !== 'string') {
      return NextResponse.json(
        { error: 'El token de tarjeta es requerido' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    // Construir request de pago
    const paymentRequest: ClipPaymentRequest = {
      amount,
      cardToken,
      description,
      orderId,
      customerEmail,
      customerPhone,
      use3ds: use3ds || false,
      returnUrl,
      installments,
      metadata: {
        userId: session.userId,
        source: 'crm_web',
      },
    };

    // Procesar pago
    const payment = await clipService.createPayment(paymentRequest);

    // Retornar resultado
    return NextResponse.json({
      success: payment.status === 'approved',
      payment,
    });

  } catch (error) {
    console.error('Error procesando pago Clip:', error);

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
