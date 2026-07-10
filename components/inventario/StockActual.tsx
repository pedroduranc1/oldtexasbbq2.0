'use client';

import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Search, Package2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { suscribirStock, type IngredienteConEstado } from '@/lib/services/stock.service';
import { fmtPesosDecimal } from '@/lib/utils/formatters';

type FiltroEstado = 'todos' | 'ok' | 'bajo' | 'sin_stock';

const ESTADO_CONFIG = {
  ok:        { label: 'OK',       variant: 'default'     as const, icon: CheckCircle, color: 'text-green-600' },
  bajo:      { label: 'Bajo',     variant: 'secondary'   as const, icon: AlertTriangle, color: 'text-amber-500' },
  sin_stock: { label: 'Sin stock',variant: 'destructive' as const, icon: XCircle,       color: 'text-destructive' },
};

export function StockActual() {
  const [ingredientes, setIngredientes] = useState<IngredienteConEstado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  useEffect(() => {
    const unsub = suscribirStock((items) => { setIngredientes(items); setCargando(false); });
    return unsub;
  }, []);

  const resumen = useMemo(() => ({
    total:      ingredientes.length,
    ok:         ingredientes.filter((i) => i.estadoStock === 'ok').length,
    bajo:       ingredientes.filter((i) => i.estadoStock === 'bajo').length,
    sinStock:   ingredientes.filter((i) => i.estadoStock === 'sin_stock').length,
    valorTotal: ingredientes.reduce((acc, i) => acc + i.valorStock, 0),
  }), [ingredientes]);

  const filtrados = useMemo(() =>
    ingredientes.filter((i) => {
      const matchBusqueda = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || i.estadoStock === filtroEstado;
      return matchBusqueda && matchEstado;
    }),
  [ingredientes, busqueda, filtroEstado]);

  const kpis: KpiItem[] = [
    { label: 'Total ingredientes', value: resumen.total,    icon: Package2,      color: 'default', onClick: () => setFiltroEstado('todos'),     active: filtroEstado === 'todos'     },
    { label: 'En orden',           value: resumen.ok,       icon: CheckCircle,   color: 'green',   onClick: () => setFiltroEstado('ok'),        active: filtroEstado === 'ok'        },
    { label: 'Stock bajo',         value: resumen.bajo,     icon: AlertTriangle, color: 'orange',  onClick: () => setFiltroEstado('bajo'),      active: filtroEstado === 'bajo'      },
    { label: 'Sin stock',          value: resumen.sinStock, icon: XCircle,       color: 'red',     onClick: () => setFiltroEstado('sin_stock'), active: filtroEstado === 'sin_stock' },
  ];

  return (
    <div className="space-y-4">
      <KpiGrid kpis={kpis} isLoading={cargando} />

      <p className="text-sm text-muted-foreground">
        Valor estimado del inventario:{' '}
        <span className="font-semibold text-foreground">{fmtPesosDecimal(resumen.valorTotal)}</span>
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
          />
        </div>
        {(busqueda || filtroEstado !== 'todos') && (
          <Button variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltroEstado('todos'); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando inventario…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Sin resultados.</p>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock actual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((ing) => {
                const cfg = ESTADO_CONFIG[ing.estadoStock];
                return (
                  <TableRow
                    key={ing.id}
                    className={
                      ing.estadoStock === 'sin_stock' ? 'bg-destructive/5'
                      : ing.estadoStock === 'bajo'    ? 'bg-amber-50/50 dark:bg-amber-950/20'
                      : ''
                    }
                  >
                    <TableCell className="font-medium">{ing.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ing.categoria}</TableCell>
                    <TableCell className="text-right">
                      {ing.stockActual} <span className="text-xs text-muted-foreground">{ing.unidadMedida}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ing.stockMinimo} <span className="text-xs">{ing.unidadMedida}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtPesosDecimal(ing.valorStock)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
