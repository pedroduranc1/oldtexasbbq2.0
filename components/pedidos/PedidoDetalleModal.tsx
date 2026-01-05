'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { pedidosService } from '@/lib/services';
import type { Pedido, ItemPedido, EstadoPedido } from '@/lib/types/firestore';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  User,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  Package,
  Printer,
  ChefHat,
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface PedidoDetalleModalProps {
  pedido: Pedido | null;
  open: boolean;
  onClose: () => void;
  onCambiarEstado: (pedidoId: string, nuevoEstado: EstadoPedido) => void;
}

const ESTADOS_CONFIG: Record<
  EstadoPedido,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    icon: <Clock className="h-4 w-4" />,
  },
  en_preparacion: {
    label: 'En Preparación',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: <ChefHat className="h-4 w-4" />,
  },
  listo: {
    label: 'Listo',
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  en_reparto: {
    label: 'En Reparto',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    icon: <Truck className="h-4 w-4" />,
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    icon: <Package className="h-4 w-4" />,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    icon: <XCircle className="h-4 w-4" />,
  },
};

export function PedidoDetalleModal({
  pedido,
  open,
  onClose,
  onCambiarEstado,
}: PedidoDetalleModalProps) {
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (pedido && open) {
      loadItems();
    }
  }, [pedido, open]);

  const loadItems = async () => {
    if (!pedido) return;
    try {
      setLoadingItems(true);
      const itemsData = await pedidosService.getItems(pedido.id);
      setItems(itemsData);
    } catch (error) {
      console.error('Error cargando items:', error);
      toast.error('Error al cargar los productos del pedido');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleImprimir = async () => {
    if (!pedido) return;
    try {
      const { imprimirTicket } = await import('@/lib/utils/ticket');
      imprimirTicket({
        pedido,
        items,
        nombreNegocio: 'Old Texas BBQ',
        direccionNegocio: 'Piedras Negras, Coahuila',
        telefonoNegocio: '878-XXX-XXXX',
      });
    } catch (error) {
      console.error('Error imprimiendo:', error);
      toast.error('Error al imprimir el ticket');
    }
  };

  if (!pedido) return null;

  const estadoConfig = ESTADOS_CONFIG[pedido.estado];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6" />
              Pedido #{pedido.numeroPedido}
            </DialogTitle>
            <Badge className={`${estadoConfig.color} gap-1`}>
              {estadoConfig.icon}
              {estadoConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Cliente */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium text-foreground">{pedido.cliente.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {pedido.cliente.telefono}
                </p>
              </div>
              {pedido.cliente.direccion && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium text-foreground flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-1 shrink-0" />
                    {pedido.cliente.direccion}
                    {pedido.cliente.colonia && `, ${pedido.cliente.colonia}`}
                  </p>
                </div>
              )}
              {pedido.cliente.referencia && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Referencia</p>
                  <p className="font-medium text-foreground">{pedido.cliente.referencia}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Productos */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos ({items.length})
            </h3>
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-foreground">
                            {item.cantidad}x
                          </span>
                          <span className="font-medium text-foreground">
                            {item.productoNombre}
                          </span>
                        </div>
                        {/* Personalizaciones */}
                        {item.personalizaciones && (
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            {item.personalizaciones.salsa &&
                              item.personalizaciones.salsa.length > 0 && (
                                <p>
                                  <span className="font-medium">Salsas:</span>{' '}
                                  {item.personalizaciones.salsa.join(', ')}
                                </p>
                              )}
                            {item.personalizaciones.presentacion && (
                              <p>
                                <span className="font-medium">Presentación:</span>{' '}
                                {item.personalizaciones.presentacion}
                              </p>
                            )}
                            {item.personalizaciones.temperatura && (
                              <p>
                                <span className="font-medium">Temperatura:</span>{' '}
                                {item.personalizaciones.temperatura}
                              </p>
                            )}
                            {item.personalizaciones.extras &&
                              item.personalizaciones.extras.length > 0 && (
                                <p>
                                  <span className="font-medium">Extras:</span>{' '}
                                  {item.personalizaciones.extras.join(', ')}
                                </p>
                              )}
                            {item.personalizaciones.sinIngredientes &&
                              item.personalizaciones.sinIngredientes.length > 0 && (
                                <p>
                                  <span className="font-medium">Sin:</span>{' '}
                                  {item.personalizaciones.sinIngredientes.join(', ')}
                                </p>
                              )}
                          </div>
                        )}
                        {item.notas && (
                          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                            Nota: {item.notas}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {formatCurrency(item.subtotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.precioUnitario)} c/u
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Totales */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Resumen de Pago
            </h3>
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
              <div className="flex justify-between text-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(pedido.totales.subtotal)}</span>
              </div>
              {pedido.totales.envio > 0 && (
                <div className="flex justify-between text-foreground">
                  <span>Envío</span>
                  <span>{formatCurrency(pedido.totales.envio)}</span>
                </div>
              )}
              {pedido.totales.descuento > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span>-{formatCurrency(pedido.totales.descuento)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg text-foreground">
                <span>Total</span>
                <span>{formatCurrency(pedido.totales.total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm text-foreground">
                <span>Método de pago</span>
                <Badge variant="outline">{pedido.pago.metodo.toUpperCase()}</Badge>
              </div>
              {pedido.pago.metodo === 'efectivo' && pedido.pago.montoRecibido && (
                <>
                  <div className="flex justify-between text-sm text-foreground">
                    <span>Pagó con</span>
                    <span>{formatCurrency(pedido.pago.montoRecibido)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400">
                    <span>Cambio</span>
                    <span>{formatCurrency(pedido.pago.cambio || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Repartidor */}
          {pedido.reparto?.repartidorNombre && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Información de Reparto
                </h3>
                <div className="p-4 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Repartidor</p>
                      <p className="font-medium text-foreground">{pedido.reparto.repartidorNombre}</p>
                    </div>
                    <Badge variant="outline">
                      {pedido.reparto.estadoReparto || 'asignado'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Observaciones */}
          {pedido.observaciones && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observaciones
                </h3>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-500/20 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
                  <p className="text-foreground font-medium">{pedido.observaciones}</p>
                </div>
              </div>
            </>
          )}

          {/* Información adicional */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Fecha de creación</p>
              <p className="font-medium text-foreground">
                {pedido.fechaCreacion.toDate().toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Canal</p>
              <Badge variant="outline">{pedido.canal.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Acciones */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleImprimir} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </Button>

            {pedido.estado === 'pendiente' && (
              <Button
                onClick={() => onCambiarEstado(pedido.id, 'en_preparacion')}
                className="gap-2"
              >
                <ChefHat className="h-4 w-4" />
                Iniciar Preparación
              </Button>
            )}

            {pedido.estado === 'en_preparacion' && (
              <Button
                onClick={() => onCambiarEstado(pedido.id, 'listo')}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Marcar Listo
              </Button>
            )}

            {pedido.estado === 'listo' && (
              <Button
                onClick={() => onCambiarEstado(pedido.id, 'en_reparto')}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Truck className="h-4 w-4" />
                Enviar a Reparto
              </Button>
            )}

            {pedido.estado === 'en_reparto' && (
              <Button
                onClick={() => onCambiarEstado(pedido.id, 'entregado')}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Package className="h-4 w-4" />
                Marcar Entregado
              </Button>
            )}

            {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
              <Button
                variant="destructive"
                onClick={() => onCambiarEstado(pedido.id, 'cancelado')}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancelar Pedido
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
