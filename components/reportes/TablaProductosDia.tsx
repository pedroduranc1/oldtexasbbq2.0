'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import type { Producto } from '@/lib/types/firestore';

interface Props {
  productos: Producto[];
  fecha: Date;
  isLoading?: boolean;
}

export function TablaProductosDia({ productos, fecha, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-72 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const fechaKey = format(fecha, 'yyyy-MM-dd');

  const ranked = productos
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      cantidad: p.cantidadVendidaPorDia?.[fechaKey] ?? 0,
      precio: p.precio,
    }))
    .filter((p) => p.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Productos Más Vendidos</h3>
        <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
          Sin ventas de productos para este día
        </div>
      </div>
    );
  }

  const maxCantidad = ranked[0]?.cantidad ?? 1;
  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-orange-600'];

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Productos Más Vendidos</h3>
        <Trophy className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="space-y-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className={`w-5 text-sm font-bold ${medalColors[i] ?? 'text-muted-foreground'}`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-medium text-foreground truncate">{p.nombre}</p>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-sm font-semibold text-foreground">{p.cantidad}</span>
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((p.cantidad / maxCantidad) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-border pt-3 flex justify-between text-sm">
        <span className="text-muted-foreground">Total unidades</span>
        <span className="font-bold text-foreground">
          {ranked.reduce((s, p) => s + p.cantidad, 0)}
        </span>
      </div>
    </div>
  );
}
