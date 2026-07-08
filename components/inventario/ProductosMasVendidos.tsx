'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getTopVendidosUltimos7Dias,
  getTopVendidosUltimos30Dias,
  type ProductoVendido,
} from '@/lib/services/analisisVentas.service';

type Periodo = '7d' | '30d';

const MEDALLAS = ['🥇', '🥈', '🥉'];

export function ProductosMasVendidos() {
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [productos, setProductos] = useState<ProductoVendido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const fn = periodo === '7d' ? getTopVendidosUltimos7Dias : getTopVendidosUltimos30Dias;
    fn(10)
      .then(setProductos)
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, [periodo]);

  const maxVendido = productos[0]?.totalVendido ?? 1;

  return (
    <div className="space-y-4">
      {/* Periodo selector */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={periodo === '7d' ? 'default' : 'outline'}
          onClick={() => setPeriodo('7d')}
        >
          Últimos 7 días
        </Button>
        <Button
          size="sm"
          variant={periodo === '30d' ? 'default' : 'outline'}
          onClick={() => setPeriodo('30d')}
        >
          Últimos 30 días
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Calculando ranking…</p>
      ) : productos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <TrendingUp className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm">Sin datos de ventas para este periodo.</p>
          <p className="text-xs">Los datos se registran al confirmar pedidos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {productos.map((p, i) => {
            const porcentaje = Math.round((p.totalVendido / maxVendido) * 100);
            return (
              <div key={p.productoId} className="flex items-center gap-3">
                {/* Posición */}
                <span className="w-6 text-center text-sm font-medium text-muted-foreground flex-shrink-0">
                  {i < 3 ? MEDALLAS[i] : `${i + 1}.`}
                </span>

                {/* Nombre + barra */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{p.nombre}</span>
                    <span className="text-sm font-bold text-muted-foreground flex-shrink-0">
                      {p.totalVendido} uds.
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-primary/60'
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
