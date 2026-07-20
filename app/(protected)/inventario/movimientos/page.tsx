'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw, Search, Download,
  AlertTriangle, Trash2, PackageCheck, SlidersHorizontal, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-card';
import { RegistroMovimientoInventario } from '@/components/inventario/RegistroMovimientoInventario';
import {
  getMovimientos,
  type MovimientoInventario,
  type TipoMovimientoInventario,
} from '@/lib/services/movimientosInventario.service';
import { fmtFechaHora, fmtPesosDecimal } from '@/lib/utils/formatters';

const TIPO_CONFIG: Record<TipoMovimientoInventario, { label: string; color: string; icon: React.ReactNode }> = {
  entrada:  { label: 'Entrada',  color: 'bg-green-100 text-green-800 border-green-300',  icon: <ArrowUpCircle className="h-3 w-3" /> },
  salida:   { label: 'Salida',   color: 'bg-blue-100 text-blue-800 border-blue-300',     icon: <ArrowDownCircle className="h-3 w-3" /> },
  merma:    { label: 'Merma',    color: 'bg-red-100 text-red-800 border-red-300',        icon: <Trash2 className="h-3 w-3" /> },
  venta:    { label: 'Venta',    color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <PackageCheck className="h-3 w-3" /> },
  ajuste:   { label: 'Ajuste',   color: 'bg-amber-100 text-amber-800 border-amber-300',  icon: <SlidersHorizontal className="h-3 w-3" /> },
};

const POR_PAGINA = 20;

export default function MovimientosInventarioPage() {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogEntrada, setDialogEntrada] = useState(false);
  const [dialogSalida, setDialogSalida] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMovimientoInventario>('todos');
  const [pagina, setPagina] = useState(1);
  const [fechaInicio, setFechaInicio] = useState(() => format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin]       = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await getMovimientos({
        limite: 1000,
        fechaInicio: startOfDay(new Date(fechaInicio + 'T00:00:00')),
        fechaFin:    endOfDay(new Date(fechaFin + 'T23:59:59')),
      });
      setMovimientos(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [fechaInicio, fechaFin]);

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
      const matchBusq = busqueda === '' ||
        m.ingredienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.motivo.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.usuarioNombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchTipo && matchBusq;
    });
  }, [movimientos, filtroTipo, busqueda]);

  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return filtrados.slice(inicio, inicio + POR_PAGINA);
  }, [filtrados, pagina]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);

  const resumen = useMemo(() => ({
    entradas: movimientos.filter((m) => m.tipo === 'entrada').length,
    salidas:  movimientos.filter((m) => m.tipo === 'salida').length,
    mermas:   movimientos.filter((m) => m.tipo === 'merma').length,
    costoTotal: movimientos.filter((m) => m.tipo === 'entrada').reduce((acc, m) => acc + (m.costoTotal ?? 0), 0),
  }), [movimientos]);

  const kpis: KpiItem[] = [
    { label: 'Entradas',    value: resumen.entradas,  icon: ArrowUpCircle,   color: 'green',  onClick: () => setFiltroTipo('entrada'), active: filtroTipo === 'entrada' },
    { label: 'Salidas',     value: resumen.salidas,   icon: ArrowDownCircle, color: 'blue',   onClick: () => setFiltroTipo('salida'),  active: filtroTipo === 'salida'  },
    { label: 'Mermas',      value: resumen.mermas,    icon: Trash2,          color: 'red',    onClick: () => setFiltroTipo('merma'),   active: filtroTipo === 'merma'   },
    { label: 'Costo total', value: fmtPesosDecimal(resumen.costoTotal), icon: PackageCheck, color: 'purple' },
  ];

  const exportarCSV = () => {
    const filas = [
      ['Fecha', 'Tipo', 'Ingrediente', 'Cantidad', 'Stock anterior', 'Stock nuevo', 'Costo unitario', 'Costo total', 'Motivo', 'Usuario', 'Proveedor'],
      ...filtrados.map((m) => [
        fmtFechaHora(m.fecha),
        m.tipo,
        m.ingredienteNombre,
        m.cantidad,
        m.stockAnterior,
        m.stockNuevo,
        m.costo_unitario ?? '',
        m.costoTotal ?? '',
        m.motivo,
        m.usuarioNombre,
        m.proveedorNombre ?? '',
      ]),
    ];
    const csv = filas.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos-inventario-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
          <p className="text-muted-foreground text-sm">Historial completo de entradas, salidas y mermas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setDialogSalida(true)}>
            <ArrowDownCircle className="h-4 w-4 mr-1" />
            Registrar salida
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setDialogEntrada(true)}>
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Registrar entrada
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <KpiGrid kpis={kpis} isLoading={cargando} />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Historial
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Rango de fechas */}
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0">Desde</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin}
                    onChange={(e) => { setFechaInicio(e.target.value); setPagina(1); }}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0">Hasta</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => { setFechaFin(e.target.value); setPagina(1); }}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="w-px h-5 bg-border" />
                {/* Búsqueda y tipo */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar…"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    className="pl-8 w-44 h-8 text-sm"
                  />
                </div>
                <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v as typeof filtroTipo); setPagina(1); }}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="salida">Salidas</SelectItem>
                    <SelectItem value="merma">Mermas</SelectItem>
                    <SelectItem value="venta">Ventas</SelectItem>
                    <SelectItem value="ajuste">Ajustes</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={cargar} disabled={cargando} className="h-8 w-8 p-0">
                  <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <p className="text-sm text-muted-foreground text-center py-12">Cargando movimientos…</p>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">Sin movimientos con los filtros actuales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Stock ant.</TableHead>
                    <TableHead className="text-right">Stock nuevo</TableHead>
                    <TableHead className="text-right">Costo total</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Proveedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginados.map((m) => {
                    const cfg = TIPO_CONFIG[m.tipo];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtFechaHora(m.fecha)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{m.ingredienteNombre}</TableCell>
                        <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">{m.stockAnterior}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{m.stockNuevo}</TableCell>
                        <TableCell className="text-right text-sm">
                          {m.costoTotal ? fmtPesosDecimal(m.costoTotal) : '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{m.motivo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.usuarioNombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.proveedorNombre ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>{filtrados.length} movimientos · página {pagina} de {totalPaginas}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RegistroMovimientoInventario modo="entrada" open={dialogEntrada} onClose={() => setDialogEntrada(false)} onSuccess={cargar} />
      <RegistroMovimientoInventario modo="salida"  open={dialogSalida}  onClose={() => setDialogSalida(false)}  onSuccess={cargar} />
    </div>
  );
}
