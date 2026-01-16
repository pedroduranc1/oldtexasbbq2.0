/**
 * ProductoCard Component
 * Old Texas BBQ - CRM
 *
 * Card individual de producto para vista grid
 */

'use client';

import { Producto } from '@/lib/types/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Tag, TrendingUp, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ProductoCardProps {
  producto: Producto;
  onToggleDisponibilidad: (id: string, disponible: boolean) => void;
  onEliminar: (id: string) => void;
  onEditar: (producto: Producto) => void;
  onVerDetalle: (producto: Producto) => void;
}

export default function ProductoCard({
  producto,
  onToggleDisponibilidad,
  onEliminar,
  onEditar,
  onVerDetalle,
}: ProductoCardProps) {
  const formatoPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(precio);
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagen */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {producto.imagen ? (
          <Image
            src={producto.imagen}
            alt={producto.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2" />
            <p className="text-sm">Sin imagen</p>
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {producto.enPromocion && (
            <Badge variant="destructive" className="gap-1 shadow-md">
              <Tag className="h-3 w-3" />
              Promoción
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
        <div className="absolute bottom-2 left-2">
          <Badge
            variant={producto.disponible ? 'default' : 'secondary'}
            className={
              producto.disponible
                ? 'bg-green-500 hover:bg-green-600 shadow-md'
                : 'bg-gray-500 hover:bg-gray-600 shadow-md'
            }
          >
            {producto.disponible ? 'Disponible' : 'Agotado'}
          </Badge>
        </div>
      </div>

      {/* Contenido */}
      <CardContent className="p-4 space-y-3">
        {/* Categoría */}
        <Badge variant="outline" className="text-xs">
          {producto.categoriaNombre}
        </Badge>

        {/* Nombre */}
        <button
          onClick={() => onVerDetalle(producto)}
          className="font-semibold text-lg line-clamp-1 hover:text-primary hover:underline text-left w-full"
        >
          {producto.nombre}
        </button>

        {/* Descripción */}
        {producto.descripcion && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        {/* Precio */}
        <div className="flex items-baseline gap-2">
          {producto.enPromocion && producto.precioPromocion ? (
            <>
              <span className="text-lg font-bold text-red-500">
                {formatoPrecio(producto.precioPromocion)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatoPrecio(producto.precio)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold">{formatoPrecio(producto.precio)}</span>
          )}
        </div>

        {/* Toggle Disponibilidad */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Disponible</span>
          <Switch
            checked={producto.disponible}
            onCheckedChange={(checked) =>
              onToggleDisponibilidad(producto.id, checked)
            }
          />
        </div>
      </CardContent>

      {/* Acciones */}
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => onEditar(producto)}
        >
          <Edit className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (confirm('¿Estás seguro de eliminar este producto?')) {
              onEliminar(producto.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
}
