'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectorColoniaPublico } from './SelectorColoniaPublico';
import { DatosClienteForm, ItemCarritoPublico } from './FormularioPedidoPublico';
import { Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { pedidosPublicosService } from '@/lib/services/pedidosPublicos.service';
import { ItemPedido } from '@/lib/types/firestore';
import { Timestamp } from 'firebase/firestore';

interface DatosClientePublicoProps {
  datosCliente: DatosClienteForm;
  onDatosChange: (datos: DatosClienteForm) => void;
  carrito: ItemCarritoPublico[];
  subtotal: number;
  costoEnvio: number;
  onCostoEnvioChange: (costo: number) => void;
  total: number;
  cambio: number;
  onFinalizarPedido: (pedidoId: string, numeroPedido: number) => void;
}

export function DatosClientePublico({
  datosCliente,
  onDatosChange,
  carrito,
  subtotal,
  costoEnvio,
  onCostoEnvioChange,
  total,
  cambio,
  onFinalizarPedido,
}: DatosClientePublicoProps) {
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = useMemo(() => {
    const validacionesBasicas =
      datosCliente.nombre &&
      datosCliente.telefono &&
      datosCliente.direccion &&
      datosCliente.coloniaId &&
      datosCliente.metodoPago &&
      carrito.length > 0;

    if (!validacionesBasicas) return false;

    // Si es efectivo, validar monto pagado
    if (datosCliente.metodoPago === 'efectivo') {
      return datosCliente.montoPagado >= total;
    }

    return true;
  }, [datosCliente, carrito, total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!puedeEnviar) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      setEnviando(true);

      // Preparar datos del pedido
      const montoPagadoFinal =
        datosCliente.metodoPago === 'efectivo'
          ? datosCliente.montoPagado
          : total;
      const cambioFinal =
        datosCliente.metodoPago === 'efectivo' && datosCliente.montoPagado > total
          ? datosCliente.montoPagado - total
          : 0;

      const pedidoData = {
        canal: 'web' as const,
        cliente: {
          nombre: datosCliente.nombre,
          telefono: datosCliente.telefono,
          direccion: datosCliente.direccion,
          colonia: datosCliente.colonia,
          referencia: datosCliente.referencia,
        },
        estado: 'pendiente' as const,
        totales: {
          subtotal,
          envio: costoEnvio,
          descuento: 0,
          total,
        },
        pago: {
          metodo: datosCliente.metodoPago!,
          requiereCambio:
            datosCliente.metodoPago === 'efectivo' && cambioFinal > 0,
          montoRecibido: montoPagadoFinal,
          cambio: cambioFinal,
          pagoAdelantado: false,
        },
        horaRecepcion: Timestamp.now(),
        creadoPor: 'sistema-web',
        cancelado: false,
      };

      // Preparar items
      const items: Omit<ItemPedido, 'id'>[] = carrito.map((item) => {
        const itemPedido: any = {
          productoId: item.productoId,
          productoNombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          subtotal: item.subtotal,
        };

        if (item.personalizaciones) {
          const personalizaciones: any = {};

          if (
            item.personalizaciones.salsas &&
            item.personalizaciones.salsas.length > 0
          ) {
            personalizaciones.salsa = item.personalizaciones.salsas;
          }

          if (item.personalizaciones.presentacion) {
            personalizaciones.presentacion =
              item.personalizaciones.presentacion;
          }

          if (
            item.personalizaciones.extras &&
            item.personalizaciones.extras.length > 0
          ) {
            personalizaciones.extras = item.personalizaciones.extras;
          }

          if (Object.keys(personalizaciones).length > 0) {
            itemPedido.personalizaciones = personalizaciones;
          }
        }

        if (item.personalizaciones?.notas) {
          itemPedido.notas = item.personalizaciones.notas;
        }

        return itemPedido;
      });

      // Crear pedido público
      const { pedidoId, numeroPedido } =
        await pedidosPublicosService.crearPedidoPublico(pedidoData, items);

      console.log('Pedido público creado:', pedidoId);
      toast.success('¡Pedido recibido con éxito!');

      // Llamar al callback
      onFinalizarPedido(pedidoId, numeroPedido);
    } catch (error: any) {
      console.error('Error enviando pedido:', error);
      toast.error(
        error?.message || 'Error al enviar el pedido. Intenta nuevamente.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos personales */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">
              1. Datos de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  type="text"
                  value={datosCliente.nombre}
                  onChange={(e) =>
                    onDatosChange({ ...datosCliente, nombre: e.target.value })
                  }
                  placeholder="Juan Pérez"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={datosCliente.telefono}
                  onChange={(e) =>
                    onDatosChange({ ...datosCliente, telefono: e.target.value })
                  }
                  placeholder="878-123-4567"
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Dirección */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">
              2. Dirección de Entrega
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="direccion">Calle y número *</Label>
                <Input
                  id="direccion"
                  type="text"
                  value={datosCliente.direccion}
                  onChange={(e) =>
                    onDatosChange({
                      ...datosCliente,
                      direccion: e.target.value,
                    })
                  }
                  placeholder="Av. Principal #123"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="colonia">Colonia *</Label>
                <SelectorColoniaPublico
                  value={datosCliente.coloniaId}
                  onChange={(id, colonia) => {
                    onDatosChange({
                      ...datosCliente,
                      coloniaId: id,
                      colonia: colonia.nombre,
                    });
                    onCostoEnvioChange(colonia.costoEnvio);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="referencia">Referencias (opcional)</Label>
                <Textarea
                  id="referencia"
                  value={datosCliente.referencia}
                  onChange={(e) =>
                    onDatosChange({
                      ...datosCliente,
                      referencia: e.target.value,
                    })
                  }
                  placeholder="Casa color azul, portón negro..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Método de pago */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">
              3. Método de Pago
            </h3>

            <RadioGroup
              value={datosCliente.metodoPago || ''}
              onValueChange={(value) =>
                onDatosChange({
                  ...datosCliente,
                  metodoPago: value as 'efectivo' | 'tarjeta' | 'transferencia',
                })
              }
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer ">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Banknote className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Efectivo</p>
                    <p className="text-sm text-gray-500">
                      Paga al recibir tu pedido
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer ">
                  <RadioGroupItem value="tarjeta" id="tarjeta" />
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Tarjeta</p>
                    <p className="text-sm text-gray-500">
                      Paga con tarjeta al recibir
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer ">
                  <RadioGroupItem value="transferencia" id="transferencia" />
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium">MercadoPago / PayPal</p>
                    <p className="text-sm text-gray-500">
                      Paga con MercadoPago o PayPal
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>

            {/* Campo de monto pagado (solo para efectivo) */}
            {datosCliente.metodoPago === 'efectivo' && (
              <div className="mt-4">
                <Label htmlFor="montoPagado">¿Con cuánto vas a pagar?</Label>
                <Input
                  id="montoPagado"
                  type="number"
                  step="0.01"
                  min={total}
                  value={datosCliente.montoPagado}
                  onChange={(e) =>
                    onDatosChange({
                      ...datosCliente,
                      montoPagado: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={`Mínimo $${total.toFixed(2)}`}
                  required
                  className="mt-1"
                />
                {cambio > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    Tu cambio será: <strong>${cambio.toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Resumen del Pedido
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-foreground/90">
                <span>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-foreground/90">
                <span>Envío</span>
                {costoEnvio > 0 ? (
                  <span className="font-medium">${costoEnvio.toFixed(2)}</span>
                ) : (
                  <span className="text-sm italic">Selecciona colonia</span>
                )}
              </div>

              <div className="pt-3 border-t border-foreground/10">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-red-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!puedeEnviar || enviando}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 h-12 text-white text-lg"
              size="lg"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Realizar Pedido'
              )}
            </Button>

            {!puedeEnviar && (
              <p className="text-xs text-destructive text-center mt-2">
                {!datosCliente.nombre || !datosCliente.telefono
                  ? 'Completa tus datos de contacto'
                  : !datosCliente.direccion || !datosCliente.coloniaId
                    ? 'Completa tu dirección'
                    : !datosCliente.metodoPago
                      ? 'Selecciona un método de pago'
                      : datosCliente.metodoPago === 'efectivo' &&
                          datosCliente.montoPagado < total
                        ? 'Ingresa con cuánto vas a pagar'
                        : 'Completa todos los campos'}
              </p>
            )}

            <p className="text-xs text-foreground/90 text-center mt-4">
              Tiempo estimado de entrega: 45-60 minutos
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}
