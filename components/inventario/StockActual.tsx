'use client';

import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { suscribirStock, type IngredienteConEstado } from '@/lib/services/stock.service';

const ESTADO_CONFIG = {
  ok: { label: 'OK', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
  bajo: { label: 'Bajo', variant: 'secondary' as const, icon: AlertTriangle, color: 'text-amber-500' },
  sin_stock: { label: 'Sin stock', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' },
};

export function StockActual() {
  const [ingredientes, setIngredientes] = useState<IngredienteConEstado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'ok' | 'bajo' | 'sin_stock'>('todos');

  useEffect(() => {
    const unsub = suscribirStock((items) => {
      setIngredientes(items);
      setCargando(false);
    });
    return unsub;
  }, []);

  const filtrados = useMemo(() => {
    return ingredientes.filter((i) => {
      const matchBusqueda = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || i.estadoStock === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [ingredientes, busqueda, filtroEstado]);

  const resumen = useMemo(() => ({
    total: ingredientes.length,
    ok: ingredientes.filter((i) => i.estadoStock === 'ok').length,
    bajo: ingredientes.filter((i) => i.estadoStock === 'bajo').length,
    sinStock: ingredientes.filter((i) => i.estadoStock === 'sin_stock').length,
    valorTotal: ingredientes.reduce((acc, i) => acc + i.valorStock, 0),
  }), [ingredientes]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${filtroEstado === 'todos' ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
          onClick={() => setFiltroEstado('todos')}
        >
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total ingredientes</p>
            <p className="text-2xl font-bold">{resumen.total}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filtroEstado === 'ok' ? 'ring-2 ring-green-500' : 'hover:bg-accent'}`}
          onClick={() => setFiltroEstado('ok')}
        >
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">En orden</p>
            <p className="text-2xl font-bold text-green-600">{resumen.ok}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filtroEstado === 'bajo' ? 'ring-2 ring-amber-400' : 'hover:bg-accent'}`}
          onClick={() => setFiltroEstado('bajo')}
        >
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Stock bajo</p>
            <p className="text-2xl font-bold text-amber-500">{resumen.bajo}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${filtroEstado === 'sin_stock' ? 'ring-2 ring-destructive' : 'hover:bg-accent'}`}
          onClick={() => setFiltroEstado('sin_stock')}
        >
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Sin stock</p>
            <p className="text-2xl font-bold text-destructive">{resumen.sinStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* Valor total */}
      <p className="text-sm text-muted-foreground">
        Valor estimado del inventario:{' '}
        <span className="font-semibold text-foreground">
          ${resumen.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setBusqueda(''); setFiltroEstado('todos'); }}
          >
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
                  <TableRow key={ing.id} className={ing.estadoStock === 'sin_stock' ? 'bg-destructive/5' : ing.estadoStock === 'bajo' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="font-medium">{ing.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ing.categoria}</TableCell>
                    <TableCell className="text-right">
                      {ing.stockActual} <span className="text-xs text-muted-foreground">{ing.unidadMedida}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ing.stockMinimo} <span className="text-xs">{ing.unidadMedida}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${ing.valorStock.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
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
