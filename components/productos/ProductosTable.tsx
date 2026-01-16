/**
 * ProductosTable Component
 * Old Texas BBQ - CRM
 *
 * Vista de tabla responsive para productos
 */

'use client';

import { Producto } from '@/lib/types/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Tag, TrendingUp, Eye } from 'lucide-react';
import Image from 'next/image';
import { EmptyState } from '@/components/ui/empty-state';

interface ProductosTableProps {
  productos: Producto[];
  onToggleDisponibilidad: (id: string, disponible: boolean) => void;
  onEliminar: (id: string) => void;
  onEditar: (producto: Producto) => void;
  onVerDetalle: (producto: Producto) => void;
}

export default function ProductosTable({
  productos,
  onToggleDisponibilidad,
  onEliminar,
  onEditar,
  onVerDetalle,
}: ProductosTableProps) {
  if (productos.length === 0) {
    return (
      <EmptyState
        title="No hay productos"
        description="No se encontraron productos con los filtros seleccionados"
      />
    );
  }

  const formatoPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(precio);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Imagen</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">Destacado</TableHead>
            <TableHead className="text-center">Disponible</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              {/* Imagen */}
              <TableCell>
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                  {producto.imagen ? (
                    <Image
                      src={producto.imagen}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Sin imagen
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Producto */}
              <TableCell>
                <div className="space-y-1">
                  <button
                    onClick={() => onVerDetalle(producto)}
                    className="font-medium hover:text-primary hover:underline text-left"
                  >
                    {producto.nombre}
                  </button>
                  {producto.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {producto.descripcion}
                    </p>
                  )}
                </div>
              </TableCell>

              {/* Categoría */}
              <TableCell>
                <Badge variant="outline">{producto.categoriaNombre}</Badge>
              </TableCell>

              {/* Precio */}
              <TableCell className="text-right">
                <div className="space-y-1">
                  <p className="font-semibold">{formatoPrecio(producto.precio)}</p>
                  {producto.enPromocion && producto.precioPromocion && (
                    <p className="text-sm text-red-500 font-medium">
                      {formatoPrecio(producto.precioPromocion)}
                    </p>
                  )}
                </div>
              </TableCell>

              {/* Estado */}
              <TableCell className="text-center">
                <Badge
                  variant={producto.disponible ? 'default' : 'secondary'}
                  className={
                    producto.disponible
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }
                >
                  {producto.disponible ? 'Disponible' : 'Agotado'}
                </Badge>
              </TableCell>

              {/* Destacado */}
              <TableCell className="text-center">
                {producto.enPromocion && (
                  <Badge variant="destructive" className="gap-1">
                    <Tag className="h-3 w-3" />
                    Promoción
                  </Badge>
                )}
                {producto.popularidad > 50 && !producto.enPromocion && (
                  <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
                    <TrendingUp className="h-3 w-3" />
                    Popular
                  </Badge>
                )}
              </TableCell>

              {/* Toggle Disponibilidad */}
              <TableCell className="text-center">
                <Switch
                  checked={producto.disponible}
                  onCheckedChange={(checked) =>
                    onToggleDisponibilidad(producto.id, checked)
                  }
                />
              </TableCell>

              {/* Acciones */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Ver detalles"
                    onClick={() => onVerDetalle(producto)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar producto"
                    onClick={() => onEditar(producto)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar producto"
                    onClick={() => {
                      if (confirm('¿Estás seguro de eliminar este producto?')) {
                        onEliminar(producto.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
