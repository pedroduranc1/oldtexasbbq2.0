'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Phone, Clock, Package } from 'lucide-react';

interface ConfirmacionPedidoProps {
  pedidoId: string;
  numeroPedido: number;
  total: number;
  onNuevoPedido: () => void;
}

export function ConfirmacionPedido({
  pedidoId,
  numeroPedido,
  total,
  onNuevoPedido,
}: ConfirmacionPedidoProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 md:p-12 text-center">
        {/* Icono de éxito */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
        </div>

        {/* Mensaje principal */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          ¡Pedido Confirmado!
        </h1>

        <p className="text-lg text-foreground/70 mb-8">
          Gracias por tu pedido. Hemos recibido tu orden y la estamos
          preparando.
        </p>

        {/* Número de pedido */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-2">Tu número de pedido es:</p>
          <p className="text-4xl font-bold text-red-600">#{numeroPedido}</p>
          <p className="text-xs text-gray-500 mt-2">
            Referencia: {pedidoId.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Información del pedido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <Clock className="h-8 w-8 text-gray-600" />
            <p className="text-sm font-medium text-gray-900">
              Tiempo estimado
            </p>
            <p className="text-lg font-bold text-gray-600">45-60 min</p>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <Package className="h-8 w-8 text-gray-600" />
            <p className="text-sm font-medium text-gray-900">Total</p>
            <p className="text-lg font-bold text-red-600">
              ${total.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <Phone className="h-8 w-8 text-gray-600" />
            <p className="text-sm font-medium text-gray-900">Contacto</p>
            <p className="text-lg font-bold text-gray-600">878-XXX-XXXX</p>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-bold text-blue-900 mb-3">
            ¿Qué sigue ahora?
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>
                Nuestro equipo de cocina está preparando tu pedido
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>
                Un repartidor recogerá tu pedido y se dirigirá a tu domicilio
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>
                Te contactaremos si necesitamos confirmar algo de tu pedido
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>¡Disfruta tu delicioso BBQ estilo Texas!</span>
            </li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Button
            onClick={onNuevoPedido}
            className="w-full bg-red-600 text-white hover:bg-red-700 h-12 text-lg"
            size="lg"
          >
            Hacer Otro Pedido
          </Button>

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="w-full h-12"
          >
            Imprimir Confirmación
          </Button>
        </div>

        {/* Pie de página */}
        <p className="text-xs text-gray-500 mt-8">
          Si tienes alguna duda sobre tu pedido, llámanos al{' '}
          <strong>878-XXX-XXXX</strong> y menciona tu número de pedido
        </p>
      </Card>
    </div>
  );
}
