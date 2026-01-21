/**
 * ProductoDetalle Component
 * Old Texas BBQ - CRM
 *
 * Modal de vista completa con toda la información del producto
 */

'use client';

import { Producto } from '@/lib/types/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tag,
  TrendingUp,
  Calendar,
  User,
  Package,
  DollarSign,
  Eye,
  EyeOff,
  Info,
  Edit,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductoDetalleProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (producto: Producto) => void;
  onDuplicar?: (producto: Producto) => void;
}

export function ProductoDetalle({
  producto,
  open,
  onClose,
  onEdit,
  onDuplicar,
}: ProductoDetalleProps) {
  if (!producto) return null;

  const formatoPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(precio);
  };

  const formatoFecha = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const descuentoPorcentaje = producto.enPromocion && producto.precioPromocion
    ? Math.round(((producto.precio - producto.precioPromocion) / producto.precio) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles del Producto</span>
            <div className="flex items-center gap-2">
              {onDuplicar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicar(producto)}
                  className="gap-2"
                  title="Duplicar producto"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(producto)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagen y badges principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Imagen */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {producto.imagen ? (
                <Image
                  src={producto.imagen}
                  alt={producto.nombre}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-2" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              )}

              {/* Badges superpuestos */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {producto.enPromocion && (
                  <Badge variant="destructive" className="gap-1 shadow-md">
                    <Tag className="h-3 w-3" />
                    Promoción {descuentoPorcentaje}% OFF
                  </Badge>
                )}
                {producto.popularidad > 50 && !producto.enPromocion && (
                  <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 shadow-md">
                    <TrendingUp className="h-3 w-3" />
                    Popular
                  </Badge>
                )}
              </div>

              {/* Badge de estado inferior */}
              <div className="absolute bottom-4 left-4">
                <Badge
                  variant={producto.disponible ? 'default' : 'secondary'}
                  className={
                    producto.disponible
                      ? 'bg-green-500 hover:bg-green-600 shadow-md'
                      : 'bg-gray-500 hover:bg-gray-600 shadow-md'
                  }
                >
                  {producto.disponible ? (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Disponible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      No disponible
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {/* Información principal */}
            <div className="space-y-4">
              {/* Categoría */}
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                {producto.categoriaNombre}
              </Badge>

              {/* Nombre */}
              <h2 className="text-2xl font-bold">{producto.nombre}</h2>

              {/* Descripción */}
              {producto.descripcion && (
                <p className="text-muted-foreground leading-relaxed">
                  {producto.descripcion}
                </p>
              )}

              {/* Precios */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Precio normal:</span>
                  <span
                    className={`text-lg font-bold ${
                      producto.enPromocion && producto.precioPromocion
                        ? 'line-through text-muted-foreground'
                        : 'text-primary'
                    }`}
                  >
                    {formatoPrecio(producto.precio)}
                  </span>
                </div>

                {producto.enPromocion && producto.precioPromocion && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Precio de promoción:</span>
                    <span className="text-2xl font-bold text-red-500">
                      {formatoPrecio(producto.precioPromocion)}
                    </span>
                  </div>
                )}
              </div>

              {/* Etiquetas */}
              {producto.etiquetas && producto.etiquetas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Etiquetas:</p>
                  <div className="flex flex-wrap gap-2">
                    {producto.etiquetas.map((etiqueta, index) => (
                      <Badge key={index} variant="secondary">
                        {etiqueta}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredientes */}
              {producto.ingredientes && producto.ingredientes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ingredientes:</p>
                  <div className="flex flex-wrap gap-2">
                    {producto.ingredientes.map((ingrediente, index) => (
                      <Badge key={index} variant="outline">
                        {ingrediente}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orden */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orden de visualización</p>
                <p className="font-semibold">{producto.orden}</p>
              </div>
            </div>

            {/* Popularidad */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Popularidad</p>
                <p className="font-semibold">{producto.popularidad} ventas</p>
              </div>
            </div>

            {/* Stock (si existe) */}
            {producto.stock !== undefined && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock actual</p>
                  <p className="font-semibold">
                    {producto.stock} unidades
                    {producto.stockMinimo && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (mín: {producto.stockMinimo})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Personalización */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personalización</p>
                <p className="font-semibold">
                  {producto.permitePersonalizacion ? 'Permitida' : 'No permitida'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold text-base">Información del sistema</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* ID */}
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">ID del producto</p>
                  <p className="font-mono text-xs">{producto.id}</p>
                </div>
              </div>

              {/* SKU */}
              {producto.sku && (
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">SKU</p>
                    <p className="font-mono text-xs">{producto.sku}</p>
                  </div>
                </div>
              )}

              {/* Fecha de creación */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Fecha de creación</p>
                  <p className="text-xs">{formatoFecha(producto.fechaCreacion)}</p>
                </div>
              </div>

              {/* Última actualización */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Última actualización</p>
                  <p className="text-xs">{formatoFecha(producto.fechaActualizacion)}</p>
                </div>
              </div>

              {/* Creado por */}
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Creado por</p>
                  <p className="text-xs font-mono">{producto.creadoPor}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
