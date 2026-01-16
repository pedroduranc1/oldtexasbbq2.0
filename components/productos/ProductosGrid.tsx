/**
 * ProductosGrid Component
 * Old Texas BBQ - CRM
 *
 * Vista de cuadrícula responsive para productos
 */

'use client';

import { Producto } from '@/lib/types/firestore';
import ProductoCard from './ProductoCard';
import { EmptyState } from '@/components/ui/empty-state';

interface ProductosGridProps {
  productos: Producto[];
  onToggleDisponibilidad: (id: string, disponible: boolean) => void;
  onEliminar: (id: string) => void;
  onEditar: (producto: Producto) => void;
  onVerDetalle: (producto: Producto) => void;
}

export default function ProductosGrid({
  productos,
  onToggleDisponibilidad,
  onEliminar,
  onEditar,
  onVerDetalle,
}: ProductosGridProps) {
  if (productos.length === 0) {
    return (
      <EmptyState
        title="No hay productos"
        description="No se encontraron productos con los filtros seleccionados"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {productos.map((producto) => (
        <ProductoCard
          key={producto.id}
          producto={producto}
          onToggleDisponibilidad={onToggleDisponibilidad}
          onEliminar={onEliminar}
          onEditar={onEditar}
          onVerDetalle={onVerDetalle}
        />
      ))}
    </div>
  );
}
