'use client';

import { useState, useMemo } from 'react';
import { CatalogoProductos } from './CatalogoProductos';
import { CarritoPedidoPublico } from './CarritoPedidoPublico';
import { DatosClientePublico } from './DatosClientePublico';
import { ConfirmacionPedido } from './ConfirmacionPedido';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Producto } from '@/lib/types/firestore';
import { ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItemCarritoPublico {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  foto?: string;
  personalizaciones?: {
    salsas?: string[];
    presentacion?: string;
    extras?: string[];
    notas?: string;
  };
  subtotal: number;
}

export interface DatosClienteForm {
  nombre: string;
  telefono: string;
  direccion: string;
  colonia: string;
  coloniaId: string;
  referencia: string;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | null;
  montoPagado: number;
}

type PasoFormulario = 'catalogo' | 'carrito' | 'datos' | 'confirmacion';

export function FormularioPedidoPublico() {
  const [paso, setPaso] = useState<PasoFormulario>('catalogo');
  const [carrito, setCarrito] = useState<ItemCarritoPublico[]>([]);
  const [datosCliente, setDatosCliente] = useState<DatosClienteForm>({
    nombre: '',
    telefono: '',
    direccion: '',
    colonia: '',
    coloniaId: '',
    referencia: '',
    metodoPago: null,
    montoPagado: 0,
  });
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [numeroPedido, setNumeroPedido] = useState<number | null>(null);

  // Cálculos
  const cantidadProductos = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.cantidad, 0);
  }, [carrito]);

  const subtotal = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  }, [carrito]);

  const total = useMemo(() => {
    return subtotal + costoEnvio;
  }, [subtotal, costoEnvio]);

  const cambio = useMemo(() => {
    if (
      datosCliente.metodoPago === 'efectivo' &&
      datosCliente.montoPagado > total
    ) {
      return datosCliente.montoPagado - total;
    }
    return 0;
  }, [datosCliente.metodoPago, datosCliente.montoPagado, total]);

  // Handlers
  const handleAgregarProducto = (producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id);

      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: item.precio * (item.cantidad + 1),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          foto: producto.foto,
          subtotal: producto.precio,
        },
      ];
    });
  };

  const handleContinuarDesdeCarrito = () => {
    if (carrito.length > 0) {
      setPaso('datos');
    }
  };

  const handleFinalizarPedido = (pedidoId: string, numeroPedido: number) => {
    setPedidoId(pedidoId);
    setNumeroPedido(numeroPedido);
    setPaso('confirmacion');
  };

  const handleNuevoPedido = () => {
    setCarrito([]);
    setDatosCliente({
      nombre: '',
      telefono: '',
      direccion: '',
      colonia: '',
      coloniaId: '',
      referencia: '',
      metodoPago: null,
      montoPagado: 0,
    });
    setCostoEnvio(0);
    setPedidoId(null);
    setNumeroPedido(null);
    setPaso('catalogo');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Indicador de pasos */}
      {paso !== 'confirmacion' && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {/* Paso 1: Catálogo */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  paso === 'catalogo'
                    ? 'bg-red-600 text-white'
                    : paso === 'carrito' || paso === 'datos'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                1
              </div>
              <span
                className={cn(
                  'hidden md:inline text-sm font-medium',
                  paso === 'catalogo'
                    ? 'text-red-600'
                    : paso === 'carrito' || paso === 'datos'
                      ? 'text-green-600'
                      : 'text-gray-500'
                )}
              >
                Productos
              </span>
            </div>

            <div className="w-8 md:w-16 h-0.5 bg-gray-300"></div>

            {/* Paso 2: Carrito */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  paso === 'carrito'
                    ? 'bg-red-600 text-white'
                    : paso === 'datos'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                2
              </div>
              <span
                className={cn(
                  'hidden md:inline text-sm font-medium',
                  paso === 'carrito'
                    ? 'text-red-600'
                    : paso === 'datos'
                      ? 'text-green-600'
                      : 'text-gray-500'
                )}
              >
                Carrito
              </span>
            </div>

            <div className="w-8 md:w-16 h-0.5 bg-gray-300"></div>

            {/* Paso 3: Datos */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  paso === 'datos'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                3
              </div>
              <span
                className={cn(
                  'hidden md:inline text-sm font-medium',
                  paso === 'datos' ? 'text-red-600' : 'text-gray-500'
                )}
              >
                Datos y Pago
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenido según el paso */}
      <div className="relative">
        {/* Paso 1: Catálogo */}
        {paso === 'catalogo' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                🍖 Nuestro Menú
              </h2>
              {cantidadProductos > 0 && (
                <Button
                  onClick={() => setPaso('carrito')}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Ver Carrito
                  <Badge className="ml-1 bg-white text-red-600">
                    {cantidadProductos}
                  </Badge>
                </Button>
              )}
            </div>

            <CatalogoProductos onAgregarProducto={handleAgregarProducto} />

            {/* Botón flotante de carrito en móvil */}
            {cantidadProductos > 0 && (
              <div className="fixed bottom-6 right-6 md:hidden z-50">
                <Button
                  onClick={() => setPaso('carrito')}
                  size="lg"
                  className="rounded-full shadow-2xl bg-red-600 hover:bg-red-700 w-16 h-16 p-0"
                >
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    <Badge className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center p-0">
                      {cantidadProductos}
                    </Badge>
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Carrito */}
        {paso === 'carrito' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setPaso('catalogo')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Seguir Comprando
              </Button>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Tu Carrito
              </h2>
            </div>

            <CarritoPedidoPublico
              items={carrito}
              onUpdateItem={setCarrito}
              subtotal={subtotal}
              onContinuar={handleContinuarDesdeCarrito}
            />
          </div>
        )}

        {/* Paso 3: Datos del Cliente */}
        {paso === 'datos' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setPaso('carrito')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Carrito
              </Button>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Completa tu Pedido
              </h2>
            </div>

            <DatosClientePublico
              datosCliente={datosCliente}
              onDatosChange={setDatosCliente}
              carrito={carrito}
              subtotal={subtotal}
              costoEnvio={costoEnvio}
              onCostoEnvioChange={setCostoEnvio}
              total={total}
              cambio={cambio}
              onFinalizarPedido={handleFinalizarPedido}
            />
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {paso === 'confirmacion' && pedidoId && numeroPedido && (
          <ConfirmacionPedido
            pedidoId={pedidoId}
            numeroPedido={numeroPedido}
            total={total}
            onNuevoPedido={handleNuevoPedido}
          />
        )}
      </div>
    </div>
  );
}
