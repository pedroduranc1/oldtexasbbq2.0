'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectorColoniaPublico } from './SelectorColoniaPublico';
import { DatosClienteForm, ItemCarritoPublico } from './FormularioPedidoPublico';
import { ClipPublicPaymentModal } from '@/components/payments/ClipPublicPaymentModal';
import { Loader2, CreditCard, Banknote, Smartphone, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { pedidosPublicosService } from '@/lib/services/pedidosPublicos.service';

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
  const [showClipModal, setShowClipModal] = useState(false);
  const [pagoEnLineaCompletado, setPagoEnLineaCompletado] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

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

    // Si es tarjeta en línea, debe estar completado el pago
    if (datosCliente.metodoPago === 'tarjeta_linea') {
      return pagoEnLineaCompletado;
    }

    return true;
  }, [datosCliente, carrito, total, pagoEnLineaCompletado]);

  // Validar si puede mostrar botón de pago en línea
  const puedeIniciarPago = useMemo(() => {
    return (
      datosCliente.nombre &&
      datosCliente.telefono &&
      datosCliente.direccion &&
      datosCliente.coloniaId &&
      datosCliente.metodoPago === 'tarjeta_linea' &&
      carrito.length > 0 &&
      total >= 10
    );
  }, [datosCliente, carrito, total]);

  // Función para crear el pedido directamente desde el cliente
  const crearPedido = async (clipPaymentId?: string) => {
    try {
      setEnviando(true);

      // Preparar datos del pedido
      const esPagoEnLinea = datosCliente.metodoPago === 'tarjeta_linea';
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
          metodo: esPagoEnLinea ? 'tarjeta' : datosCliente.metodoPago!,
          requiereCambio:
            datosCliente.metodoPago === 'efectivo' && cambioFinal > 0,
          montoRecibido: montoPagadoFinal,
          cambio: cambioFinal,
          pagoAdelantado: esPagoEnLinea,
          ...(clipPaymentId && { referenciaPago: clipPaymentId }),
        },
        creadoPor: 'sistema-web',
        cancelado: false,
      };

      // Preparar items
      const items = carrito.map((item) => {
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

      // Crear pedido usando el servicio directamente (cliente)
      const { pedidoId, numeroPedido } = await pedidosPublicosService.crearPedidoPublico(
        pedidoData as any,
        items
      );

      console.log('Pedido público creado:', pedidoId);
      toast.success('¡Pedido recibido con éxito!');

      // Llamar al callback
      onFinalizarPedido(pedidoId, numeroPedido);
      return true;
    } catch (error: any) {
      console.error('Error enviando pedido:', error);
      toast.error(
        error?.message || 'Error al enviar el pedido. Intenta nuevamente.'
      );
      return false;
    } finally {
      setEnviando(false);
    }
  };

  // Handler para pago exitoso con Clip - crea el pedido automáticamente
  const handleClipPaymentSuccess = async (clipPaymentId: string) => {
    setPaymentId(clipPaymentId);
    setPagoEnLineaCompletado(true);
    setShowClipModal(false);

    // Crear el pedido automáticamente después del pago exitoso
    toast.success('Pago realizado con éxito. Procesando tu pedido...');
    await crearPedido(clipPaymentId);
  };

  // Handler para error en pago
  const handleClipPaymentError = (error: string) => {
    toast.error(`Error en el pago: ${error}`);
    setPagoEnLineaCompletado(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si es pago en línea y ya se completó, el pedido ya fue creado
    if (datosCliente.metodoPago === 'tarjeta_linea' && pagoEnLineaCompletado) {
      return;
    }

    if (!puedeEnviar) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    await crearPedido(paymentId || undefined);
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
              onValueChange={(value) => {
                // Resetear estado de pago en línea si cambia de método
                if (value !== 'tarjeta_linea') {
                  setPagoEnLineaCompletado(false);
                  setPaymentId(null);
                }
                onDatosChange({
                  ...datosCliente,
                  metodoPago: value as 'efectivo' | 'tarjeta' | 'transferencia' | 'tarjeta_linea',
                });
              }}
            >
              <div className="space-y-3">
                {/* Pago en línea con tarjeta - DESTACADO */}
                <label className="flex items-center gap-3 p-4 border-2 border-primary rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                  <RadioGroupItem value="tarjeta_linea" id="tarjeta_linea" />
                  <div className="relative">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <Shield className="h-3 w-3 text-green-500 absolute -bottom-1 -right-1" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-primary">Pagar ahora con tarjeta</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pago seguro en línea - Visa, Mastercard, Amex
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Banknote className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Efectivo</p>
                    <p className="text-sm text-muted-foreground">
                      Paga al recibir tu pedido
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="tarjeta" id="tarjeta" />
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Tarjeta al recibir</p>
                    <p className="text-sm text-muted-foreground">
                      Terminal en el domicilio
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="transferencia" id="transferencia" />
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium">Transferencia</p>
                    <p className="text-sm text-muted-foreground">
                      Envía comprobante por WhatsApp
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>

            {/* Campo de monto pagado (solo para efectivo) */}
            {datosCliente.metodoPago === 'efectivo' && (
              <div className="mt-4">
                <Label htmlFor="montoPagado">¿Con cuánto vas a pagar?</Label>
                <CurrencyInput
                  id="montoPagado"
                  value={datosCliente.montoPagado}
                  onValueChange={(v) => onDatosChange({ ...datosCliente, montoPagado: v })}
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

            {/* Sección de pago en línea con Clip */}
            {datosCliente.metodoPago === 'tarjeta_linea' && (
              <div className="mt-4 space-y-4">
                {pagoEnLineaCompletado ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          Pago completado
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          Tu pago de ${total.toFixed(2)} fue procesado exitosamente
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-400">
                            Pago seguro con Clip
                          </p>
                          <p className="text-blue-600 dark:text-blue-500">
                            Tus datos están protegidos con encriptación de nivel bancario
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setShowClipModal(true)}
                      disabled={!puedeIniciarPago}
                      className="w-full h-12 gap-2 bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      <CreditCard className="h-5 w-5" />
                      Pagar ${total.toFixed(2)} con tarjeta
                    </Button>

                    {!puedeIniciarPago && (
                      <p className="text-xs text-muted-foreground text-center">
                        Completa tus datos de contacto y dirección para continuar
                      </p>
                    )}

                    <div className="flex items-center justify-center gap-4 pt-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/100px-Visa_Inc._logo.svg.png"
                        alt="Visa"
                        className="h-6 object-contain opacity-60"
                      />
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/100px-Mastercard-logo.svg.png"
                        alt="Mastercard"
                        className="h-6 object-contain opacity-60"
                      />
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/100px-American_Express_logo_%282018%29.svg.png"
                        alt="Amex"
                        className="h-6 object-contain opacity-60"
                      />
                    </div>
                  </div>
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
                        : datosCliente.metodoPago === 'tarjeta_linea' &&
                            !pagoEnLineaCompletado
                          ? 'Completa el pago con tarjeta'
                          : 'Completa todos los campos'}
              </p>
            )}

            <p className="text-xs text-foreground/90 text-center mt-4">
              Tiempo estimado de entrega: 45-60 minutos
            </p>
          </Card>
        </div>
      </div>

      {/* Modal de pago público con Clip */}
      <ClipPublicPaymentModal
        isOpen={showClipModal}
        onClose={() => setShowClipModal(false)}
        amount={total}
        description={`Pedido Old Texas BBQ - ${carrito.length} producto(s)`}
        customerPhone={datosCliente.telefono}
        onPaymentSuccess={handleClipPaymentSuccess}
        onPaymentError={handleClipPaymentError}
        showInstallments={total >= 300}
      />
    </form>
  );
}
